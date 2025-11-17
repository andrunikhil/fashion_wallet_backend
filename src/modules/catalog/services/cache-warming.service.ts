import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogCacheService } from './catalog-cache.service';
import { CatalogItem, ItemAnalytics } from '../entities';

/**
 * Service for cache warming and invalidation strategies
 * Automatically warms cache with popular items on schedule
 */
@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly cacheService: CatalogCacheService,
    @InjectRepository(CatalogItem)
    private readonly catalogItemRepository: Repository<CatalogItem>,
    @InjectRepository(ItemAnalytics)
    private readonly analyticsRepository: Repository<ItemAnalytics>,
  ) {}

  /**
   * Warm cache with popular items
   * Runs every 6 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async warmPopularItems(): Promise<void> {
    this.logger.log('Starting cache warming for popular items');

    try {
      // Get top 100 most viewed items from last 7 days
      const popularItems = await this.analyticsRepository
        .createQueryBuilder('analytics')
        .select('analytics.itemId')
        .addSelect('SUM(analytics.viewCount)', 'totalViews')
        .where('analytics.date >= :weekAgo', {
          weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        })
        .groupBy('analytics.itemId')
        .orderBy('totalViews', 'DESC')
        .limit(100)
        .getRawMany();

      const itemIds = popularItems.map((item) => item.itemId);

      if (itemIds.length > 0) {
        await this.cacheService.warmCache(itemIds);
        this.logger.log(`Warmed cache with ${itemIds.length} popular items`);
      } else {
        this.logger.warn('No popular items found to warm cache');
      }
    } catch (error) {
      this.logger.error(`Cache warming failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Warm cache with recently added items
   * Runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async warmRecentItems(): Promise<void> {
    this.logger.log('Starting cache warming for recent items');

    try {
      // Get items added in the last 24 hours
      const recentItems = await this.catalogItemRepository.find({
        where: {
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        take: 50,
        order: { createdAt: 'DESC' },
      });

      const itemIds = recentItems.map((item) => item.id);

      if (itemIds.length > 0) {
        await this.cacheService.warmCache(itemIds);
        this.logger.log(`Warmed cache with ${itemIds.length} recent items`);
      }
    } catch (error) {
      this.logger.error(
        `Recent items cache warming failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Warm cache with featured/promoted items
   */
  async warmFeaturedItems(): Promise<void> {
    this.logger.log('Starting cache warming for featured items');

    try {
      const featuredItems = await this.catalogItemRepository.find({
        where: { isActive: true },
        take: 30,
        order: { createdAt: 'DESC' },
      });

      const itemIds = featuredItems.map((item) => item.id);

      if (itemIds.length > 0) {
        await this.cacheService.warmCache(itemIds);
        this.logger.log(`Warmed cache with ${itemIds.length} featured items`);
      }
    } catch (error) {
      this.logger.error(
        `Featured items cache warming failed: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Manual cache warming with specific item IDs
   */
  async warmSpecificItems(itemIds: string[]): Promise<void> {
    this.logger.log(`Manually warming cache with ${itemIds.length} items`);
    await this.cacheService.warmCache(itemIds);
  }

  /**
   * Invalidate cache for updated items
   */
  async invalidateUpdatedItems(itemIds: string[]): Promise<void> {
    this.logger.log(`Invalidating cache for ${itemIds.length} updated items`);

    const promises = itemIds.map((itemId) =>
      this.cacheService.invalidateItem(itemId),
    );

    await Promise.all(promises);
  }

  /**
   * Invalidate cache for deleted items
   */
  async invalidateDeletedItems(itemIds: string[]): Promise<void> {
    this.logger.log(`Invalidating cache for ${itemIds.length} deleted items`);

    const promises = itemIds.map((itemId) =>
      this.cacheService.invalidateItem(itemId),
    );

    await Promise.all(promises);
  }

  /**
   * Invalidate all search-related caches
   */
  async invalidateSearchCaches(): Promise<void> {
    this.logger.log('Invalidating all search caches');
    await this.cacheService.invalidatePattern('catalog:search:*');
  }

  /**
   * Invalidate all recommendation caches
   */
  async invalidateRecommendationCaches(): Promise<void> {
    this.logger.log('Invalidating all recommendation caches');
    await this.cacheService.invalidatePattern('catalog:recommendation:*');
  }

  /**
   * Get cache warming status
   */
  async getWarmingStatus(): Promise<{
    lastWarmingTime: Date;
    cacheStats: any;
    health: any;
  }> {
    const stats = this.cacheService.getStats();
    const health = await this.cacheService.healthCheck();

    return {
      lastWarmingTime: new Date(),
      cacheStats: stats,
      health,
    };
  }
}
