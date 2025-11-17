import { Controller, Get } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';
import { HealthCheckResult } from '../interfaces/database.interface';

@Controller('health')
export class DatabaseHealthController {
  constructor(
    private readonly healthService: DatabaseHealthService,
  ) {}

  @Get('database')
  async checkDatabaseHealth(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  @Get()
  async checkHealth(): Promise<{ status: string; timestamp: Date }> {
    const dbHealth = await this.healthService.checkHealth();
    return {
      status: dbHealth.status,
      timestamp: dbHealth.timestamp,
    };
  }
}
