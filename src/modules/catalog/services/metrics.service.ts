import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, register } from 'prom-client';

/**
 * Prometheus metrics service for catalog module
 * Collects and exposes performance metrics
 */
@Injectable()
export class CatalogMetricsService {
  private readonly logger = new Logger(CatalogMetricsService.name);
  private readonly registry: Registry;

  // HTTP metrics
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestTotal: Counter;
  private readonly httpRequestErrors: Counter;

  // Cache metrics
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly cacheSize: Gauge;

  // Search metrics
  private readonly searchDuration: Histogram;
  private readonly searchTotal: Counter;
  private readonly searchResults: Histogram;

  // Recommendation metrics
  private readonly recommendationDuration: Histogram;
  private readonly recommendationTotal: Counter;

  // Database metrics
  private readonly dbQueryDuration: Histogram;
  private readonly dbQueryTotal: Counter;
  private readonly dbQueryErrors: Counter;

  // Business metrics
  private readonly itemViews: Counter;
  private readonly itemFavorites: Counter;
  private readonly itemShares: Counter;
  private readonly activeCatalogItems: Gauge;

  constructor() {
    // Use default registry or create new one
    this.registry = register;

    // Initialize HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'catalog_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'catalog_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'catalog_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Initialize cache metrics
    this.cacheHits = new Counter({
      name: 'catalog_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['layer', 'cache_type'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'catalog_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['layer', 'cache_type'],
      registers: [this.registry],
    });

    this.cacheSize = new Gauge({
      name: 'catalog_cache_size',
      help: 'Current size of cache',
      labelNames: ['layer'],
      registers: [this.registry],
    });

    // Initialize search metrics
    this.searchDuration = new Histogram({
      name: 'catalog_search_duration_seconds',
      help: 'Duration of search operations in seconds',
      labelNames: ['search_type'],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.searchTotal = new Counter({
      name: 'catalog_searches_total',
      help: 'Total number of search operations',
      labelNames: ['search_type'],
      registers: [this.registry],
    });

    this.searchResults = new Histogram({
      name: 'catalog_search_results_count',
      help: 'Number of results returned by searches',
      labelNames: ['search_type'],
      buckets: [0, 1, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry],
    });

    // Initialize recommendation metrics
    this.recommendationDuration = new Histogram({
      name: 'catalog_recommendation_duration_seconds',
      help: 'Duration of recommendation operations in seconds',
      labelNames: ['recommendation_type'],
      buckets: [0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.recommendationTotal = new Counter({
      name: 'catalog_recommendations_total',
      help: 'Total number of recommendation requests',
      labelNames: ['recommendation_type'],
      registers: [this.registry],
    });

    // Initialize database metrics
    this.dbQueryDuration = new Histogram({
      name: 'catalog_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'entity'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    this.dbQueryTotal = new Counter({
      name: 'catalog_db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'entity'],
      registers: [this.registry],
    });

    this.dbQueryErrors = new Counter({
      name: 'catalog_db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'entity', 'error_type'],
      registers: [this.registry],
    });

    // Initialize business metrics
    this.itemViews = new Counter({
      name: 'catalog_item_views_total',
      help: 'Total number of catalog item views',
      labelNames: ['item_id', 'category'],
      registers: [this.registry],
    });

    this.itemFavorites = new Counter({
      name: 'catalog_item_favorites_total',
      help: 'Total number of items favorited',
      labelNames: ['item_id', 'category'],
      registers: [this.registry],
    });

    this.itemShares = new Counter({
      name: 'catalog_item_shares_total',
      help: 'Total number of items shared',
      labelNames: ['item_id', 'category'],
      registers: [this.registry],
    });

    this.activeCatalogItems = new Gauge({
      name: 'catalog_active_items',
      help: 'Number of active catalog items',
      labelNames: ['category'],
      registers: [this.registry],
    });

    this.logger.log('Prometheus metrics initialized');
  }

  // HTTP Metrics
  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequestDuration.labels(method, route, status.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, status.toString()).inc();
  }

  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.labels(method, route, errorType).inc();
  }

  // Cache Metrics
  recordCacheHit(layer: 'L1' | 'L2' | 'L3', cacheType: string): void {
    this.cacheHits.labels(layer, cacheType).inc();
  }

  recordCacheMiss(layer: 'L1' | 'L2' | 'L3', cacheType: string): void {
    this.cacheMisses.labels(layer, cacheType).inc();
  }

  updateCacheSize(layer: 'L1' | 'L2', size: number): void {
    this.cacheSize.labels(layer).set(size);
  }

  // Search Metrics
  recordSearch(searchType: string, duration: number, resultCount: number): void {
    this.searchDuration.labels(searchType).observe(duration);
    this.searchTotal.labels(searchType).inc();
    this.searchResults.labels(searchType).observe(resultCount);
  }

  // Recommendation Metrics
  recordRecommendation(recommendationType: string, duration: number): void {
    this.recommendationDuration.labels(recommendationType).observe(duration);
    this.recommendationTotal.labels(recommendationType).inc();
  }

  // Database Metrics
  recordDbQuery(operation: string, entity: string, duration: number): void {
    this.dbQueryDuration.labels(operation, entity).observe(duration);
    this.dbQueryTotal.labels(operation, entity).inc();
  }

  recordDbError(operation: string, entity: string, errorType: string): void {
    this.dbQueryErrors.labels(operation, entity, errorType).inc();
  }

  // Business Metrics
  recordItemView(itemId: string, category: string): void {
    this.itemViews.labels(itemId, category).inc();
  }

  recordItemFavorite(itemId: string, category: string): void {
    this.itemFavorites.labels(itemId, category).inc();
  }

  recordItemShare(itemId: string, category: string): void {
    this.itemShares.labels(itemId, category).inc();
  }

  updateActiveCatalogItems(category: string, count: number): void {
    this.activeCatalogItems.labels(category).set(count);
  }

  // Get metrics for Prometheus scraping
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get metrics in JSON format
  async getMetricsJSON(): Promise<any> {
    const metrics = await this.registry.getMetricsAsJSON();
    return metrics;
  }

  // Reset all metrics (for testing)
  resetMetrics(): void {
    this.registry.resetMetrics();
    this.logger.log('All metrics reset');
  }
}
