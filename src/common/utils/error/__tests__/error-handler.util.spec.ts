import { ErrorHandler } from '../error-handler.util';
import {
  AppError,
  ValidationError,
  InternalServerError,
} from '../errors';

describe('ErrorHandler', () => {
  describe('formatError', () => {
    it('should format AppError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.status).toBe('error');
      expect(formatted.statusCode).toBe(400);
      expect(formatted.code).toBe('VALIDATION_ERROR');
      expect(formatted.message).toBe('Invalid input');
      expect(formatted.details).toEqual({ field: 'email' });
    });

    it('should include stack trace when requested', () => {
      const error = new Error('Test error');
      const formatted = ErrorHandler.formatError(error, true);

      expect(formatted).toHaveProperty('stack');
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      const formatted = ErrorHandler.formatError(error);

      expect(formatted.statusCode).toBe(500);
      expect(formatted.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('formatValidationError', () => {
    it('should format validation errors from array', () => {
      const errors = ['Email is required', 'Password is too short'];
      const formatted = ErrorHandler.formatValidationError(errors);

      expect(formatted.statusCode).toBe(400);
      expect(formatted.code).toBe('VALIDATION_ERROR');
      expect(formatted.details).toHaveProperty('errors');
    });

    it('should format validation errors from object', () => {
      const errors = {
        email: ['Invalid format'],
        password: ['Too short', 'Missing special character'],
      };
      const formatted = ErrorHandler.formatValidationError(errors);

      expect(formatted.details).toEqual(errors);
    });
  });

  describe('isCriticalError', () => {
    it('should return true for non-operational errors', () => {
      const error = new InternalServerError();
      expect(ErrorHandler.isCriticalError(error)).toBe(true);
    });

    it('should return false for operational errors', () => {
      const error = new ValidationError();
      expect(ErrorHandler.isCriticalError(error)).toBe(false);
    });

    it('should return true for generic errors', () => {
      const error = new Error('Unknown error');
      expect(ErrorHandler.isCriticalError(error)).toBe(true);
    });
  });

  describe('getLogLevel', () => {
    it('should return "error" for critical errors', () => {
      const error = new InternalServerError();
      expect(ErrorHandler.getLogLevel(error)).toBe('error');
    });

    it('should return "warn" for client errors', () => {
      const error = new ValidationError();
      expect(ErrorHandler.getLogLevel(error)).toBe('warn');
    });

    it('should return "error" for server errors', () => {
      const error = new AppError('Error', 500, 'ERROR');
      expect(ErrorHandler.getLogLevel(error)).toBe('error');
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should sanitize email addresses', () => {
      const message = 'Failed to send email to test@example.com';
      const sanitized = ErrorHandler.sanitizeErrorMessage(message);

      expect(sanitized).not.toContain('test@example.com');
      expect(sanitized).toContain('[EMAIL]');
    });

    it('should sanitize phone numbers', () => {
      const message = 'User phone: +12345678901';
      const sanitized = ErrorHandler.sanitizeErrorMessage(message);

      expect(sanitized).not.toContain('+12345678901');
      expect(sanitized).toContain('[PHONE]');
    });

    it('should sanitize potential tokens', () => {
      const message = 'Invalid token: abc123def456ghi789jkl012mno';
      const sanitized = ErrorHandler.sanitizeErrorMessage(message);

      expect(sanitized).toContain('[TOKEN]');
    });
  });

  describe('createProductionErrorResponse', () => {
    it('should hide server error details in production', () => {
      const error = new InternalServerError('Database connection failed', {
        host: 'localhost',
        port: 5432,
      });
      const response = ErrorHandler.createProductionErrorResponse(error);

      expect(response.message).toBe('Database connection failed');
      expect(response).not.toHaveProperty('details'); // Hide details for 5xx
      expect(response).not.toHaveProperty('stack');
    });

    it('should include details for client errors in production', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid format'],
      });
      const response = ErrorHandler.createProductionErrorResponse(error);

      expect(response.details).toEqual({ email: ['Invalid format'] });
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Internal implementation detail');
      const response = ErrorHandler.createProductionErrorResponse(error);

      expect(response.message).toBe('An unexpected error occurred');
    });
  });

  describe('createDevelopmentErrorResponse', () => {
    it('should include full error details in development', () => {
      const error = new InternalServerError('Database error', { query: 'SELECT *' });
      const response = ErrorHandler.createDevelopmentErrorResponse(error);

      expect(response.details).toEqual({ query: 'SELECT *' });
      expect(response).toHaveProperty('stack');
    });
  });

  describe('getErrorCode', () => {
    it('should get error code from AppError', () => {
      const error = new ValidationError();
      expect(ErrorHandler.getErrorCode(error)).toBe('VALIDATION_ERROR');
    });

    it('should return UNKNOWN_ERROR for generic errors', () => {
      const error = new Error('Generic error');
      expect(ErrorHandler.getErrorCode(error)).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getStatusCode', () => {
    it('should get status code from AppError', () => {
      const error = new ValidationError();
      expect(ErrorHandler.getStatusCode(error)).toBe(400);
    });

    it('should return 500 for generic errors', () => {
      const error = new Error('Generic error');
      expect(ErrorHandler.getStatusCode(error)).toBe(500);
    });
  });

  describe('isRetryableError', () => {
    it('should return true for service unavailable errors', () => {
      const error = new AppError('Service unavailable', 503, 'SERVICE_UNAVAILABLE');
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it('should return true for gateway timeout errors', () => {
      const error = new AppError('Gateway timeout', 504, 'GATEWAY_TIMEOUT');
      expect(ErrorHandler.isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new ValidationError();
      expect(ErrorHandler.isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should use retryAfter from error details', () => {
      const error = new AppError('Rate limited', 429, 'RATE_LIMITED', true, {
        retryAfter: 60,
      });
      const delay = ErrorHandler.getRetryDelay(error, 1);

      expect(delay).toBe(60000); // 60 seconds in ms
    });

    it('should use exponential backoff', () => {
      const error = new Error('Generic error');

      expect(ErrorHandler.getRetryDelay(error, 0)).toBe(1000); // 1s
      expect(ErrorHandler.getRetryDelay(error, 1)).toBe(2000); // 2s
      expect(ErrorHandler.getRetryDelay(error, 2)).toBe(4000); // 4s
      expect(ErrorHandler.getRetryDelay(error, 3)).toBe(8000); // 8s
    });

    it('should cap retry delay at 30 seconds', () => {
      const error = new Error('Generic error');
      const delay = ErrorHandler.getRetryDelay(error, 10);

      expect(delay).toBeLessThanOrEqual(30000);
    });
  });
});
