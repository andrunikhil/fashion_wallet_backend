# Infrastructure Specification: Caching & Queue Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Infrastructure Specification
**Status**: Draft
**Spec ID**: spec-infra-03

---

## 1. Executive Summary

This specification defines the caching and job queue infrastructure for the Fashion Wallet backend. It covers Redis-based caching strategies, job queue processing with Bull, pub/sub messaging, and background task management. The infrastructure must provide high performance, reliability, and scalability for async operations.

---

## 2. Infrastructure Architecture Overview

### 2.1 Components

```yaml
Redis (Primary):
  Purpose:
    - Application cache
    - Session storage
    - Rate limiting
    - Token blacklist
    - Pub/Sub messaging
    - Job queue backend

  Deployment:
    - Redis Cluster (production)
    - Redis Sentinel (high availability)
    - Single instance (development)

Bull Queue:
  Purpose:
    - Background job processing
    - Async task execution
    - Scheduled jobs
    - Job retry logic
    - Priority queues

  Use Cases:
    - Image processing
    - 3D model optimization
    - Email sending
    - Report generation
    - Data export

Pub/Sub:
  Purpose:
    - Real-time notifications
    - Event broadcasting
    - Service-to-service communication
    - Cache invalidation
    - WebSocket events
```

---

## 3. Redis Infrastructure

### 3.1 Redis Configuration

#### 3.1.1 Connection Setup

```typescript
interface RedisConfig {
  // Connection
  host: string;
  port: number;
  password?: string;
  db: number;                     // Database number (0-15)

  // Connection pool
  maxRetriesPerRequest: 3;
  enableReadyCheck: true;
  enableOfflineQueue: true;

  // Timeouts
  connectTimeout: 10000;          // 10 seconds
  commandTimeout: 5000;           // 5 seconds
  keepAlive: 30000;               // 30 seconds

  // TLS (production)
  tls?: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };

  // Retry strategy
  retryStrategy: (times: number) => number | void;

  // Sentinel (HA setup)
  sentinels?: Array<{
    host: string;
    port: number;
  }>;
  name?: string;                  // Sentinel master name

  // Cluster (scalability)
  cluster?: {
    nodes: Array<{
      host: string;
      port: number;
    }>;
    options: {
      redisOptions: RedisConfig;
      clusterRetryStrategy: (times: number) => number | void;
    };
  };
}

// Environment-specific configs
const redisConfigs = {
  development: {
    host: 'localhost',
    port: 6379,
    db: 0
  },

  staging: {
    sentinels: [
      { host: 'sentinel-1', port: 26379 },
      { host: 'sentinel-2', port: 26379 }
    ],
    name: 'mymaster',
    password: process.env.REDIS_PASSWORD
  },

  production: {
    cluster: {
      nodes: [
        { host: 'redis-node-1', port: 6379 },
        { host: 'redis-node-2', port: 6379 },
        { host: 'redis-node-3', port: 6379 }
      ]
    },
    password: process.env.REDIS_PASSWORD,
    tls: { rejectUnauthorized: true }
  }
};
```

#### 3.1.2 Database Allocation

```yaml
Database Allocation (0-15):
  db-0: Application cache (default)
  db-1: Session storage
  db-2: Rate limiting
  db-3: Token blacklist
  db-4: Job queues
  db-5: Pub/Sub channels
  db-6: Feature flags
  db-7: Analytics counters
  db-8: Temporary data
  db-9: Development/testing
  db-10-15: Reserved
```

### 3.2 Caching Strategy

#### 3.2.1 Cache Levels

```typescript
/**
 * Multi-tier caching strategy
 */
interface CacheStrategy {
  // L1: In-memory cache (application level)
  level1: {
    enabled: boolean;
    maxSize: number;              // 100 MB
    ttl: number;                  // 60 seconds
    strategy: 'LRU' | 'LFU';

    // Use node-cache or similar
    storage: 'memory';
  };

  // L2: Redis cache (distributed)
  level2: {
    enabled: boolean;
    ttl: number;                  // 3600 seconds (1 hour)
    storage: 'redis';

    // Cache key prefixes
    prefixes: {
      user: 'user:',
      avatar: 'avatar:',
      catalog: 'catalog:',
      design: 'design:'
    };
  };

  // L3: Database cache (query results)
  level3: {
    enabled: boolean;
    ttl: number;                  // 86400 seconds (24 hours)
    storage: 'database';
  };
}
```

