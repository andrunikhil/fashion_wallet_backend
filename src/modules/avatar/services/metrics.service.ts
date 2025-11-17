import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  private readonly avatarProcessingDuration: Histogram<string>;
  private readonly avatarProcessingTotal: Counter<string>;
  private readonly avatarProcessingErrors: Counter<string>;
  private readonly avatarApiRequests: Counter<string>;
  private readonly avatarApiDuration: Histogram<string>;
  private readonly activeProcessingJobs: Gauge<string>;
  private readonly queueSize: Gauge<string>;

  constructor() {
    // Processing metrics
    this.avatarProcessingDuration = new Histogram({
      name: 'avatar_processing_duration_seconds',
      help: 'Duration of avatar processing in seconds',
      labelNames: ['status'],
      buckets: [10, 30, 60, 90, 120, 180, 300],
    });

    this.avatarProcessingTotal = new Counter({
      name: 'avatar_processing_total',
      help: 'Total number of avatar processing jobs',
      labelNames: ['status'],
    });

    this.avatarProcessingErrors = new Counter({
      name: 'avatar_processing_errors_total',
      help: 'Total number of avatar processing errors',
      labelNames: ['error_type'],
    });

    // API metrics
    this.avatarApiRequests = new Counter({
      name: 'avatar_api_requests_total',
      help: 'Total number of API requests',
      labelNames: ['endpoint', 'method', 'status'],
    });

    this.avatarApiDuration = new Histogram({
      name: 'avatar_api_request_duration_seconds',
      help: 'Duration of API requests in seconds',
      labelNames: ['endpoint', 'method'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Queue metrics
    this.activeProcessingJobs = new Gauge({
      name: 'avatar_active_processing_jobs',
      help: 'Number of currently active processing jobs',
    });

    this.queueSize = new Gauge({
      name: 'avatar_queue_size',
      help: 'Current size of the avatar processing queue',
    });

    this.logger.log('Metrics service initialized');
  }

  recordProcessingDuration(duration: number, status: string) {
    const durationSeconds = duration / 1000;
    this.avatarProcessingDuration.observe({ status }, durationSeconds);
  }

  incrementProcessingTotal(status: string) {
    this.avatarProcessingTotal.inc({ status });
  }

  incrementProcessingError(errorType: string) {
    this.avatarProcessingErrors.inc({ error_type: errorType });
  }

  recordApiRequest(endpoint: string, method: string, status: number) {
    this.avatarApiRequests.inc({ endpoint, method, status: status.toString() });
  }

  recordApiDuration(endpoint: string, method: string, duration: number) {
    const durationSeconds = duration / 1000;
    this.avatarApiDuration.observe({ endpoint, method }, durationSeconds);
  }

  setActiveJobs(count: number) {
    this.activeProcessingJobs.set(count);
  }

  setQueueSize(size: number) {
    this.queueSize.set(size);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  async resetMetrics(): Promise<void> {
    register.clear();
    this.logger.warn('All metrics reset');
  }
}
