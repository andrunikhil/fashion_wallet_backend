import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';

/**
 * Rendering Service
 * Manages server-side rendering of designs
 * - Queues render jobs
 * - Manages render cache
 * - Handles different render presets
 */
@Injectable()
export class RenderingService {
  private readonly logger = new Logger(RenderingService.name);

  // Redis key prefixes
  private readonly RENDER_CACHE_PREFIX = 'render:cache:';
  private readonly RENDER_JOB_PREFIX = 'render:job:';

  // Cache TTL (30 days)
  private readonly CACHE_TTL = 30 * 24 * 60 * 60;

  // Render presets
  private readonly RENDER_PRESETS = {
    thumbnail: {
      width: 512,
      height: 512,
      quality: 'medium',
    },
    preview: {
      width: 1024,
      height: 1024,
      quality: 'high',
    },
    highres: {
      width: 4096,
      height: 4096,
      quality: 'ultra',
    },
  };

  constructor(
    @InjectQueue('render')
    private readonly renderQueue: Queue,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
  ) {}

  /**
   * Render a design
   * Checks cache first, queues job if not cached
   */
  async renderDesign(
    designId: string,
    preset: 'thumbnail' | 'preview' | 'highres' = 'preview',
    options?: {
      width?: number;
      height?: number;
      format?: 'png' | 'jpeg' | 'webp';
      background?: string;
    },
  ): Promise<{
    cached: boolean;
    url?: string;
    jobId?: string;
    estimatedTime?: number;
  }> {
    try {
      // Get render configuration
      const config = {
        ...this.RENDER_PRESETS[preset],
        ...options,
      };

      // Calculate render hash for caching
      const renderHash = this.calculateRenderHash(designId, config);

      // Check cache first
      const cachedUrl = await this.getCachedRender(renderHash);
      if (cachedUrl) {
        this.logger.log(`Cache hit for design ${designId} with preset ${preset}`);
        return {
          cached: true,
          url: cachedUrl,
        };
      }

      this.logger.log(`Cache miss for design ${designId} with preset ${preset}, queuing render job`);

      // Queue render job
      const job = await this.queueRenderJob(designId, config, renderHash);

      // Estimate render time based on complexity
      const estimatedTime = await this.estimateRenderTime(designId, config);

      return {
        cached: false,
        jobId: job.id as string,
        estimatedTime,
      };
    } catch (error) {
      this.logger.error(`Error rendering design ${designId}:`, error);
      throw error;
    }
  }

  /**
   * Queue a render job
   */
  private async queueRenderJob(
    designId: string,
    config: any,
    renderHash: string,
  ): Promise<any> {
    try {
      // Get design data
      const design = await this.designRepo.findByIdWithLayers(designId);
      if (!design) {
        throw new Error(`Design ${designId} not found`);
      }

      const layers = await this.layerRepo.findByDesignId(designId);
      const canvasSettings = await this.canvasSettingsRepo.findByDesignId(designId);

      // Create job data
      const jobData = {
        designId,
        design: {
          id: design.id,
          name: design.name,
          avatarId: design.avatarId,
        },
        layers: layers.map(layer => ({
          id: layer.id,
          type: layer.type,
          orderIndex: layer.orderIndex,
          catalogItemId: layer.catalogItemId,
          catalogItemType: layer.catalogItemType,
          transform: layer.transform,
          customization: layer.customization,
          isVisible: layer.isVisible,
          blendMode: layer.blendMode,
          opacity: layer.opacity,
        })),
        canvasSettings: canvasSettings || {},
        config,
        renderHash,
        queuedAt: new Date().toISOString(),
      };

      // Determine priority based on user tier (TODO: get from user)
      const priority = this.calculateJobPriority('free');

      // Add to queue
      const job = await this.renderQueue.add('render-design', jobData, {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      });

      this.logger.log(`Queued render job ${job.id} for design ${designId}`);

      return job;
    } catch (error) {
      this.logger.error(`Error queuing render job:`, error);
      throw error;
    }
  }

