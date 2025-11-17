import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';
import { DatabaseHealth } from '../interfaces/database.interface';

@Injectable()
export class PostgresService implements OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async onModuleDestroy() {
    await this.closeConnections();
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const connections = await this.getConnectionPoolStats();

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        connections,
      };
    } catch (error) {
      this.logger.error('PostgreSQL health check failed', error);
      return {
        healthy: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async query(sql: string, parameters?: any[]): Promise<any> {
    try {
      return await this.dataSource.query(sql, parameters);
    } catch (error) {
      this.logger.error('PostgreSQL query failed', error);
      throw error;
    }
  }

  async createQueryRunner(): Promise<QueryRunner> {
    return this.dataSource.createQueryRunner();
  }

  async initializeSchemas(): Promise<void> {
    try {
      // Enable required PostgreSQL extensions
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

      // Create schemas if they don't exist
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS shared');
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS avatar');
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS catalog');
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS design');
      await this.dataSource.query('CREATE SCHEMA IF NOT EXISTS audit');

      this.logger.log('PostgreSQL schemas initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize PostgreSQL schemas', error);
      throw error;
    }
  }

  async closeConnections(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('PostgreSQL connections closed');
    }
  }

  private async getConnectionPoolStats(): Promise<{
    total: number;
    active: number;
    idle: number;
  }> {
    try {
      const result = await this.dataSource.query(`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      return {
        total: parseInt(result[0]?.total || '0'),
        active: parseInt(result[0]?.active || '0'),
        idle: parseInt(result[0]?.idle || '0'),
      };
    } catch (error) {
      this.logger.warn('Failed to get connection pool stats', error);
      return { total: 0, active: 0, idle: 0 };
    }
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }
}
