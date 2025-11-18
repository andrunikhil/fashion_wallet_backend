import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { CatalogItem } from '../entities';
import { CatalogItemRepository } from '../repositories';

/**
 * Multi-layer caching service for catalog items
 * L1: In-memory LRU cache (fastest, limited size)
 * L2: Redis cache (fast, distributed)
 * L3: Database (slowest, source of truth)
 */
@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);
  private readonly l1Cache: LRUCache<string, any>;
  private readonly redisClient: Redis;

  // Cache TTLs (in seconds)
  private readonly itemTTL: number;
  private readonly listTTL: number;
  private readonly searchTTL: number;
  private readonly recommendationTTL: number;

  // Cache statistics
  private stats = {
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    l3: { hits: 0, misses: 0 },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly catalogItemRepository: CatalogItemRepository,
  ) {
    // Initialize L1 cache (in-memory LRU)
    const maxL1Items = this.configService.get<number>('cache.max', 1000);
    this.l1Cache = new LRUCache({
      max: maxL1Items,
      ttl: 1000 * 60 * 5, // 5 minutes in milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    // Initialize L2 cache (Redis)
    const redisConfig = this.configService.get('redis');
    this.redisClient = new Redis(redisConfig);

    // Load cache TTL configuration
    const cacheConfig = this.configService.get('catalog.cache');
    this.itemTTL = cacheConfig?.itemTTL || 3600;
    this.listTTL = cacheConfig?.listTTL || 900;
    this.searchTTL = cacheConfig?.searchTTL || 900;
    this.recommendationTTL = cacheConfig?.recommendationTTL || 1800;

    this.logger.log(
      `Cache initialized: L1=${maxL1Items} items, L2=Redis, L3=Database`,
    );
  }

  /**
   * Get a catalog item by ID with multi-layer caching
   */
  async getCatalogItem(itemId: string): Promise<CatalogItem | null> {
    const cacheKey = `item:${itemId}`;

    // L1: Check in-memory cache
    const l1Result = this.l1Cache.get(cacheKey);
    if (l1Result) {
      this.stats.l1.hits++;
      this.logger.debug(`L1 cache HIT for ${cacheKey}`);
      return l1Result;
    }
    this.stats.l1.misses++;

    // L2: Check Redis cache
    try {
      const l2Result = await this.redisClient.get(cacheKey);
      if (l2Result) {
        this.stats.l2.hits++;
        this.logger.debug(`L2 cache HIT for ${cacheKey}`);
        const item = JSON.parse(l2Result);
        // Populate L1 cache
        this.l1Cache.set(cacheKey, item);
        return item;
      }
      this.stats.l2.misses++;
    } catch (error) {
      this.logger.error(`L2 cache error: ${error.message}`, error.stack);
    }

    // L3: Fetch from database
    try {
      const item = await this.catalogItemRepository.findById(itemId);
      if (item) {
        this.stats.l3.hits++;
        this.logger.debug(`L3 cache HIT for ${cacheKey}`);
        // Populate both L1 and L2 caches
        await this.setCatalogItem(itemId, item);
        return item;
      }
      this.stats.l3.misses++;
      return null;
    } catch (error) {
      this.logger.error(`Database fetch error: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Set a catalog item in all cache layers
   */
  async setCatalogItem(itemId: string, item: CatalogItem): Promise<void> {
    const cacheKey = `item:${itemId}`;

    // Set in L1 cache
    this.l1Cache.set(cacheKey, item);

    // Set in L2 cache (Redis)
    try {
      await this.redisClient.setex(
        cacheKey,
        this.itemTTL,
        JSON.stringify(item),
      );
      this.logger.debug(`Cached item ${itemId} in L1 and L2`);
    } catch (error) {
      this.logger.error(`Failed to cache item in L2: ${error.message}`);
    }
  }

  /**
   * Get cached data with custom key
   */
  async get<T>(key: string, ttl?: number): Promise<T | null> {
    // L1: Check in-memory cache
    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      this.stats.l1.hits++;
      return l1Result as T;
    }
    this.stats.l1.misses++;

    // L2: Check Redis cache
    try {
      const l2Result = await this.redisClient.get(key);
      if (l2Result) {
        this.stats.l2.hits++;
        const data = JSON.parse(l2Result);
        this.l1Cache.set(key, data);
        return data;
      }
      this.stats.l2.misses++;
    } catch (error) {
      this.logger.error(`L2 cache error: ${error.message}`);
    }

    return null;
  }

  /**
   * Set cached data with custom key
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTTL = ttl || this.itemTTL;

    // Set in L1 cache
    this.l1Cache.set(key, value);

    // Set in L2 cache
    try {
      await this.redisClient.setex(key, cacheTTL, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Failed to set cache in L2: ${error.message}`);
    }
  }

  /**
   * Invalidate cache for a specific item
   */
  async invalidateItem(itemId: string): Promise<void> {
    const cacheKey = `item:${itemId}`;

    // Delete from L1
    this.l1Cache.delete(cacheKey);

    // Delete from L2
    try {
      await this.redisClient.del(cacheKey);
      this.logger.debug(`Invalidated cache for ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate L2 cache: ${error.message}`);
    }
  }

  /**
   * Invalidate cache with pattern (L2 only, L1 will expire naturally)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.debug(`Invalidated ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern: ${error.message}`);
    }
  }

  /**
   * Invalidate all catalog-related caches
   */
  async invalidateAll(): Promise<void> {
    // Clear L1 cache
    this.l1Cache.clear();

    // Clear L2 cache (all keys with catalog prefix)
    try {
      const keys = await this.redisClient.keys('catalog:*');
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        this.logger.log(`Invalidated all cache (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate all caches: ${error.message}`);
    }
  }

  /**
   * Warm up cache with popular items
   */
  async warmCache(itemIds: string[]): Promise<void> {
    this.logger.log(`Warming cache with ${itemIds.length} items`);

    const promises = itemIds.map(async (itemId) => {
      try {
        // This will populate all cache layers
        await this.getCatalogItem(itemId);
      } catch (error) {
        this.logger.error(
          `Failed to warm cache for item ${itemId}: ${error.message}`,
        );
      }
    });

    await Promise.all(promises);
    this.logger.log(`Cache warming completed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const l1Size = this.l1Cache.size;
    const l1HitRate =
      this.stats.l1.hits + this.stats.l1.misses > 0
        ? (this.stats.l1.hits / (this.stats.l1.hits + this.stats.l1.misses)) *
          100
        : 0;
    const l2HitRate =
      this.stats.l2.hits + this.stats.l2.misses > 0
        ? (this.stats.l2.hits / (this.stats.l2.hits + this.stats.l2.misses)) *
          100
        : 0;
    const l3HitRate =
      this.stats.l3.hits + this.stats.l3.misses > 0
        ? (this.stats.l3.hits / (this.stats.l3.hits + this.stats.l3.misses)) *
          100
        : 0;

    return {
      l1: {
        size: l1Size,
        hits: this.stats.l1.hits,
        misses: this.stats.l1.misses,
        hitRate: l1HitRate.toFixed(2) + '%',
      },
      l2: {
        hits: this.stats.l2.hits,
        misses: this.stats.l2.misses,
        hitRate: l2HitRate.toFixed(2) + '%',
      },
      l3: {
        hits: this.stats.l3.hits,
        misses: this.stats.l3.misses,
        hitRate: l3HitRate.toFixed(2) + '%',
      },
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      l1: { hits: 0, misses: 0 },
      l2: { hits: 0, misses: 0 },
      l3: { hits: 0, misses: 0 },
    };
    this.logger.log('Cache statistics reset');
  }

  /**
   * Health check for cache layers
   */
  async healthCheck(): Promise<{
    l1: boolean;
    l2: boolean;
    l3: boolean;
  }> {
    const health = {
      l1: true, // L1 is always available (in-memory)
      l2: false,
      l3: false,
    };

    // Check L2 (Redis)
    try {
      await this.redisClient.ping();
      health.l2 = true;
    } catch (error) {
      this.logger.error(`L2 health check failed: ${error.message}`);
    }

    // Check L3 (Database)
    try {
      await this.catalogItemRepository.count();
      health.l3 = true;
    } catch (error) {
      this.logger.error(`L3 health check failed: ${error.message}`);
    }

    return health;
  }
}