#### 3.2.2 Cache Operations

```typescript
interface CacheService {
  /**
   * Get cached value
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cache value
   */
  set(params: {
    key: string;
    value: any;
    ttl?: number;                 // Seconds
    tags?: string[];              // For tag-based invalidation
  }): Promise<void>;

  /**
   * Delete cache value
   */
  delete(key: string): Promise<boolean>;

  /**
   * Check if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Increment counter
   */
  increment(key: string, by?: number): Promise<number>;

  /**
   * Decrement counter
   */
  decrement(key: string, by?: number): Promise<number>;

  /**
   * Set expiration
   */
  expire(key: string, seconds: number): Promise<boolean>;

  /**
   * Get remaining TTL
   */
  ttl(key: string): Promise<number>;

  /**
   * Get multiple keys
   */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple keys
   */
  mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void>;

  /**
   * Delete multiple keys
   */
  mdel(keys: string[]): Promise<number>;

  /**
   * Clear all cache (use sparingly)
   */
  flush(): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    keyCount: number;
    memoryUsed: number;
  }>;
}
```

#### 3.2.3 Cache Key Design

```typescript
/**
 * Structured cache key naming
 */
interface CacheKeyStrategy {
  // Format: prefix:resource:id:suffix
  // Example: user:profile:123:settings

  patterns: {
    userProfile: 'user:profile:{userId}',
    userSettings: 'user:settings:{userId}',

    avatarData: 'avatar:data:{avatarId}',
    avatarList: 'avatar:list:{userId}',

    catalogItem: 'catalog:item:{itemId}',
    catalogList: 'catalog:list:{category}:{page}',
    catalogSearch: 'catalog:search:{query}:{filters}',

    designData: 'design:data:{designId}',
    designList: 'design:list:{userId}:{status}',

    session: 'session:{sessionId}',
    token: 'token:blacklist:{tokenId}',
    rateLimit: 'ratelimit:{userId}:{endpoint}'
  };

  // Helper function
  buildKey(pattern: string, params: Record<string, string | number>): string {
    return pattern.replace(/{(\w+)}/g, (_, key) => String(params[key]));
  };
}
```

#### 3.2.4 Cache Invalidation

```typescript
interface CacheInvalidationService {
  /**
   * Invalidate by key
   */
  invalidateKey(key: string): Promise<void>;

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: string): Promise<number>;

  /**
   * Invalidate by tag
   */
  invalidateByTag(tag: string): Promise<number>;

  /**
   * Invalidate by resource
   */
  invalidateResource(params: {
    resource: 'user' | 'avatar' | 'catalog' | 'design';
    id: string;
  }): Promise<void>;

  /**
   * Scheduled invalidation
   */
  scheduleInvalidation(params: {
    key: string;
    at: Date;
  }): Promise<void>;
}

// Tag-based invalidation example
const tagStorage = {
  // Store tag -> keys mapping
  key: 'tags:{tagName}',
  value: Set<string>,             // Set of cache keys

  // When invalidating by tag:
  // 1. Get all keys from tag set
  // 2. Delete all keys
  // 3. Delete tag set
};
```

### 3.3 Redis Data Structures

#### 3.3.1 Strings (Simple cache)

```typescript
interface StringOperations {
  // Set string value
  set(key: string, value: string, ex?: number): Promise<void>;

  // Get string value
  get(key: string): Promise<string | null>;

  // Set if not exists
  setnx(key: string, value: string): Promise<boolean>;

  // Increment/Decrement
  incr(key: string): Promise<number>;
  incrby(key: string, increment: number): Promise<number>;
  decr(key: string): Promise<number>;
  decrby(key: string, decrement: number): Promise<number>;
}

// Use cases:
// - Simple cache values
// - Counters (views, likes, downloads)
// - Rate limiting
// - Distributed locks
```

#### 3.3.2 Hashes (Object cache)

