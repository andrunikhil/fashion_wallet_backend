import { Injectable, Logger } from '@nestjs/common';
import { PostgresService } from '../postgres/postgres.service';
import { MongoDbService } from '../mongodb/mongodb.service';
import { HealthCheckResult } from '../interfaces/database.interface';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(
    private readonly postgresService: PostgresService,
    private readonly mongoService: MongoDbService,
  ) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const [pgHealth, mongoHealth] = await Promise.allSettled([
      this.postgresService.checkHealth(),
      this.mongoService.checkHealth(),
    ]);

    const pgResult = pgHealth.status === 'fulfilled'
      ? pgHealth.value
      : { healthy: false, error: pgHealth.reason?.message || 'Unknown error', responseTime: 0 };

    const mongoResult = mongoHealth.status === 'fulfilled'
      ? mongoHealth.value
      : { healthy: false, error: mongoHealth.reason?.message || 'Unknown error', responseTime: 0 };

    const isHealthy = pgResult.healthy && mongoResult.healthy;

    const result: HealthCheckResult = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks: {
        postgres: pgResult,
        mongodb: mongoResult,
      },
    };

    if (!isHealthy) {
      this.logger.warn('Database health check failed', result);
    } else {
      this.logger.debug('Database health check passed', result);
    }

    return result;
  }

  async isHealthy(): Promise<boolean> {
    const result = await this.checkHealth();
    return result.status === 'healthy';
  }
}
