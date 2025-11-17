import { AppError, isOperationalError } from './errors';

/**
 * Error response format
 */
export interface ErrorResponse {
  status: 'error';
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  details?: any;
  stack?: string;
}

/**
 * Error handler utility class
 * Provides methods for formatting and handling errors
 */
export class ErrorHandler {
  /**
   * Formats an error into a standardized response
   * @param error Error to format
   * @param includeStack Whether to include stack trace
   * @returns Formatted error response
   */
  static formatError(error: Error, includeStack = false): ErrorResponse {
    if (error instanceof AppError) {
      return {
        status: 'error',
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        details: error.details,
        ...(includeStack && { stack: error.stack }),
      };
    }

    // Handle unknown errors
    return {
      status: 'error',
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      ...(includeStack && { stack: error.stack }),
    };
  }

  /**
   * Formats validation errors into a user-friendly format
   * @param errors Array of validation error messages
   * @param field Optional field name
   * @returns Formatted error response
   */
  static formatValidationError(
    errors: string[] | Record<string, string[]>,
    field?: string,
  ): ErrorResponse {
    let details: any;

    if (Array.isArray(errors)) {
      details = field ? { [field]: errors } : { errors };
    } else {
      details = errors;
    }

    return {
      status: 'error',
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      timestamp: new Date().toISOString(),
      details,
    };
  }

  /**
   * Determines if an error should be logged as critical
   * @param error Error to check
   * @returns true if error is critical
   */
  static isCriticalError(error: Error): boolean {
    if (error instanceof AppError) {
      return !error.isOperational;
    }
    return true; // Unknown errors are considered critical
  }

  /**
   * Gets the log level for an error
   * @param error Error to check
   * @returns Log level (error, warn, info)
   */
  static getLogLevel(error: Error): 'error' | 'warn' | 'info' {
    if (this.isCriticalError(error)) {
      return 'error';
    }

    if (error instanceof AppError) {
      // Client errors (4xx) are warnings
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return 'warn';
      }
      // Server errors (5xx) are errors
      return 'error';
    }

    return 'error';
  }

  /**
   * Sanitizes error message to remove sensitive information
   * @param message Error message to sanitize
   * @returns Sanitized message
   */
  static sanitizeErrorMessage(message: string): string {
    // Remove potential sensitive data patterns
    let sanitized = message;

    // Remove email addresses
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Remove phone numbers
    sanitized = sanitized.replace(/\+?[1-9]\d{1,14}/g, '[PHONE]');

    // Remove potential tokens/keys (strings of 20+ alphanumeric chars)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{20,}/g, '[TOKEN]');

    // Remove credit card numbers
    sanitized = sanitized.replace(/\b\d{13,19}\b/g, '[CARD]');

    // Remove potential API keys
    sanitized = sanitized.replace(/api[_-]?key[_-]?[\w-]{10,}/gi, '[API_KEY]');

    return sanitized;
  }

  /**
   * Creates a safe error object for logging
   * Removes circular references and limits depth
   * @param error Error to serialize
   * @param maxDepth Maximum depth for nested objects
   * @returns Serializable error object
   */
  static createSafeErrorObject(error: Error, maxDepth = 3): Record<string, any> {
    const seen = new WeakSet();

    const serialize = (obj: any, depth: number): any => {
      if (depth > maxDepth) {
        return '[Max Depth Reached]';
      }

      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj !== 'object') {
        return obj;
      }

      if (seen.has(obj)) {
        return '[Circular Reference]';
      }

      seen.add(obj);

      if (Array.isArray(obj)) {
        return obj.map((item) => serialize(item, depth + 1));
      }

      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        try {
          result[key] = serialize(obj[key], depth + 1);
        } catch {
          result[key] = '[Serialization Error]';
        }
      }

      return result;
    };

    return {
      name: error.name,
      message: this.sanitizeErrorMessage(error.message),
      stack: error.stack,
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        code: error.code,
        isOperational: error.isOperational,
        details: serialize(error.details, 0),
      }),
    };
  }

  /**
   * Handles process-level errors
   * @param error Error to handle
   * @param exitProcess Whether to exit the process
   */
  static handleFatalError(error: Error, exitProcess = true): void {
    console.error('Fatal error occurred:', error);

    if (exitProcess && !isOperationalError(error)) {
      console.error('Process will exit...');
      process.exit(1);
    }
  }

  /**
   * Creates an error response for production
   * Hides sensitive implementation details
   * @param error Error to format
   * @returns Safe error response
   */
  static createProductionErrorResponse(error: Error): ErrorResponse {
    if (error instanceof AppError) {
      return {
        status: 'error',
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        timestamp: error.timestamp.toISOString(),
        // Only include details for client errors (4xx)
        ...(error.statusCode < 500 && { details: error.details }),
      };
    }

    // For unknown errors, return generic message
    return {
      status: 'error',
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Creates an error response for development
   * Includes full error details and stack trace
   * @param error Error to format
   * @returns Detailed error response
   */
  static createDevelopmentErrorResponse(error: Error): ErrorResponse {
    return this.formatError(error, true);
  }

  /**
   * Creates an error response based on environment
   * @param error Error to format
   * @param isDevelopment Whether in development mode
   * @returns Environment-appropriate error response
   */
  static createErrorResponse(error: Error, isDevelopment = false): ErrorResponse {
    return isDevelopment
      ? this.createDevelopmentErrorResponse(error)
      : this.createProductionErrorResponse(error);
  }

  /**
   * Extracts error code from error
   * @param error Error to extract code from
   * @returns Error code
   */
  static getErrorCode(error: Error): string {
    if (error instanceof AppError) {
      return error.code;
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Extracts status code from error
   * @param error Error to extract status from
   * @returns HTTP status code
   */
  static getStatusCode(error: Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }

  /**
   * Checks if error is retryable
   * @param error Error to check
   * @returns true if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    if (error instanceof AppError) {
      // Service unavailable and gateway timeout are retryable
      return error.statusCode === 503 || error.statusCode === 504;
    }
    return false;
  }

  /**
   * Gets retry delay for error
   * @param error Error to get retry delay for
   * @param attempt Current retry attempt number
   * @returns Retry delay in milliseconds
   */
  static getRetryDelay(error: Error, attempt: number): number {
    if (error instanceof AppError && error.details?.retryAfter) {
      return error.details.retryAfter * 1000; // Convert to ms
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }
}
