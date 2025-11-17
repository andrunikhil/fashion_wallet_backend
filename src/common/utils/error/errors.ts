/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true,
    details?: any,
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Converts error to JSON format
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

/**
 * Validation error (400)
 * Used when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Not Found error (404)
 * Used when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', resource?: string) {
    super(
      message,
      404,
      'NOT_FOUND',
      true,
      resource ? { resource } : undefined,
    );
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Unauthorized error (401)
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED', true);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error (403)
 * Used when user doesn't have permission to access a resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN', true);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Conflict error (409)
 * Used when a request conflicts with the current state of the server
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', true, details);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Too Many Requests error (429)
 * Used when rate limit is exceeded
 */
export class TooManyRequestsError extends AppError {
  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
  ) {
    super(
      message,
      429,
      'TOO_MANY_REQUESTS',
      true,
      retryAfter ? { retryAfter } : undefined,
    );
    this.name = 'TooManyRequestsError';
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false, details);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Bad Request error (400)
 * Used when the request is malformed or invalid
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', true, details);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Service Unavailable error (503)
 * Used when the service is temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', retryAfter?: number) {
    super(
      message,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      retryAfter ? { retryAfter } : undefined,
    );
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Gateway Timeout error (504)
 * Used when an upstream service times out
 */
export class GatewayTimeoutError extends AppError {
  constructor(message: string = 'Gateway timeout') {
    super(message, 504, 'GATEWAY_TIMEOUT', true);
    this.name = 'GatewayTimeoutError';
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

/**
 * Unprocessable Entity error (422)
 * Used when the request is well-formed but semantically incorrect
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unprocessable entity', details?: any) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', true, details);
    this.name = 'UnprocessableEntityError';
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

/**
 * Payment Required error (402)
 * Used when payment is required to access a resource
 */
export class PaymentRequiredError extends AppError {
  constructor(message: string = 'Payment required') {
    super(message, 402, 'PAYMENT_REQUIRED', true);
    this.name = 'PaymentRequiredError';
    Object.setPrototypeOf(this, PaymentRequiredError.prototype);
  }
}

/**
 * Database error
 * Used for database-related errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', details?: any) {
    super(message, 500, 'DATABASE_ERROR', false, details);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External Service error
 * Used when an external service call fails
 */
export class ExternalServiceError extends AppError {
  constructor(
    message: string = 'External service error',
    service?: string,
    details?: any,
  ) {
    super(
      message,
      502,
      'EXTERNAL_SERVICE_ERROR',
      false,
      service ? { service, ...details } : details,
    );
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Token error
 * Used for JWT and token-related errors
 */
export class TokenError extends AppError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 401, 'TOKEN_ERROR', true);
    this.name = 'TokenError';
    Object.setPrototypeOf(this, TokenError.prototype);
  }
}

/**
 * File Upload error
 * Used for file upload related errors
 */
export class FileUploadError extends AppError {
  constructor(message: string = 'File upload failed', details?: any) {
    super(message, 400, 'FILE_UPLOAD_ERROR', true, details);
    this.name = 'FileUploadError';
    Object.setPrototypeOf(this, FileUploadError.prototype);
  }
}

/**
 * Helper function to determine if an error is operational
 * @param error Error to check
 * @returns true if error is operational
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to map database errors to application errors
 * @param error Database error
 * @returns Mapped application error
 */
export function mapDatabaseError(error: any): AppError {
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    return new ConflictError(`Duplicate ${field}`, {
      field,
      value: error.keyValue?.[field],
    });
  }

  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors || {}).map(
      (err: any) => err.message,
    );
    return new ValidationError('Validation failed', { errors: messages });
  }

  // PostgreSQL duplicate key error
  if (error.code === '23505') {
    return new ConflictError('Duplicate entry');
  }

  // PostgreSQL foreign key violation
  if (error.code === '23503') {
    return new BadRequestError('Referenced resource not found');
  }

  // Generic database error
  return new DatabaseError('Database operation failed', {
    code: error.code,
    message: error.message,
  });
}
