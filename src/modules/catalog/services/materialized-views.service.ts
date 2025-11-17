import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Service for managing catalog materialized views
 * Handles scheduled refresh of views for performance optimization
 */
@Injectable()
export class MaterializedViewsService {
  private readonly logger = new Logger(MaterializedViewsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Refresh all materialized views
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async refreshAllViews(): Promise<void> {
    this.logger.log('Starting materialized views refresh');

    try {
      const startTime = Date.now();

      // Use the database function to refresh all views concurrently
      await this.dataSource.query(
        'SELECT catalog.refresh_materialized_views()',
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Materialized views refreshed successfully in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh materialized views: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh popular items view
   */
  async refreshPopularItems(): Promise<void> {
    this.logger.log('Refreshing popular items view');

    try {
      const startTime = Date.now();
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.popular_items',
      );
      const duration = Date.now() - startTime;
      this.logger.log(`Popular items view refreshed in ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh popular items view: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh daily stats view
   */
  async refreshDailyStats(): Promise<void> {
    this.logger.log('Refreshing daily stats view');

    try {
      const startTime = Date.now();
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.daily_item_stats',
      );
      const duration = Date.now() - startTime;
      this.logger.log(`Daily stats view refreshed in ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh daily stats view: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refresh trending items view
   * Runs every 15 minutes for more up-to-date trending data
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshTrendingItems(): Promise<void> {
    this.logger.log('Refreshing trending items view');

    try {
      const startTime = Date.now();
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY catalog.trending_items',
      );
      const duration = Date.now() - startTime;
      this.logger.log(`Trending items view refreshed in ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `Failed to refresh trending items view: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get popular items from materialized view
   */
  async getPopularItems(limit: number = 50, category?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM catalog.popular_items';
      const params: any[] = [];

      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' ORDER BY popularity_score DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const items = await this.dataSource.query(query, params);
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to get popular items: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get trending items from materialized view
   */
  async getTrendingItems(limit: number = 50, category?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM catalog.trending_items';
      const params: any[] = [];

      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' ORDER BY trend_score DESC LIMIT $' + (params.length + 1);
      params.push(limit);

      const items = await this.dataSource.query(query, params);
      return items;
    } catch (error) {
      this.logger.error(
        `Failed to get trending items: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get daily statistics for an item
   */
  async getItemDailyStats(
    itemId: string,
    days: number = 30,
  ): Promise<any[]> {
    try {
      const stats = await this.dataSource.query(
        `
        SELECT *
        FROM catalog.daily_item_stats
        WHERE item_id = $1
        ORDER BY date DESC
        LIMIT $2
      `,
        [itemId, days],
      );
      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to get item daily stats: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Get view statistics and health
   */
  async getViewsHealth(): Promise<{
    popularItems: number;
    dailyStats: number;
    trendingItems: number;
    lastRefresh: Date;
  }> {
    try {
      const popularCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM catalog.popular_items',
      );

      const dailyCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM catalog.daily_item_stats',
      );

      const trendingCount = await this.dataSource.query(
        'SELECT COUNT(*) as count FROM catalog.trending_items',
      );

      return {
        popularItems: parseInt(popularCount[0]?.count || 0),
        dailyStats: parseInt(dailyCount[0]?.count || 0),
        trendingItems: parseInt(trendingCount[0]?.count || 0),
        lastRefresh: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get views health: ${error.message}`,
        error.stack,
      );
      return {
        popularItems: 0,
        dailyStats: 0,
        trendingItems: 0,
        lastRefresh: new Date(),
      };
    }
  }
}
