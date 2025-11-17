import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Design } from '../entities/design.entity';
import { Layer } from '../entities/layer.entity';
import { CanvasSettings } from '../entities/canvas-settings.entity';

export interface CachedDesignState {
  design: Partial<Design>;
  layers: Partial<Layer>[];
  canvasSettings?: Partial<CanvasSettings>;
  cachedAt: Date;
}

@Injectable()
export class DesignCacheService {
  private readonly DESIGN_TTL = 1800; // 30 minutes
  private readonly LAYER_TTL = 1800; // 30 minutes
  private readonly CANVAS_TTL = 3600; // 1 hour
  private readonly STATE_TTL = 1800; // 30 minutes

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  private getDesignKey(designId: string): string {
    return `design:${designId}:metadata`;
  }

  private getLayersKey(designId: string): string {
    return `design:${designId}:layers`;
  }

  private getCanvasKey(designId: string): string {
    return `design:${designId}:canvas`;
  }

  private getStateKey(designId: string): string {
    return `design:${designId}:state`;
  }

  /**
   * Cache design metadata
   */
  async cacheDesign(design: Design): Promise<void> {
    const key = this.getDesignKey(design.id);
    await this.redis.setex(
      key,
      this.DESIGN_TTL,
      JSON.stringify(design),
    );
  }

  /**
   * Get cached design metadata
   */
  async getDesign(designId: string): Promise<Design | null> {
    const key = this.getDesignKey(designId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as Design;
  }

  /**
   * Cache layers for a design
   */
  async cacheLayers(designId: string, layers: Layer[]): Promise<void> {
    const key = this.getLayersKey(designId);
    await this.redis.setex(
      key,
      this.LAYER_TTL,
      JSON.stringify(layers),
    );
  }

  /**
   * Get cached layers
   */
  async getLayers(designId: string): Promise<Layer[] | null> {
    const key = this.getLayersKey(designId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as Layer[];
  }

  /**
   * Cache canvas settings
   */
  async cacheCanvasSettings(designId: string, settings: CanvasSettings): Promise<void> {
    const key = this.getCanvasKey(designId);
    await this.redis.setex(
      key,
      this.CANVAS_TTL,
      JSON.stringify(settings),
    );
  }

  /**
   * Get cached canvas settings
   */
  async getCanvasSettings(designId: string): Promise<CanvasSettings | null> {
    const key = this.getCanvasKey(designId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CanvasSettings;
  }

  /**
   * Cache complete design state (design + layers + canvas)
   */
  async cacheDesignState(
    designId: string,
    state: CachedDesignState,
  ): Promise<void> {
    const key = this.getStateKey(designId);
    const cacheData = {
      ...state,
      cachedAt: new Date(),
    };

    await this.redis.setex(
      key,
      this.STATE_TTL,
      JSON.stringify(cacheData),
    );
  }

  /**
   * Get complete cached design state
   */
  async getDesignState(designId: string): Promise<CachedDesignState | null> {
    const key = this.getStateKey(designId);
    const cached = await this.redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as CachedDesignState;
  }

  /**
   * Invalidate all caches for a design
   */
  async invalidateDesign(designId: string): Promise<void> {
    const keys = [
      this.getDesignKey(designId),
      this.getLayersKey(designId),
      this.getCanvasKey(designId),
      this.getStateKey(designId),
    ];

    await this.redis.del(...keys);
  }

  /**
   * Invalidate layers cache only
   */
  async invalidateLayers(designId: string): Promise<void> {
    const keys = [
      this.getLayersKey(designId),
      this.getStateKey(designId), // Also invalidate state since it includes layers
    ];

    await this.redis.del(...keys);
  }

  /**
   * Invalidate canvas settings cache
   */
  async invalidateCanvas(designId: string): Promise<void> {
    const keys = [
      this.getCanvasKey(designId),
      this.getStateKey(designId),
    ];

    await this.redis.del(...keys);
  }

  /**
   * Update design cache TTL (extend expiration)
   */
  async extendDesignCache(designId: string): Promise<void> {
    const keys = [
      this.getDesignKey(designId),
      this.getLayersKey(designId),
      this.getCanvasKey(designId),
      this.getStateKey(designId),
    ];

    const pipeline = this.redis.pipeline();
    keys.forEach(key => {
      pipeline.expire(key, this.DESIGN_TTL);
    });

    await pipeline.exec();
  }

  /**
   * Cache warming: pre-populate cache for popular designs
   */
  async warmCache(
    designId: string,
    design: Design,
    layers: Layer[],
    canvasSettings?: CanvasSettings,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Cache design metadata
    pipeline.setex(
      this.getDesignKey(designId),
      this.DESIGN_TTL,
      JSON.stringify(design),
    );

    // Cache layers
    pipeline.setex(
      this.getLayersKey(designId),
      this.LAYER_TTL,
      JSON.stringify(layers),
    );

    // Cache canvas settings if provided
    if (canvasSettings) {
      pipeline.setex(
        this.getCanvasKey(designId),
        this.CANVAS_TTL,
        JSON.stringify(canvasSettings),
      );
    }

    // Cache complete state
    const state: CachedDesignState = {
      design,
      layers,
      canvasSettings,
      cachedAt: new Date(),
    };
    pipeline.setex(
      this.getStateKey(designId),
      this.STATE_TTL,
      JSON.stringify(state),
    );

    await pipeline.exec();
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(designId: string): Promise<{
    hasDesign: boolean;
    hasLayers: boolean;
    hasCanvas: boolean;
    hasState: boolean;
    ttls: Record<string, number>;
  }> {
    const keys = [
      this.getDesignKey(designId),
      this.getLayersKey(designId),
      this.getCanvasKey(designId),
      this.getStateKey(designId),
    ];

    const pipeline = this.redis.pipeline();
    keys.forEach(key => {
      pipeline.exists(key);
      pipeline.ttl(key);
    });

    const results = await pipeline.exec();

    if (!results) {
      return {
        hasDesign: false,
        hasLayers: false,
        hasCanvas: false,
        hasState: false,
        ttls: {},
      };
    }

    return {
      hasDesign: results[0]?.[1] === 1,
      hasLayers: results[2]?.[1] === 1,
      hasCanvas: results[4]?.[1] === 1,
      hasState: results[6]?.[1] === 1,
      ttls: {
        design: results[1]?.[1] as number,
        layers: results[3]?.[1] as number,
        canvas: results[5]?.[1] as number,
        state: results[7]?.[1] as number,
      },
    };
  }
}
