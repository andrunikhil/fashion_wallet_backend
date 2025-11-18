import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CatalogMetricsService } from '../services/metrics.service';

/**
 * Interceptor for monitoring HTTP request performance
 * Automatically records metrics for all catalog endpoints
 */
@Injectable()
export class PerformanceMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitoringInterceptor.name);

  constructor(private readonly metricsService: CatalogMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    const { method, url, route } = request;
    const routePath = route?.path || url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000; // Convert to seconds
          const status = response.statusCode;

          // Record HTTP metrics
          this.metricsService.recordHttpRequest(method, routePath, status, duration);

          // Log slow requests (> 1s)
          if (duration > 1) {
            this.logger.warn(
              `Slow request detected: ${method} ${routePath} took ${duration.toFixed(3)}s`,
            );
          }
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const errorType = error.constructor.name;

          // Record error metrics
          this.metricsService.recordHttpError(method, routePath, errorType);

          this.logger.error(
            `Request error: ${method} ${routePath} failed after ${duration.toFixed(3)}s`,
            error.stack,
          );
        },
      }),
    );
  }
}