```typescript
interface HashOperations {
  // Set hash field
  hset(key: string, field: string, value: string): Promise<number>;

  // Get hash field
  hget(key: string, field: string): Promise<string | null>;

  // Get all fields
  hgetall(key: string): Promise<Record<string, string>>;

  // Set multiple fields
  hmset(key: string, obj: Record<string, string>): Promise<void>;

  // Get multiple fields
  hmget(key: string, fields: string[]): Promise<(string | null)[]>;

  // Delete field
  hdel(key: string, field: string): Promise<number>;

  // Check field exists
  hexists(key: string, field: string): Promise<boolean>;

  // Increment field value
  hincrby(key: string, field: string, increment: number): Promise<number>;
}

// Use cases:
// - User profiles
// - Object caching
// - Configuration storage
// - Analytics aggregation
```

#### 3.3.3 Lists (Queues, feeds)

```typescript
interface ListOperations {
  // Push to list
  lpush(key: string, ...values: string[]): Promise<number>;
  rpush(key: string, ...values: string[]): Promise<number>;

  // Pop from list
  lpop(key: string): Promise<string | null>;
  rpop(key: string): Promise<string | null>;

  // Blocking pop
  blpop(key: string, timeout: number): Promise<[string, string] | null>;
  brpop(key: string, timeout: number): Promise<[string, string] | null>;

  // Get range
  lrange(key: string, start: number, stop: number): Promise<string[]>;

  // List length
  llen(key: string): Promise<number>;

  // Trim list
  ltrim(key: string, start: number, stop: number): Promise<void>;
}

// Use cases:
// - Activity feeds
// - Job queues
// - Recent items
// - Notifications
```

#### 3.3.4 Sets (Unique collections)

```typescript
interface SetOperations {
  // Add members
  sadd(key: string, ...members: string[]): Promise<number>;

  // Remove members
  srem(key: string, ...members: string[]): Promise<number>;

  // Get all members
  smembers(key: string): Promise<string[]>;

  // Check membership
  sismember(key: string, member: string): Promise<boolean>;

  // Set operations
  sunion(...keys: string[]): Promise<string[]>;
  sinter(...keys: string[]): Promise<string[]>;
  sdiff(...keys: string[]): Promise<string[]>;

  // Random member
  srandmember(key: string, count?: number): Promise<string | string[]>;

  // Pop random member
  spop(key: string, count?: number): Promise<string | string[]>;

  // Set size
  scard(key: string): Promise<number>;
}

// Use cases:
// - Tags
// - Unique visitors
// - Followers/Following
// - Online users
```

#### 3.3.5 Sorted Sets (Rankings, leaderboards)

```typescript
interface SortedSetOperations {
  // Add member with score
  zadd(key: string, score: number, member: string): Promise<number>;

  // Remove member
  zrem(key: string, member: string): Promise<number>;

  // Get range by rank
  zrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;
  zrevrange(key: string, start: number, stop: number, withScores?: boolean): Promise<string[]>;

  // Get range by score
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;

  // Get member score
  zscore(key: string, member: string): Promise<number | null>;

  // Get member rank
  zrank(key: string, member: string): Promise<number | null>;
  zrevrank(key: string, member: string): Promise<number | null>;

  // Increment score
  zincrby(key: string, increment: number, member: string): Promise<number>;

  // Set size
  zcard(key: string): Promise<number>;
}

// Use cases:
// - Leaderboards
// - Trending content
// - Priority queues
// - Time-series data
```

---

## 4. Job Queue Infrastructure

### 4.1 Bull Queue Configuration

#### 4.1.1 Queue Setup

```typescript
interface QueueConfig {
  // Redis connection
  redis: RedisConfig;

  // Queue options
  options: {
    prefix: string;               // 'bull' (default)
    defaultJobOptions: {
      attempts: 3;
      backoff: {
        type: 'exponential';
        delay: 1000;              // Start with 1 second
      };
      removeOnComplete: 100;      // Keep last 100 completed
      removeOnFail: 1000;         // Keep last 1000 failed
      timeout: 60000;             // 60 seconds
    };
  };

  // Processing options
  processing: {
    concurrency: 5;               // Concurrent jobs per worker
    limiter: {
      max: 100;                   // Max jobs per duration
      duration: 1000;             // Duration in ms
    };
  };

  // Advanced settings
  settings: {
    lockDuration: 30000;          // Lock renewal interval
    lockRenewTime: 15000;         // Lock renew time
    stalledInterval: 30000;       // Check for stalled jobs
    maxStalledCount: 2;           // Max stall count before failure
  };
}
```

#### 4.1.2 Queue Definitions

