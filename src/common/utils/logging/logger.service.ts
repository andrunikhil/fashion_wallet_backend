import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug',
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  level?: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDir?: string;
  serviceName?: string;
  environment?: string;
}

/**
 * Logger service using Winston
 * Provides structured logging with rotation and multiple transports
 */
export class Logger {
  private logger: winston.Logger;
  private serviceName: string;
  private environment: string;

  constructor(config: LoggerConfig = {}) {
    const {
      level = LogLevel.INFO,
      enableConsole = true,
      enableFile = true,
      logDir = 'logs',
      serviceName = 'fashion-wallet',
      environment = process.env.NODE_ENV || 'development',
    } = config;

    this.serviceName = serviceName;
    this.environment = environment;

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
      }),
    );

    // Define transports
    const transports: winston.transport[] = [];

    // Console transport
    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: environment === 'development' ? consoleFormat : logFormat,
        }),
      );
    }

    // File transports with rotation
    if (enableFile) {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '10m',
          maxFiles: '14d',
          format: logFormat,
        }),
      );

      // Combined logs
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '14d',
          format: logFormat,
        }),
      );
    }

    // Create logger instance
    this.logger = winston.createLogger({
      level,
      format: logFormat,
      defaultMeta: {
        service: this.serviceName,
        environment: this.environment,
      },
      transports,
    });
  }

  /**
   * Logs an error message
   * @param message Error message
   * @param meta Additional metadata
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Logs a warning message
   * @param message Warning message
   * @param meta Additional metadata
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Logs an info message
   * @param message Info message
   * @param meta Additional metadata
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Logs an HTTP message
   * @param message HTTP message
   * @param meta Additional metadata
   */
  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  /**
   * Logs a debug message
   * @param message Debug message
   * @param meta Additional metadata
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Creates a child logger with additional context
   * @param context Context metadata
   * @returns Child logger instance
   */
  child(context: Record<string, any>): Logger {
    const childLogger = new Logger({
      level: this.logger.level as LogLevel,
      serviceName: this.serviceName,
      environment: this.environment,
    });

    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Logs an exception with stack trace
   * @param error Error object
   * @param message Optional message
   */
  logException(error: Error, message?: string): void {
    this.logger.error(message || 'Exception occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Logs request/response details
   * @param req Request details
   * @param res Response details
   * @param duration Request duration in ms
   */
  logRequest(
    req: { method: string; url: string; ip?: string },
    res: { statusCode: number },
    duration: number,
  ): void {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

    this.logger.log(level, 'HTTP Request', {
      request: {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      response: {
        statusCode: res.statusCode,
      },
      duration: `${duration}ms`,
    });
  }

  /**
   * Logs database query
   * @param query Query string
   * @param duration Query duration in ms
   * @param params Query parameters
   */
  logQuery(query: string, duration: number, params?: any): void {
    this.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      params,
    });
  }

  /**
   * Logs external API call
   * @param service Service name
   * @param endpoint API endpoint
   * @param method HTTP method
   * @param duration Request duration in ms
   * @param statusCode Response status code
   */
  logExternalCall(
    service: string,
    endpoint: string,
    method: string,
    duration: number,
    statusCode?: number,
  ): void {
    this.info('External API Call', {
      service,
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode,
    });
  }

  /**
   * Logs authentication event
   * @param event Event type (login, logout, etc.)
   * @param userId User ID
   * @param success Whether the event was successful
   * @param details Additional details
   */
  logAuth(event: string, userId: string, success: boolean, details?: any): void {
    const level = success ? 'info' : 'warn';
    this.logger.log(level, `Auth Event: ${event}`, {
      userId,
      success,
      ...details,
    });
  }

  /**
   * Logs security event
   * @param event Event type
   * @param severity Severity level
   * @param details Event details
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(level, `Security Event: ${event}`, {
      severity,
      ...details,
    });
  }

  /**
   * Logs performance metric
   * @param operation Operation name
   * @param duration Duration in ms
   * @param details Additional details
   */
  logPerformance(operation: string, duration: number, details?: any): void {
    const level = duration > 5000 ? 'warn' : 'info';
    this.logger.log(level, `Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...details,
    });
  }

  /**
   * Gets the underlying Winston logger instance
   * @returns Winston logger
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Sets the log level
   * @param level New log level
   */
  setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * Closes all transports and ends logging
   */
  close(): void {
    this.logger.close();
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger({
  level: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
  enableConsole: true,
  enableFile: process.env.NODE_ENV === 'production',
  serviceName: 'fashion-wallet-backend',
  environment: process.env.NODE_ENV || 'development',
});
