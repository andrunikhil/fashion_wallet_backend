import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { DatabaseHealth } from '../interfaces/database.interface';

@Injectable()
export class MongoDbService implements OnModuleDestroy {
  private readonly logger = new Logger(MongoDbService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async onModuleDestroy() {
    await this.closeConnections();
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();
    try {
      const isHealthy = this.connection.readyState === 1;

      if (!isHealthy) {
        return {
          healthy: false,
          error: 'MongoDB connection not ready',
          responseTime: Date.now() - startTime,
        };
      }

      // Perform a ping to verify connection
      await this.connection.db.admin().ping();

      return {
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('MongoDB health check failed', error);
      return {
        healthy: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async getStats(): Promise<any> {
    try {
      return await this.connection.db.stats();
    } catch (error) {
      this.logger.error('Failed to get MongoDB stats', error);
      throw error;
    }
  }

  async closeConnections(): Promise<void> {
    if (this.connection.readyState === 1) {
      await this.connection.close();
      this.logger.log('MongoDB connections closed');
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection.readyState === 1;
  }
}
