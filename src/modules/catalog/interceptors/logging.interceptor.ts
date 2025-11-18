import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interceptor for structured logging with correlation IDs
 * Automatically adds correlation IDs to all requests and logs
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    // Generate or extract correlation ID
    const correlationId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      uuidv4();

    // Attach correlation ID to request for downstream use
    request.correlationId = correlationId;

    // Add correlation ID to response headers
    response.setHeader('x-correlation-id', correlationId);

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    // Log incoming request
    this.logger.log({
      message: 'Incoming request',
      correlationId,
      method,
      url,
      userId,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const status = response.statusCode;

          // Log successful response
          this.logger.log({
            message: 'Request completed',
            correlationId,
            method,
            url,
            status,
            duration: `${duration}ms`,
            userId,
            timestamp: new Date().toISOString(),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error.status || 500;

          // Log error response
          this.logger.error({
            message: 'Request failed',
            correlationId,
            method,
            url,
            status,
            duration: `${duration}ms`,
            userId,
            error: error.message,
            errorType: error.constructor.name,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }
}

/**
 * Custom logger service with structured logging
 */
@Injectable()
export class StructuredLogger {
  private readonly logger: Logger;
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.logger = new Logger(context);
  }

  /**
   * Log with correlation ID and structured data
   */
  log(message: string, data?: any, correlationId?: string) {
    this.logger.log({
      message,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log error with correlation ID and structured data
   */
  error(message: string, error?: Error, data?: any, correlationId?: string) {
    this.logger.error({
      message,
      context: this.context,
      correlationId,
      error: error?.message,
      errorType: error?.constructor.name,
      stack: error?.stack,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log warning with correlation ID and structured data
   */
  warn(message: string, data?: any, correlationId?: string) {
    this.logger.warn({
      message,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log debug with correlation ID and structured data
   */
  debug(message: string, data?: any, correlationId?: string) {
    this.logger.debug({
      message,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    data?: any,
    correlationId?: string,
  ) {
    const level = duration > 1000 ? 'warn' : 'log';
    this.logger[level]({
      message: 'Performance metric',
      operation,
      duration: `${duration}ms`,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log business event
   */
  logEvent(
    event: string,
    entity: string,
    entityId: string,
    data?: any,
    correlationId?: string,
  ) {
    this.logger.log({
      message: 'Business event',
      event,
      entity,
      entityId,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log security event
   */
  logSecurity(
    event: string,
    userId: string,
    data?: any,
    correlationId?: string,
  ) {
    this.logger.warn({
      message: 'Security event',
      event,
      userId,
      context: this.context,
      correlationId,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