```typescript
/**
 * Define different queues for different job types
 */
enum QueueName {
  EMAIL = 'email',
  IMAGE_PROCESSING = 'image-processing',
  MODEL_PROCESSING = 'model-processing',
  EXPORT = 'export',
  ANALYTICS = 'analytics',
  NOTIFICATIONS = 'notifications',
  CLEANUP = 'cleanup'
}

interface QueueDefinition {
  name: QueueName;
  concurrency: number;
  priority?: boolean;             // Enable priority levels
  rateLimit?: {
    max: number;
    duration: number;
  };
}

const queueDefinitions: QueueDefinition[] = [
  {
    name: QueueName.EMAIL,
    concurrency: 10,
    rateLimit: { max: 100, duration: 60000 }
  },
  {
    name: QueueName.IMAGE_PROCESSING,
    concurrency: 5,
    priority: true
  },
  {
    name: QueueName.MODEL_PROCESSING,
    concurrency: 2                // Resource intensive
  },
  {
    name: QueueName.EXPORT,
    concurrency: 3,
    priority: true
  },
  {
    name: QueueName.ANALYTICS,
    concurrency: 5
  },
  {
    name: QueueName.NOTIFICATIONS,
    concurrency: 10
  },
  {
    name: QueueName.CLEANUP,
    concurrency: 1
  }
];
```

### 4.2 Job Types

#### 4.2.1 Job Interface

```typescript
interface Job<T = any> {
  id: string | number;
  name: string;
  data: T;
  opts: JobOptions;

  // Progress tracking
  progress(progress: number | object): Promise<void>;

  // Logging
  log(message: string): Promise<void>;

  // State
  getState(): Promise<JobState>;

  // Retry
  retry(): Promise<void>;

  // Remove
  remove(): Promise<void>;

  // Update
  update(data: Partial<T>): Promise<void>;
}

interface JobOptions {
  priority?: number;              // 1 (highest) to MAX_INT (lowest)
  delay?: number;                 // Delay in ms
  attempts?: number;              // Retry attempts
  backoff?: number | BackoffOptions;
  lifo?: boolean;                 // Last in first out
  timeout?: number;               // Job timeout
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  stackTraceLimit?: number;

  // Job ID (for deduplication)
  jobId?: string;

  // Repeatable jobs
  repeat?: {
    cron?: string;                // Cron expression
    every?: number;               // Interval in ms
    limit?: number;               // Max repetitions
    startDate?: Date;
    endDate?: Date;
  };
}

type JobState =
  | 'completed'
  | 'waiting'
  | 'active'
  | 'delayed'
  | 'failed'
  | 'paused';
```

#### 4.2.2 Job Data Types

```typescript
// Email job
interface EmailJobData {
  to: string | string[];
  from?: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
  }>;
}

// Image processing job
interface ImageProcessingJobData {
  fileId: string;
  operations: Array<{
    type: 'resize' | 'convert' | 'compress' | 'thumbnail';
    params: Record<string, any>;
  }>;
  outputBucket: string;
  outputKey: string;
}

// 3D model processing job
interface ModelProcessingJobData {
  fileId: string;
  modelPath: string;
  operations: Array<{
    type: 'optimize' | 'convert' | 'thumbnail';
    params: Record<string, any>;
  }>;
  outputBucket: string;
  outputKey: string;
}

// Export job
interface ExportJobData {
  userId: string;
  designId: string;
  format: 'png' | 'jpeg' | 'mp4' | 'gltf' | 'pdf';
  options: {
    resolution?: string;
    quality?: number;
    duration?: number;
  };
}

// Analytics job
interface AnalyticsJobData {
  eventType: string;
  userId?: string;
  metadata: Record<string, any>;
  timestamp: Date;
}
```

### 4.3 Queue Service

