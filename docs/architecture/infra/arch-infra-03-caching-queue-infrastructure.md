# Architecture Document: Caching & Queue Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-infra-03
**Related Spec**: spec-infra-03

---

## 1. Executive Summary

This architecture document describes the implementation of caching and job queue infrastructure using Redis and Bull for the Fashion Wallet backend, covering caching strategies, background job processing, and pub/sub messaging.

---

## 2. Architectural Overview

### 2.1 Component Layers

```
┌─────────────────────────────────────────────────────────┐
│              Application Layer                          │
│    (Services consuming cache and queues)                │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┴─────────────────┐
    │                                  │
┌───▼──────────────┐      ┌───────────▼──────────┐
│  Cache Service   │      │   Queue Service      │
│  - Get/Set       │      │   - Add Job          │
│  - Invalidate    │      │   - Process Job      │
│  - TTL Mgmt      │      │   - Schedule Job     │
└────────┬─────────┘      └───────────┬──────────┘
         │                            │
    ┌────▼──────────────────────────┬─▼──────┐
    │                               │        │
┌───▼───────┐  ┌──────────────┐  ┌─▼────────▼─┐
│  Redis    │  │   Redis      │  │   Redis    │
│  Cache DB │  │  Session DB  │  │  Queue DB  │
│  (db-0)   │  │   (db-1)     │  │   (db-4)   │
└───────────┘  └──────────────┘  └────────────┘
```

---

## 3. Module Structure

```
src/infrastructure/cache-queue/
├── cache-queue.module.ts
├── cache/
│   ├── cache.service.ts
│   ├── cache.config.ts
│   ├── strategies/
│   │   ├── redis.strategy.ts
│   │   └── memory.strategy.ts
│   └── invalidation/
│       └── cache-invalidation.service.ts
├── queue/
│   ├── queue.service.ts
│   ├── queue.config.ts
│   ├── processors/
│   │   ├── email.processor.ts
│   │   ├── image.processor.ts
│   │   ├── model.processor.ts
│   │   └── export.processor.ts
│   └── schedulers/
│       └── job.scheduler.ts
├── pubsub/
│   ├── pubsub.service.ts
│   └── handlers/
│       ├── cache-invalidation.handler.ts
│       └── notification.handler.ts
└── interfaces/
    ├── cache.interface.ts
    ├── queue.interface.ts
    └── pubsub.interface.ts
```

---

## 4. Cache Implementation

### 4.1 Cache Service

```typescript
@Injectable()
export class CacheService implements ICacheService {
  private client: Redis;

  constructor(
    @Inject('REDIS_CONFIG') private config: RedisConfig
  ) {
    this.client = new Redis({
      ...config,
      db: 0, // Cache database
      keyPrefix: 'cache:' // Automatic prefix
    });
  }

  /**
   * Get cached value with type safety
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch from source
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<boolean> {
    const result = await this.client.del(key);
    return result > 0;
  }

  /**
   * Delete keys by pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;

    return this.client.del(...keys);
  }

  /**
   * Increment counter
   */
  async increment(key: string, by: number = 1): Promise<number> {
    return this.client.incrby(key, by);
  }

  /**
   * Set expiration
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /**
   * Get TTL
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
```

### 4.2 Caching Patterns

```typescript
/**
 * Decorator for automatic caching
 */
export function Cacheable(options: {
  keyPrefix: string;
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;

      // Generate cache key
      const key = options.keyGenerator
        ? `${options.keyPrefix}:${options.keyGenerator(...args)}`
        : `${options.keyPrefix}:${JSON.stringify(args)}`;

      // Try cache
      const cached = await cacheService.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheService.set(key, result, options.ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Usage example
 */
@Injectable()
export class UserService {
  constructor(private cacheService: CacheService) {}

  @Cacheable({
    keyPrefix: 'user:profile',
    ttl: 3600,
    keyGenerator: (userId: string) => userId
  })
  async getUserProfile(userId: string): Promise<UserProfile> {
    return this.userRepository.findById(userId);
  }
}
```

---

## 5. Queue Implementation

### 5.1 Queue Service

