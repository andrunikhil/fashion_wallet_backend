# Architecture Document: Core Utilities

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-utils-00
**Related Spec**: spec-utils-00

---

## 1. Executive Summary

This architecture document describes the implementation of core utility modules for the Fashion Wallet backend, providing reusable functionality across all services including validation, security, logging, error handling, and common operations.

---

## 2. Architectural Overview

### 2.1 Utility Organization

```
src/common/utils/
├── validation/
│   ├── validator.util.ts
│   ├── sanitizer.util.ts
│   └── type-guards.util.ts
├── security/
│   ├── encryption.util.ts
│   ├── token.util.ts
│   └── hash.util.ts
├── logging/
│   ├── logger.service.ts
│   └── request-logger.util.ts
├── error/
│   ├── errors.ts
│   └── error-handler.util.ts
├── datetime/
│   └── date.util.ts
├── string/
│   └── string.util.ts
├── async/
│   └── async.util.ts
├── object/
│   ├── object.util.ts
│   └── array.util.ts
└── index.ts
```

---

## 3. Validation Utilities

### 3.1 Validation Framework Integration

```typescript
/**
 * Custom validation decorators
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          const hasUpperCase = /[A-Z]/.test(value);
          const hasLowerCase = /[a-z]/.test(value);
          const hasNumbers = /\d/.test(value);
          const hasSpecialChar = /[@$!%*?&]/.test(value);
          const minLength = value.length >= 8;

          return (
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar &&
            minLength
          );
        },
        defaultMessage() {
          return 'Password must contain uppercase, lowercase, number, special character and be at least 8 characters long';
        }
      }
    });
  };
}

/**
 * Example usage
 */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}
```

### 3.2 Input Sanitization

```typescript
/**
 * Comprehensive sanitization utilities
 */
export class SanitizationUtil {
  /**
   * Sanitize HTML input
   */
  static sanitizeHtml(input: string, options?: SanitizeOptions): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: options?.allowedTags || ['b', 'i', 'em', 'strong', 'p'],
      ALLOWED_ATTR: options?.allowedAttrs || [],
      KEEP_CONTENT: true
    });
  }

  /**
   * Sanitize for SQL (prevent injection)
   */
  static sanitizeForSQL(input: string): string {
    // Note: This is backup - always use parameterized queries
    return input.replace(/['";\\]/g, '\\$&');
  }

  /**
   * Sanitize file path
   */
  static sanitizePath(path: string): string {
    return path
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[^a-zA-Z0-9\-_./]/g, '') // Remove special characters
      .replace(/\/+/g, '/') // Normalize slashes
      .replace(/^\//, ''); // Remove leading slash
  }

  /**
   * Strip dangerous scripts
   */
  static stripScripts(input: string): string {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}
```

---

## 4. Security Utilities

### 4.1 Encryption Service

```typescript
/**
 * Production-grade encryption utility
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;

  /**
   * Encrypt sensitive data
   */
  static encrypt(
    plaintext: string,
    masterKey: string
  ): EncryptedData {
    // Derive key from master key
    const salt = crypto.randomBytes(this.SALT_LENGTH);
    const key = crypto.scryptSync(masterKey, salt, this.KEY_LENGTH);

    // Generate IV
    const iv = crypto.randomBytes(this.IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  static decrypt(
    encryptedData: EncryptedData,
    masterKey: string
  ): string {
    // Derive key from master key and salt
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const key = crypto.scryptSync(masterKey, salt, this.KEY_LENGTH);

    // Create decipher
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

    // Set auth tag
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  static async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate cryptographically secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID
   */
  static generateUUID(): string {
    return uuidv4();
  }
}
```

---

## 5. Logging Architecture

### 5.1 Structured Logger

```typescript
/**
 * Application-wide logger service
 */
@Injectable()
export class LoggerService {
  private logger: winston.Logger;
  private context: string;

  constructor(context: string) {
    this.context = context;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'fashion-wallet-api',
        context: this.context
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: isDevelopment
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                  return `${timestamp} [${context}] ${level}: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                  }`;
                })
              )
            : winston.format.json()
        }),

        // File transport for errors
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        }),

        // File transport for all logs
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760,
          maxFiles: 5
        })
      ]
    });
  }

  /**
   * Log methods
   */
  log(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.logger.error(message, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...meta
    });
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Create child logger with additional context
   */
  child(context: string): LoggerService {
    const childLogger = new LoggerService(`${this.context}:${context}`);
    return childLogger;
  }
}
```

---

## 6. Error Handling

### 6.1 Custom Error Hierarchy

```typescript
/**
 * Base application error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this.name.replace(/Error$/, '').toUpperCase();
    this.isOperational = isOperational;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Domain-specific errors
 */
export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', public retryAfter?: number) {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}
```

---

## 7. Async Utilities

### 7.1 Promise Utilities

```typescript
/**
 * Async operation utilities
 */
export class AsyncUtil {
  /**
   * Retry with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      factor = 2,
      onRetry
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = Math.min(
          initialDelay * Math.pow(factor, attempt - 1),
          maxDelay
        );

        if (onRetry) {
          onRetry(lastError, attempt);
        }

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Sleep/delay
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Timeout wrapper
   */
  static timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), ms)
      )
    ]);
  }

  /**
   * Parallel execution with concurrency limit
   */
  static async parallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 5
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Sequential execution
   */
  static async sequential<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i++) {
      results.push(await processor(items[i], i));
    }

    return results;
  }
}
```

---

## 8. Object/Array Utilities

### 8.1 Object Manipulation

```typescript
/**
 * Object utility functions
 */
export class ObjectUtil {
  /**
   * Deep clone
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (obj instanceof Object) {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  /**
   * Deep merge
   */
  static deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;

    const source = sources.shift();
    if (!source) return target;

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, { [key]: {} });
          }
          this.deepMerge(target[key] as any, source[key] as any);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Pick properties
   */
  static pick<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Pick<T, K> {
    return keys.reduce((result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    }, {} as Pick<T, K>);
  }

  /**
   * Omit properties
   */
  static omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }

  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
```

---

## 9. Testing Support

### 9.1 Test Utilities

```typescript
/**
 * Test helper utilities
 */
export class TestUtil {
  /**
   * Create mock logger
   */
  static createMockLogger(): LoggerService {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      child: jest.fn()
    } as any;
  }

  /**
   * Wait for condition
   */
  static async waitFor(
    condition: () => boolean,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Condition not met within timeout');
      }
      await AsyncUtil.sleep(100);
    }
  }

  /**
   * Generate test data
   */
  static generateTestUser(overrides?: Partial<User>): User {
    return {
      id: uuidv4(),
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
}
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: None

---

**End of Core Utilities Architecture Document**
