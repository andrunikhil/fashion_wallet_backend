import { Controller, Get } from '@nestjs/common';
import { CatalogMetricsService } from '../services/metrics.service';
import { CatalogCacheService } from '../services/catalog-cache.service';
import { MaterializedViewsService } from '../services/materialized-views.service';

/**
 * Controller for exposing metrics and health endpoints
 */
@Controller('catalog/metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: CatalogMetricsService,
    private readonly cacheService: CatalogCacheService,
    private readonly viewsService: MaterializedViewsService,
  ) {}

  /**
   * Prometheus metrics endpoint
   * GET /catalog/metrics
   */
  @Get()
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  /**
   * Get metrics in JSON format
   * GET /catalog/metrics/json
   */
  @Get('json')
  async getMetricsJSON(): Promise<any> {
    return this.metricsService.getMetricsJSON();
  }

  /**
   * Get cache statistics
   * GET /catalog/metrics/cache
   */
  @Get('cache')
  async getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get cache health
   * GET /catalog/metrics/cache/health
   */
  @Get('cache/health')
  async getCacheHealth() {
    return this.cacheService.healthCheck();
  }

  /**
   * Get materialized views health
   * GET /catalog/metrics/views/health
   */
  @Get('views/health')
  async getViewsHealth() {
    return this.viewsService.getViewsHealth();
  }

  /**
   * Overall health check
   * GET /catalog/metrics/health
   */
  @Get('health')
  async getHealth() {
    const cacheHealth = await this.cacheService.healthCheck();
    const viewsHealth = await this.viewsService.getViewsHealth();
    const cacheStats = this.cacheService.getStats();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: {
        health: cacheHealth,
        stats: cacheStats,
      },
      materializedViews: viewsHealth,
    };
  }
}
