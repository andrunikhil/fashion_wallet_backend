import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';
import { PostgresService } from '../postgres/postgres.service';
import { MongoDbService } from '../mongodb/mongodb.service';
import { ConnectionPoolMonitorService } from './connection-pool-monitor.service';

@Injectable()
export class DatabaseMetricsService implements OnModuleInit {
  // Query metrics
  private readonly queryDurationHistogram: Histogram<string>;
  private readonly queryErrorCounter: Counter<string>;
  private readonly queryCounter: Counter<string>;

  // Connection pool metrics
  private readonly connectionPoolGauge: Gauge<string>;
  private readonly connectionPoolUtilizationGauge: Gauge<string>;

  // Database health metrics
  private readonly databaseHealthGauge: Gauge<string>;
  private readonly cacheHitRatioGauge: Gauge<string>;
  private readonly replicationLagGauge: Gauge<string>;

  constructor(
    private readonly postgresService: PostgresService,
    private readonly mongoService: MongoDbService,
    private readonly poolMonitor: ConnectionPoolMonitorService,
  ) {
    // Initialize query metrics
    this.queryDurationHistogram = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['database', 'operation', 'status'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [register],
    });

    this.queryErrorCounter = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['database', 'error_type'],
      registers: [register],
    });

    this.queryCounter = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['database', 'operation'],
      registers: [register],
    });

    // Initialize connection pool metrics
    this.connectionPoolGauge = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Current connection pool size',
      labelNames: ['database', 'state'],
      registers: [register],
    });

    this.connectionPoolUtilizationGauge = new Gauge({
      name: 'db_connection_pool_utilization',
      help: 'Connection pool utilization percentage',
      labelNames: ['database'],
      registers: [register],
    });

    // Initialize health metrics
    this.databaseHealthGauge = new Gauge({
      name: 'db_health_status',
      help: 'Database health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['database'],
      registers: [register],
    });

    this.cacheHitRatioGauge = new Gauge({
      name: 'db_cache_hit_ratio',
      help: 'Database cache hit ratio',
      labelNames: ['database'],
      registers: [register],
    });

    this.replicationLagGauge = new Gauge({
      name: 'db_replication_lag_seconds',
      help: 'Database replication lag in seconds',
      labelNames: ['database'],
      registers: [register],
    });
  }

  async onModuleInit() {
    // Start collecting metrics every 30 seconds
    setInterval(() => this.collectMetrics(), 30000);
    // Collect immediately on startup
    await this.collectMetrics();
  }

  async collectMetrics(): Promise<void> {
    await Promise.all([
      this.collectPostgresMetrics(),
      this.collectMongoMetrics(),
    ]);
  }

  private async collectPostgresMetrics(): Promise<void> {
    try {
      // Connection pool stats
      const poolStats = await this.poolMonitor.getPoolStats();
      this.connectionPoolGauge.set({ database: 'postgres', state: 'total' }, poolStats.total);
      this.connectionPoolGauge.set({ database: 'postgres', state: 'active' }, poolStats.active);
      this.connectionPoolGauge.set({ database: 'postgres', state: 'idle' }, poolStats.idle);
      this.connectionPoolGauge.set({ database: 'postgres', state: 'waiting' }, poolStats.waiting);

      // Pool utilization
      const utilization = poolStats.total > 0 ? (poolStats.active / poolStats.total) * 100 : 0;
      this.connectionPoolUtilizationGauge.set({ database: 'postgres' }, utilization);

      // Health status
      const health = await this.postgresService.checkHealth();
      this.databaseHealthGauge.set({ database: 'postgres' }, health.healthy ? 1 : 0);

      // Cache hit ratio
      const cacheHitRatio = await this.poolMonitor.getCacheHitRatio();
      this.cacheHitRatioGauge.set({ database: 'postgres' }, cacheHitRatio);

      // Replication lag
      const replicationLag = await this.poolMonitor.getReplicationLag();
      this.replicationLagGauge.set({ database: 'postgres' }, replicationLag);
    } catch (error) {
      // Silent fail - don't break metrics collection
    }
  }

  private async collectMongoMetrics(): Promise<void> {
    try {
      // Health status
      const health = await this.mongoService.checkHealth();
      this.databaseHealthGauge.set({ database: 'mongodb' }, health.healthy ? 1 : 0);

      // Get MongoDB stats
      if (this.mongoService.isConnected()) {
        const stats = await this.mongoService.getStats();
        // You can add more MongoDB-specific metrics here
      }
    } catch (error) {
      // Silent fail - don't break metrics collection
    }
  }

  // Method to track query execution
  trackQuery<T>(
    database: 'postgres' | 'mongodb',
    operation: string,
    queryFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    this.queryCounter.inc({ database, operation });

    return queryFn()
      .then((result) => {
        const duration = (Date.now() - startTime) / 1000;
        this.queryDurationHistogram.observe(
          { database, operation, status: 'success' },
          duration,
        );
        return result;
      })
      .catch((error) => {
        const duration = (Date.now() - startTime) / 1000;
        this.queryDurationHistogram.observe(
          { database, operation, status: 'error' },
          duration,
        );
        this.queryErrorCounter.inc({ database, error_type: error.name || 'unknown' });
        throw error;
      });
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }

  async getMetricsJSON() {
    return register.getMetricsAsJSON();
  }
}