  /**
   * Get render job status
   */
  async getRenderJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed';
    progress?: number;
    result?: any;
    error?: string;
  }> {
    try {
      const job = await this.renderQueue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      const progress = job.progress;

      if (state === 'completed') {
        return {
          status: 'completed',
          result: job.returnvalue,
        };
      }

      if (state === 'failed') {
        return {
          status: 'failed',
          error: job.failedReason,
        };
      }

      return {
        status: state as any,
        progress: progress as number,
      };
    } catch (error) {
      this.logger.error(`Error getting job status:`, error);
      throw error;
    }
  }

  /**
   * Cancel a render job
   */
  async cancelRenderJob(jobId: string): Promise<void> {
    try {
      const job = await this.renderQueue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(`Cancelled render job ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Error cancelling job:`, error);
      throw error;
    }
  }

  /**
   * Cache a rendered image
   */
  async cacheRender(renderHash: string, url: string): Promise<void> {
    try {
      const cacheKey = `${this.RENDER_CACHE_PREFIX}${renderHash}`;
      await this.redis.setex(cacheKey, this.CACHE_TTL, url);

      this.logger.log(`Cached render with hash ${renderHash}`);
    } catch (error) {
      this.logger.error(`Error caching render:`, error);
    }
  }

  /**
   * Get cached render URL
   */
  private async getCachedRender(renderHash: string): Promise<string | null> {
    try {
      const cacheKey = `${this.RENDER_CACHE_PREFIX}${renderHash}`;
      return await this.redis.get(cacheKey);
    } catch (error) {
      this.logger.error(`Error getting cached render:`, error);
      return null;
    }
  }

  /**
   * Invalidate render cache for a design
   */
  async invalidateDesignRenderCache(designId: string): Promise<void> {
    try {
      const pattern = `${this.RENDER_CACHE_PREFIX}${designId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Invalidated ${keys.length} cached renders for design ${designId}`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating render cache:`, error);
    }
  }

  /**
   * Calculate render hash for caching
   */
  private calculateRenderHash(designId: string, config: any): string {
    const hashData = JSON.stringify({
      designId,
      config,
    });

    return crypto
      .createHash('md5')
      .update(hashData)
      .digest('hex');
  }

  /**
   * Calculate job priority based on user tier
   */
  private calculateJobPriority(tier: string): number {
    const priorities = {
      free: 10,
      basic: 5,
      premium: 2,
      enterprise: 1,
    };

    return priorities[tier] || 10;
  }

  /**
   * Estimate render time based on complexity
   */
  private async estimateRenderTime(designId: string, config: any): Promise<number> {
    try {
      // Get layer count
      const layers = await this.layerRepo.findByDesignId(designId);
      const layerCount = layers.length;

      // Base time (seconds)
      let estimatedTime = 5;

      // Add time for each layer
      estimatedTime += layerCount * 2;

      // Add time for higher resolution
      if (config.width > 2048) {
        estimatedTime *= 2;
      }

      // Add time for high quality
      if (config.quality === 'ultra') {
        estimatedTime *= 1.5;
      }

      return Math.ceil(estimatedTime);
    } catch (error) {
      this.logger.error(`Error estimating render time:`, error);
      return 30; // Default estimate
    }
  }

  /**
   * Get render queue statistics
   */
  async getRenderQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.renderQueue.getWaitingCount(),
        this.renderQueue.getActiveCount(),
        this.renderQueue.getCompletedCount(),
        this.renderQueue.getFailedCount(),
      ]);

      return { waiting, active, completed, failed };
    } catch (error) {
      this.logger.error(`Error getting queue stats:`, error);
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
  }

  /**
   * Warm cache for popular designs
   */
  async warmCache(designIds: string[]): Promise<void> {
    this.logger.log(`Warming cache for ${designIds.length} designs`);

    const promises = designIds.map(designId =>
      this.renderDesign(designId, 'preview').catch(error => {
        this.logger.error(`Error warming cache for design ${designId}:`, error);
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Get cache hit rate
   */
  async getCacheHitRate(): Promise<number> {
    try {
      // Get all render cache keys
      const pattern = `${this.RENDER_CACHE_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      // This is a simplified metric
      // In production, you'd track hits/misses over time
      return keys.length;
    } catch (error) {
      this.logger.error(`Error getting cache hit rate:`, error);
      return 0;
    }
  }
}
