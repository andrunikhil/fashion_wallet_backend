import { Controller, Get, Header } from '@nestjs/common';
import { DatabaseMetricsService } from './database-metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: DatabaseMetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('json')
  async getMetricsJSON() {
    return this.metricsService.getMetricsJSON();
  }
}