```typescript
interface QueueService {
  /**
   * Add job to queue
   */
  addJob<T>(params: {
    queue: QueueName;
    name: string;
    data: T;
    options?: JobOptions;
  }): Promise<Job<T>>;

  /**
   * Add bulk jobs
   */
  addBulk<T>(params: {
    queue: QueueName;
    jobs: Array<{
      name: string;
      data: T;
      options?: JobOptions;
    }>;
  }): Promise<Job<T>[]>;

  /**
   * Get job by ID
   */
  getJob(queue: QueueName, jobId: string): Promise<Job | null>;

  /**
   * Get jobs by state
   */
  getJobs(params: {
    queue: QueueName;
    state: JobState | JobState[];
    start?: number;
    end?: number;
  }): Promise<Job[]>;

  /**
   * Remove job
   */
  removeJob(queue: QueueName, jobId: string): Promise<void>;

  /**
   * Retry job
   */
  retryJob(queue: QueueName, jobId: string): Promise<void>;

  /**
   * Pause queue
   */
  pauseQueue(queue: QueueName): Promise<void>;

  /**
   * Resume queue
   */
  resumeQueue(queue: QueueName): Promise<void>;

  /**
   * Empty queue
   */
  emptyQueue(queue: QueueName): Promise<void>;

  /**
   * Clean queue
   */
  cleanQueue(params: {
    queue: QueueName;
    grace: number;                // Time in ms
    status: JobState;
  }): Promise<number>;

  /**
   * Get queue metrics
   */
  getQueueMetrics(queue: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }>;
}
```

### 4.4 Job Processors

```typescript
/**
 * Job processor interface
 */
interface JobProcessor<T = any> {
  process(job: Job<T>): Promise<any>;
}

// Example: Email processor
class EmailProcessor implements JobProcessor<EmailJobData> {
  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template, context } = job.data;

    // Log start
    await job.log(`Sending email to ${to}`);

    // Progress 0%
    await job.progress(0);

    try {
      // Render template
      const html = await this.renderTemplate(template, context);
      await job.progress(30);

      // Send email
      await this.emailService.send({
        to,
        subject,
        html
      });
      await job.progress(100);

      // Log success
      await job.log('Email sent successfully');

    } catch (error) {
      await job.log(`Error: ${error.message}`);
      throw error;                // Will trigger retry
    }
  }
}

// Example: Image processing processor
class ImageProcessingProcessor implements JobProcessor<ImageProcessingJobData> {
  async process(job: Job<ImageProcessingJobData>): Promise<void> {
    const { fileId, operations, outputBucket, outputKey } = job.data;

    let buffer = await this.storageService.downloadFile(fileId);
    await job.progress(10);

    // Process each operation
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      buffer = await this.imageService.processImage(
        buffer,
        operation.type,
        operation.params
      );

      const progress = 10 + ((i + 1) / operations.length) * 80;
      await job.progress(progress);
    }

    // Upload result
    await this.storageService.uploadFile({
      bucket: outputBucket,
      key: outputKey,
      body: buffer
    });
    await job.progress(100);
  }
}
```

### 4.5 Job Events

```typescript
/**
 * Queue events for monitoring
 */
interface QueueEvents {
  // Job lifecycle events
  'job:added': (jobId: string) => void;
  'job:waiting': (jobId: string) => void;
  'job:active': (job: Job, previousState: string) => void;
  'job:progress': (job: Job, progress: number | object) => void;
  'job:completed': (job: Job, result: any) => void;
  'job:failed': (job: Job, error: Error) => void;
  'job:stalled': (jobId: string) => void;
  'job:removed': (job: Job) => void;

  // Queue events
  'queue:paused': () => void;
  'queue:resumed': () => void;
  'queue:cleaned': (jobs: string[], type: string) => void;
  'queue:error': (error: Error) => void;

  // Worker events
  'worker:active': (job: Job) => void;
  'worker:completed': (job: Job, result: any) => void;
  'worker:failed': (job: Job, error: Error) => void;
  'worker:error': (error: Error) => void;
}

// Event listener example
queue.on('job:failed', async (job, error) => {
  logger.error(`Job ${job.id} failed`, {
    jobName: job.name,
    error: error.message,
    data: job.data,
    attemptsMade: job.attemptsMade
  });

  // Send alert if critical job
  if (job.opts.priority === 1) {
    await this.alertService.sendAlert({
      type: 'job_failure',
      severity: 'high',
      message: `Critical job failed: ${job.name}`,
      details: { jobId: job.id, error: error.message }
    });
  }
});
```

### 4.6 Scheduled Jobs

