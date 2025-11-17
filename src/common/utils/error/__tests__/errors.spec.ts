import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  BadRequestError,
  isOperationalError,
  mapDatabaseError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create an error with all properties', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR', true, { extra: 'data' });

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should convert to JSON', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      const json = error.toJSON();

      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('statusCode', 500);
      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error', () => {
      const error = new ValidationError('Invalid input');

      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should include validation details', () => {
      const details = { email: ['Invalid email format'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error', () => {
      const error = new NotFoundError('User not found', 'User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ resource: 'User' });
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a forbidden error', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Access forbidden');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('TooManyRequestsError', () => {
    it('should create a rate limit error', () => {
      const error = new TooManyRequestsError('Rate limit exceeded', 60);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
      expect(error.details).toEqual({ retryAfter: 60 });
    });
  });

  describe('InternalServerError', () => {
    it('should create an internal server error', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal server error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('BadRequestError', () => {
    it('should create a bad request error', () => {
      const error = new BadRequestError('Invalid request');

      expect(error.message).toBe('Invalid request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      const error = new ValidationError();
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational errors', () => {
      const error = new InternalServerError();
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Generic error');
      expect(isOperationalError(error)).toBe(false);
    });
  });

  describe('mapDatabaseError', () => {
    it('should map MongoDB duplicate key error', () => {
      const dbError = {
        code: 11000,
        keyPattern: { email: 1 },
        keyValue: { email: 'test@example.com' },
      };

      const error = mapDatabaseError(dbError);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toContain('Duplicate');
    });

    it('should map MongoDB validation error', () => {
      const dbError = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
        },
      };

      const error = mapDatabaseError(dbError);

      expect(error).toBeInstanceOf(ValidationError);
    });

    it('should map PostgreSQL duplicate key error', () => {
      const dbError = {
        code: '23505',
      };

      const error = mapDatabaseError(dbError);

      expect(error).toBeInstanceOf(ConflictError);
    });

    it('should map PostgreSQL foreign key violation', () => {
      const dbError = {
        code: '23503',
      };

      const error = mapDatabaseError(dbError);

      expect(error).toBeInstanceOf(BadRequestError);
    });

    it('should map unknown database errors', () => {
      const dbError = {
        code: 'UNKNOWN',
        message: 'Unknown error',
      };

      const error = mapDatabaseError(dbError);

      expect(error.statusCode).toBe(500);
    });
  });
});
