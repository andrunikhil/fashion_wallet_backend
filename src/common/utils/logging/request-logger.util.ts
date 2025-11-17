import { Request, Response, NextFunction } from 'express';
import { Logger } from './logger.service';

/**
 * Request logger utility for Express middleware
 * Logs HTTP requests with timing and response details
 */
export class RequestLogger {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Creates Express middleware for logging requests
   * @returns Express middleware function
   */
  createMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      // Log request start
      this.logger.http('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Capture response finish
      res.on('finish', () => {
        const duration = Date.now() - startTime;

        this.logger.logRequest(
          {
            method: req.method,
            url: req.url,
            ip: req.ip,
          },
          {
            statusCode: res.statusCode,
          },
          duration,
        );
      });

      next();
    };
  }

  /**
   * Logs request body (use carefully with sensitive data)
   * @param req Express request
   * @param sanitize Whether to sanitize sensitive fields
   */
  logRequestBody(req: Request, sanitize = true): void {
    let body = req.body;

    if (sanitize) {
      body = this.sanitizeBody(body);
    }

    this.logger.debug('Request body', {
      method: req.method,
      url: req.url,
      body,
    });
  }

  /**
   * Logs response body (use carefully with large responses)
   * @param req Express request
   * @param body Response body
   * @param sanitize Whether to sanitize sensitive fields
   */
  logResponseBody(req: Request, body: any, sanitize = true): void {
    let responseBody = body;

    if (sanitize) {
      responseBody = this.sanitizeBody(body);
    }

    this.logger.debug('Response body', {
      method: req.method,
      url: req.url,
      body: responseBody,
    });
  }

  /**
   * Sanitizes request/response body to remove sensitive fields
   * @param body Body object to sanitize
   * @returns Sanitized body
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'creditCard',
      'credit_card',
      'ssn',
      'cvv',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Logs request headers (excluding sensitive headers)
   * @param req Express request
   */
  logRequestHeaders(req: Request): void {
    const headers = { ...req.headers };

    // Remove sensitive headers
    delete headers['authorization'];
    delete headers['cookie'];
    delete headers['x-api-key'];

    this.logger.debug('Request headers', {
      method: req.method,
      url: req.url,
      headers,
    });
  }

  /**
   * Logs slow requests (requests that exceed threshold)
   * @param threshold Threshold in milliseconds
   * @returns Express middleware function
   */
  createSlowRequestLogger(threshold = 1000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          this.logger.warn('Slow request detected', {
            method: req.method,
            url: req.url,
            duration: `${duration}ms`,
            threshold: `${threshold}ms`,
          });
        }
      });

      next();
    };
  }

  /**
   * Logs failed requests (4xx and 5xx status codes)
   * @returns Express middleware function
   */
  createErrorRequestLogger() {
    return (req: Request, res: Response, next: NextFunction): void => {
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          const level = res.statusCode >= 500 ? 'error' : 'warn';

          this.logger[level]('Request failed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            ip: req.ip,
          });
        }
      });

      next();
    };
  }

  /**
   * Creates a detailed request logger for debugging
   * @returns Express middleware function
   */
  createDetailedLogger() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      // Log detailed request info
      this.logger.debug('Detailed request', {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        contentType: req.get('content-type'),
      });

      res.on('finish', () => {
        const duration = Date.now() - startTime;

        this.logger.debug('Detailed response', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentType: res.get('content-type'),
        });
      });

      next();
    };
  }

  /**
   * Logs user activity (requires authentication middleware)
   * @returns Express middleware function
   */
  createUserActivityLogger() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user; // Assumes user is attached by auth middleware

      if (user) {
        this.logger.info('User activity', {
          userId: user.id || user._id,
          username: user.username || user.email,
          method: req.method,
          url: req.url,
          ip: req.ip,
        });
      }

      next();
    };
  }

  /**
   * Creates a correlation ID for request tracking
   * @returns Express middleware function
   */
  createCorrelationIdMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const correlationId =
        req.get('x-correlation-id') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Attach to request
      (req as any).correlationId = correlationId;

      // Add to response headers
      res.setHeader('x-correlation-id', correlationId);

      // Create child logger with correlation ID
      (req as any).logger = this.logger.child({ correlationId });

      next();
    };
  }

  /**
   * Logs API rate limiting events
   * @param userId User identifier
   * @param endpoint Endpoint being accessed
   * @param limit Rate limit
   * @param remaining Remaining requests
   */
  logRateLimit(userId: string, endpoint: string, limit: number, remaining: number): void {
    this.logger.info('Rate limit check', {
      userId,
      endpoint,
      limit,
      remaining,
    });
  }

  /**
   * Logs rate limit exceeded event
   * @param userId User identifier
   * @param endpoint Endpoint being accessed
   */
  logRateLimitExceeded(userId: string, endpoint: string): void {
    this.logger.warn('Rate limit exceeded', {
      userId,
      endpoint,
    });
  }
}

/**
 * Creates a default request logger middleware
 * @param logger Logger instance
 * @returns Express middleware function
 */
export function createRequestLogger(logger: Logger) {
  const requestLogger = new RequestLogger(logger);
  return requestLogger.createMiddleware();
}

/**
 * Creates a combined logging middleware with multiple loggers
 * @param logger Logger instance
 * @returns Array of Express middleware functions
 */
export function createCombinedLogger(logger: Logger) {
  const requestLogger = new RequestLogger(logger);

  return [
    requestLogger.createCorrelationIdMiddleware(),
    requestLogger.createMiddleware(),
    requestLogger.createSlowRequestLogger(1000),
    requestLogger.createErrorRequestLogger(),
  ];
}