```typescript
@Injectable()
export class QueueService {
  private queues: Map<QueueName, Queue> = new Map();

  constructor(
    @Inject('REDIS_CONFIG') private redisConfig: RedisConfig,
    private emailProcessor: EmailProcessor,
    private imageProcessor: ImageProcessor,
    private modelProcessor: ModelProcessor,
    private exportProcessor: ExportProcessor
  ) {
    this.initializeQueues();
  }

  /**
   * Initialize all queues
   */
  private initializeQueues(): void {
    const queueConfig = {
      redis: this.redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    };

    // Email queue
    this.queues.set(
      QueueName.EMAIL,
      new Queue(QueueName.EMAIL, queueConfig)
    );

    // Image processing queue
    this.queues.set(
      QueueName.IMAGE_PROCESSING,
      new Queue(QueueName.IMAGE_PROCESSING, queueConfig)
    );

    // Model processing queue
    this.queues.set(
      QueueName.MODEL_PROCESSING,
      new Queue(QueueName.MODEL_PROCESSING, queueConfig)
    );

    // Export queue
    this.queues.set(
      QueueName.EXPORT,
      new Queue(QueueName.EXPORT, queueConfig)
    );

    this.setupProcessors();
  }

  /**
   * Setup job processors
   */
  private setupProcessors(): void {
    this.queues.get(QueueName.EMAIL)!.process(
      5, // Concurrency
      async (job) => this.emailProcessor.process(job)
    );

    this.queues.get(QueueName.IMAGE_PROCESSING)!.process(
      3,
      async (job) => this.imageProcessor.process(job)
    );

    this.queues.get(QueueName.MODEL_PROCESSING)!.process(
      2,
      async (job) => this.modelProcessor.process(job)
    );

    this.queues.get(QueueName.EXPORT)!.process(
      3,
      async (job) => this.exportProcessor.process(job)
    );
  }

  /**
   * Add job to queue
   */
  async addJob<T>(params: {
    queue: QueueName;
    name: string;
    data: T;
    options?: JobOptions;
  }): Promise<Job<T>> {
    const queue = this.queues.get(params.queue);
    if (!queue) {
      throw new Error(`Queue ${params.queue} not found`);
    }

    return queue.add(params.name, params.data, params.options);
  }

  /**
   * Add scheduled/recurring job
   */
  async addScheduledJob<T>(params: {
    queue: QueueName;
    name: string;
    data: T;
    cron: string;
    options?: JobOptions;
  }): Promise<Job<T>> {
    return this.addJob({
      queue: params.queue,
      name: params.name,
      data: params.data,
      options: {
        ...params.options,
        repeat: {
          cron: params.cron
        }
      }
    });
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: QueueName): Promise<QueueMetrics> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  }
}
```

### 5.2 Job Processors

```typescript
/**
 * Image processing job processor
 */
@Processor(QueueName.IMAGE_PROCESSING)
export class ImageProcessor {
  constructor(
    private imageService: ImageProcessingService,
    private storageService: StorageService,
    private logger: Logger
  ) {}

  @Process()
  async process(job: Job<ImageProcessingJobData>): Promise<void> {
    const { fileId, operations, outputBucket, outputKey } = job.data;

    this.logger.info(`Processing image job ${job.id}`, {
      fileId,
      operations: operations.length
    });

    try {
      // Update progress
      await job.progress(0);

      // Download file
      const buffer = await this.storageService.downloadFile(fileId);
      await job.progress(10);

      // Process image operations
      let processedBuffer = buffer;
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];

        processedBuffer = await this.imageService.applyOperation(
          processedBuffer,
          operation
        );

        const progress = 10 + ((i + 1) / operations.length) * 80;
        await job.progress(progress);
      }

      // Upload result
      await this.storageService.uploadBuffer({
        bucket: outputBucket,
        key: outputKey,
        buffer: processedBuffer
      });
      await job.progress(100);

      this.logger.info(`Image processing completed for job ${job.id}`);
    } catch (error) {
      this.logger.error(`Image processing failed for job ${job.id}`, error);
      throw error; // Will trigger retry
    }
  }

  /**
   * Job completed handler
   */
  @OnQueueCompleted()
  async onCompleted(job: Job, result: any): Promise<void> {
    this.logger.info(`Job ${job.id} completed`, { result });
  }

  /**
   * Job failed handler
   */
  @OnQueueFailed()
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(`Job ${job.id} failed`, error, {
      attempts: job.attemptsMade,
      data: job.data
    });

    // Send alert for critical jobs
    if (job.opts.priority === 1) {
      await this.alertService.sendAlert({
        type: 'job_failure',
        severity: 'high',
        message: `Critical job ${job.id} failed`,
        details: { error: error.message }
      });
    }
  }
}
```

---

## 6. Pub/Sub Implementation

### 6.1 Pub/Sub Service