```typescript
/**
 * Cron-based recurring jobs
 */
interface ScheduledJobService {
  /**
   * Add repeatable job
   */
  addRepeatable(params: {
    queue: QueueName;
    name: string;
    data: any;
    cron: string;                 // Cron expression
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      timezone?: string;
    };
  }): Promise<void>;

  /**
   * Remove repeatable job
   */
  removeRepeatable(params: {
    queue: QueueName;
    name: string;
    cron: string;
  }): Promise<void>;

  /**
   * Get repeatable jobs
   */
  getRepeatableJobs(queue: QueueName): Promise<Array<{
    key: string;
    name: string;
    cron: string;
    next: Date;
    endDate?: Date;
  }>>;
}

// Common scheduled jobs
const scheduledJobs = [
  {
    name: 'cleanup-temp-files',
    queue: QueueName.CLEANUP,
    cron: '0 2 * * *',            // Every day at 2 AM
    data: { type: 'temp_files' }
  },
  {
    name: 'generate-analytics-report',
    queue: QueueName.ANALYTICS,
    cron: '0 0 * * 0',            // Every Sunday at midnight
    data: { type: 'weekly_report' }
  },
  {
    name: 'refresh-catalog-cache',
    queue: QueueName.CLEANUP,
    cron: '*/30 * * * *',         // Every 30 minutes
    data: { type: 'catalog_cache' }
  },
  {
    name: 'expire-sessions',
    queue: QueueName.CLEANUP,
    cron: '0 * * * *',            // Every hour
    data: { type: 'sessions' }
  }
];
```

---

## 5. Pub/Sub Infrastructure

### 5.1 Pub/Sub Configuration

```typescript
interface PubSubConfig {
  redis: RedisConfig;

  // Channel naming
  channelPrefix: string;          // 'fashionwallet'

  // Message serialization
  serializer: 'json' | 'msgpack';

  // Error handling
  retryOnError: boolean;
  maxRetries: number;
}
```

### 5.2 Channel Definitions

```typescript
/**
 * Pub/Sub channels
 */
enum Channel {
  // User events
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',

  // Avatar events
  AVATAR_CREATED = 'avatar:created',
  AVATAR_UPDATED = 'avatar:updated',
  AVATAR_PROCESSING = 'avatar:processing',
  AVATAR_READY = 'avatar:ready',

  // Design events
  DESIGN_CREATED = 'design:created',
  DESIGN_UPDATED = 'design:updated',
  DESIGN_PUBLISHED = 'design:published',
  DESIGN_DELETED = 'design:deleted',

  // Catalog events
  CATALOG_UPDATED = 'catalog:updated',
  CATALOG_ITEM_ADDED = 'catalog:item:added',

  // Cache events
  CACHE_INVALIDATE = 'cache:invalidate',

  // System events
  SYSTEM_ALERT = 'system:alert',
  SYSTEM_MAINTENANCE = 'system:maintenance'
}
```

### 5.3 Pub/Sub Service

```typescript
interface PubSubService {
  /**
   * Publish message to channel
   */
  publish<T>(params: {
    channel: Channel | string;
    message: T;
    metadata?: {
      userId?: string;
      timestamp?: Date;
      correlationId?: string;
    };
  }): Promise<number>;            // Number of subscribers

  /**
   * Subscribe to channel
   */
  subscribe(params: {
    channel: Channel | string;
    handler: (message: any, metadata?: any) => Promise<void> | void;
  }): Promise<void>;

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel: Channel | string): Promise<void>;

  /**
   * Pattern subscribe (wildcard)
   */
  psubscribe(params: {
    pattern: string;              // e.g., 'user:*'
    handler: (channel: string, message: any) => Promise<void> | void;
  }): Promise<void>;

  /**
   * Get active subscriptions
   */
  getSubscriptions(): Promise<string[]>;

  /**
   * Count channel subscribers
   */
  countSubscribers(channel: Channel | string): Promise<number>;
}

// Example usage
await pubSubService.publish({
  channel: Channel.DESIGN_CREATED,
  message: {
    designId: '123',
    userId: '456',
    name: 'Summer Dress'
  },
  metadata: {
    userId: '456',
    timestamp: new Date(),
    correlationId: 'abc-123'
  }
});

await pubSubService.subscribe({
  channel: Channel.DESIGN_CREATED,
  handler: async (message) => {
    // Send notification
    await notificationService.sendNotification({
      userId: message.userId,
      type: 'design_created',
      data: message
    });

    // Update analytics
    await analyticsService.track({
      event: 'design_created',
      userId: message.userId,
      properties: message
    });
  }
});
```

