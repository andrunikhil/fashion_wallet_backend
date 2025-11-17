import { Controller, Get, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '../../queue/services/queue.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {}

  @Get()
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'avatar-service',
      version: '1.0.0',
    };
  }

  @Get('ready')
  async readinessCheck() {
    const checks: any = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {},
    };

    try {
      // Check queue connectivity
      const queueStats = await this.queueService.getQueueStats();
      checks.checks.queue = {
        status: 'healthy',
        stats: queueStats,
      };
    } catch (error) {
      checks.checks.queue = {
        status: 'unhealthy',
        error: error.message,
      };
      checks.status = 'not-ready';
    }

    // Check ML service (optional for readiness)
    try {
      const mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:5000');
      checks.checks.mlService = {
        status: 'configured',
        url: mlServiceUrl,
      };
    } catch (error) {
      checks.checks.mlService = {
        status: 'not-configured',
        error: error.message,
      };
    }

    return checks;
  }

  @Get('live')
  async livenessCheck() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('metrics')
  async metricsCheck() {
    try {
      const queueStats = await this.queueService.getQueueStats();

      return {
        queue: queueStats,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      };
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      return {
        error: 'Failed to retrieve metrics',
      };
    }
  }
}