```typescript
@Injectable()
export class PubSubService {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<Channel, Function[]> = new Map();

  constructor(@Inject('REDIS_CONFIG') private config: RedisConfig) {
    this.publisher = new Redis({ ...config, db: 5 });
    this.subscriber = new Redis({ ...config, db: 5 });

    this.setupSubscriber();
  }

  /**
   * Setup subscriber to handle messages
   */
  private setupSubscriber(): void {
    this.subscriber.on('message', (channel, message) => {
      const handlers = this.handlers.get(channel as Channel);
      if (handlers) {
        const parsedMessage = JSON.parse(message);
        handlers.forEach(handler => handler(parsedMessage));
      }
    });
  }

  /**
   * Publish message to channel
   */
  async publish<T>(params: {
    channel: Channel;
    message: T;
    metadata?: MessageMetadata;
  }): Promise<number> {
    const payload = {
      message: params.message,
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString(),
        publishedBy: 'fashion-wallet-api'
      }
    };

    const subscriberCount = await this.publisher.publish(
      params.channel,
      JSON.stringify(payload)
    );

    return subscriberCount;
  }

  /**
   * Subscribe to channel
   */
  async subscribe(params: {
    channel: Channel;
    handler: (message: any, metadata?: any) => void | Promise<void>;
  }): Promise<void> {
    // Add handler
    const handlers = this.handlers.get(params.channel) || [];
    handlers.push(params.handler);
    this.handlers.set(params.channel, handlers);

    // Subscribe to channel
    await this.subscriber.subscribe(params.channel);
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: Channel): Promise<void> {
    this.handlers.delete(channel);
    await this.subscriber.unsubscribe(channel);
  }
}
```

### 6.2 Event Handlers

```typescript
/**
 * Cache invalidation handler
 */
@Injectable()
export class CacheInvalidationHandler {
  constructor(
    private cacheService: CacheService,
    private pubsubService: PubSubService
  ) {
    this.setupSubscriptions();
  }

  private async setupSubscriptions(): Promise<void> {
    // Subscribe to cache invalidation events
    await this.pubsubService.subscribe({
      channel: Channel.CACHE_INVALIDATE,
      handler: async (message) => {
        await this.handleCacheInvalidation(message);
      }
    });
  }

  private async handleCacheInvalidation(message: {
    pattern?: string;
    keys?: string[];
    tag?: string;
  }): Promise<void> {
    if (message.pattern) {
      await this.cacheService.deletePattern(message.pattern);
    } else if (message.keys) {
      for (const key of message.keys) {
        await this.cacheService.delete(key);
      }
    } else if (message.tag) {
      await this.invalidateByTag(message.tag);
    }
  }

  /**
   * Publish cache invalidation event
   */
  async publishInvalidation(params: {
    pattern?: string;
    keys?: string[];
    tag?: string;
  }): Promise<void> {
    await this.pubsubService.publish({
      channel: Channel.CACHE_INVALIDATE,
      message: params
    });
  }
}
```

---

## 7. Monitoring

### 7.1 Metrics Collection

```typescript
@Injectable()
export class CacheQueueMetricsService {
  constructor(
    private cacheService: CacheService,
    private queueService: QueueService
  ) {}

  /**
   * Collect Redis metrics
   */
  async getRedisMetrics(): Promise<RedisMetrics> {
    const info = await this.cacheService.client.info();
    const parsedInfo = this.parseRedisInfo(info);

    return {
      version: parsedInfo.redis_version,
      uptime: parsedInfo.uptime_in_seconds,
      connectedClients: parsedInfo.connected_clients,
      usedMemory: parsedInfo.used_memory,
      usedMemoryHuman: parsedInfo.used_memory_human,
      totalCommandsProcessed: parsedInfo.total_commands_processed,
      keyspaceHits: parsedInfo.keyspace_hits,
      keyspaceMisses: parsedInfo.keyspace_misses,
      hitRate: this.calculateHitRate(
        parsedInfo.keyspace_hits,
        parsedInfo.keyspace_misses
      )
    };
  }

  /**
   * Collect queue metrics
   */
  async getQueueMetrics(): Promise<Record<string, QueueMetrics>> {
    const metrics: Record<string, QueueMetrics> = {};

    for (const queueName of Object.values(QueueName)) {
      metrics[queueName] = await this.queueService.getQueueMetrics(
        queueName as QueueName
      );
    }

    return metrics;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    if (total === 0) return 0;
    return (hits / total) * 100;
  }
}
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: arch-infra-00

---

**End of Caching & Queue Infrastructure Architecture Document**
