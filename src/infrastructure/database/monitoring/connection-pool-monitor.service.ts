import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PostgresService } from '../postgres/postgres.service';

export interface ConnectionPoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
}

export interface PoolHealthStatus {
  timestamp: Date;
  stats: ConnectionPoolStats;
  utilizationPercentage: number;
  isHealthy: boolean;
  warnings: string[];
}

@Injectable()
export class ConnectionPoolMonitorService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionPoolMonitorService.name);
  private monitoringInterval: NodeJS.Timeout;
  private readonly WARNING_THRESHOLD = 0.8; // 80% pool utilization
  private readonly CRITICAL_THRESHOLD = 0.95; // 95% pool utilization

  constructor(private readonly postgresService: PostgresService) {}

  onModuleInit() {
    // Start monitoring every 30 seconds
    this.startMonitoring(30000);
  }

  startMonitoring(intervalMs: number = 30000): void {
    this.logger.log(`Starting connection pool monitoring (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(async () => {
      try {
        const status = await this.getPoolHealth();

        if (!status.isHealthy) {
          this.logger.warn('Connection pool health degraded', {
            stats: status.stats,
            utilization: `${status.utilizationPercentage}%`,
            warnings: status.warnings,
          });
        }

        // Log warnings
        if (status.warnings.length > 0) {
          status.warnings.forEach(warning => this.logger.warn(warning));
        }
      } catch (error) {
        this.logger.error('Failed to monitor connection pool', error);
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.logger.log('Connection pool monitoring stopped');
    }
  }

  async getPoolHealth(): Promise<PoolHealthStatus> {
    const stats = await this.getPoolStats();
    const utilizationPercentage = this.calculateUtilization(stats);
    const warnings: string[] = [];
    let isHealthy = true;

    // Check for high utilization
    if (utilizationPercentage >= this.CRITICAL_THRESHOLD * 100) {
      warnings.push(`CRITICAL: Connection pool usage at ${utilizationPercentage.toFixed(2)}%`);
      isHealthy = false;
    } else if (utilizationPercentage >= this.WARNING_THRESHOLD * 100) {
      warnings.push(`WARNING: Connection pool usage at ${utilizationPercentage.toFixed(2)}%`);
    }

    // Check for waiting connections
    if (stats.waiting > 0) {
      warnings.push(`${stats.waiting} queries waiting for connections`);
      isHealthy = false;
    }

    // Check for low idle connections
    const idlePercentage = (stats.idle / stats.total) * 100;
    if (idlePercentage < 10 && stats.total > 0) {
      warnings.push(`Low idle connections: ${idlePercentage.toFixed(2)}%`);
    }

    return {
      timestamp: new Date(),
      stats,
      utilizationPercentage,
      isHealthy,
      warnings,
    };
  }

  async getPoolStats(): Promise<ConnectionPoolStats> {
    try {
      const result = await this.postgresService.query(`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      return {
        total: parseInt(result[0]?.total || '0'),
        active: parseInt(result[0]?.active || '0'),
        idle: parseInt(result[0]?.idle || '0'),
        waiting: parseInt(result[0]?.waiting || '0'),
      };
    } catch (error) {
      this.logger.error('Failed to get connection pool stats', error);
      return { total: 0, active: 0, idle: 0, waiting: 0 };
    }
  }

  private calculateUtilization(stats: ConnectionPoolStats): number {
    if (stats.total === 0) return 0;
    return (stats.active / stats.total) * 100;
  }

  async getSlowQueries(thresholdMs: number = 100): Promise<any[]> {
    try {
      const result = await this.postgresService.query(`
        SELECT
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          stddev_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > $1
        ORDER BY mean_exec_time DESC
        LIMIT 20
      `, [thresholdMs]);

      return result;
    } catch (error) {
      // pg_stat_statements extension might not be enabled
      this.logger.debug('pg_stat_statements not available', error.message);
      return [];
    }
  }

  async getCacheHitRatio(): Promise<number> {
    try {
      const result = await this.postgresService.query(`
        SELECT
          sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) as ratio
        FROM pg_statio_user_tables
      `);

      return parseFloat(result[0]?.ratio || '0');
    } catch (error) {
      this.logger.error('Failed to get cache hit ratio', error);
      return 0;
    }
  }

  async getReplicationLag(): Promise<number> {
    try {
      const result = await this.postgresService.query(`
        SELECT
          EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
      `);

      return parseFloat(result[0]?.lag_seconds || '0');
    } catch (error) {
      // Not a replica or function not available
      return 0;
    }
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }
}