---

## 6. Monitoring and Management

### 6.1 Queue Monitoring

```typescript
interface QueueMonitoringService {
  /**
   * Get queue health
   */
  getQueueHealth(queue: QueueName): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      activeJobs: number;
      waitingJobs: number;
      completedJobs: number;
      failedJobs: number;
      delayedJobs: number;
      throughput: number;         // Jobs per minute
      avgProcessingTime: number;  // Milliseconds
      errorRate: number;          // Percentage
    };
    alerts: string[];
  }>;

  /**
   * Get job statistics
   */
  getJobStats(params: {
    queue: QueueName;
    timeRange: 'hour' | 'day' | 'week';
  }): Promise<{
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  }>;

  /**
   * Get slow jobs
   */
  getSlowJobs(params: {
    queue: QueueName;
    threshold: number;            // Milliseconds
    limit?: number;
  }): Promise<Array<{
    jobId: string;
    name: string;
    duration: number;
    timestamp: Date;
  }>>;

  /**
   * Get failed jobs with details
   */
  getFailedJobs(params: {
    queue: QueueName;
    limit?: number;
    since?: Date;
  }): Promise<Array<{
    jobId: string;
    name: string;
    error: string;
    stackTrace: string;
    data: any;
    failedAt: Date;
    attemptsMade: number;
  }>>;
}
```

### 6.2 Redis Monitoring

```typescript
interface RedisMonitoringService {
  /**
   * Get Redis info
   */
  getInfo(): Promise<{
    version: string;
    uptime: number;
    connectedClients: number;
    usedMemory: number;
    maxMemory: number;
    memoryFragmentation: number;
    totalCommandsProcessed: number;
    opsPerSecond: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    hitRate: number;
  }>;

  /**
   * Get memory usage by database
   */
  getMemoryUsage(): Promise<Array<{
    db: number;
    keys: number;
    expires: number;
    avgTTL: number;
    memoryUsage: number;
  }>>;

  /**
   * Get slow queries
   */
  getSlowQueries(limit?: number): Promise<Array<{
    id: number;
    timestamp: Date;
    duration: number;
    command: string;
    args: string[];
  }>>;

  /**
   * Analyze key patterns
   */
  analyzeKeys(pattern?: string): Promise<{
    totalKeys: number;
    patterns: Array<{
      pattern: string;
      count: number;
      sampleKeys: string[];
      avgSize: number;
    }>;
  }>;
}
```

---

## 7. Implementation Requirements

### 7.1 Module Structure

```typescript
@Module({
  imports: [
    BullModule.forRoot({
      redis: redisConfig
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.IMAGE_PROCESSING },
      { name: QueueName.MODEL_PROCESSING },
      { name: QueueName.EXPORT },
      { name: QueueName.ANALYTICS },
      { name: QueueName.NOTIFICATIONS },
      { name: QueueName.CLEANUP }
    )
  ],
  providers: [
    CacheService,
    QueueService,
    PubSubService,
    EmailProcessor,
    ImageProcessingProcessor,
    ModelProcessingProcessor,
    ExportProcessor,
    AnalyticsProcessor,
    NotificationProcessor,
    CleanupProcessor
  ],
  exports: [
    CacheService,
    QueueService,
    PubSubService
  ]
})
export class CacheQueueModule {}
```

---

## 8. Testing Requirements

```yaml
Unit Tests:
  - Cache operations (get, set, delete)
  - Job creation and processing
  - Pub/Sub message handling
  - Key generation and patterns
  - TTL management

Integration Tests:
  - Redis connectivity
  - Queue job lifecycle
  - Pub/Sub delivery
  - Cache invalidation
  - Scheduled jobs

Performance Tests:
  - Cache hit rate
  - Queue throughput
  - Pub/Sub latency
  - Concurrent job processing
  - Memory usage under load
```

---

## 9. Success Criteria

```yaml
Acceptance Criteria:
  - Cache hit rate > 90%
  - Job processing success rate > 99%
  - Queue throughput > 1000 jobs/minute
  - Pub/Sub message delivery < 10ms
  - Redis memory usage optimized
  - Failed jobs properly retried
  - Monitoring dashboards operational
  - Alerts configured for issues
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-infra-00 (Database)

---

**End of Caching & Queue Infrastructure Specification**
