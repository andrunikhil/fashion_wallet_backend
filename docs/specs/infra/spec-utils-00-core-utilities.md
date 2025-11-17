# Utilities Specification: Core Utilities

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Utilities Specification
**Status**: Draft
**Spec ID**: spec-utils-00

---

## 1. Executive Summary

This specification defines the core utility modules and helper functions for the Fashion Wallet backend. These utilities provide reusable functionality across all services including validation, encryption, logging, error handling, date/time operations, and more. All utilities must be well-tested, performant, and follow functional programming principles where appropriate.

---

## 2. Utility Categories

```yaml
Categories:
  Validation:
    - Input validation
    - Schema validation
    - Data sanitization
    - Type guards

  Security:
    - Encryption/Decryption
    - Hashing
    - Token generation
    - Sanitization

  Logging:
    - Structured logging
    - Log levels
    - Log formatting
    - Log rotation

  Error Handling:
    - Custom error classes
    - Error formatting
    - Error tracking
    - Stack trace management

  Date/Time:
    - Date formatting
    - Timezone handling
    - Date calculations
    - Timestamp operations

  String:
    - String manipulation
    - Slug generation
    - Template rendering
    - Text processing

  Number:
    - Formatting
    - Rounding
    - Currency operations
    - Math helpers

  Array/Object:
    - Deep clone
    - Deep merge
    - Array operations
    - Object transformations

  File:
    - File operations
    - MIME type detection
    - File validation
    - Path manipulation

  HTTP:
    - Request helpers
    - Response formatting
    - Header parsing
    - URL manipulation

  Async:
    - Promise utilities
    - Retry logic
    - Rate limiting
    - Timeout handling
```

---

## 3. Validation Utilities

### 3.1 Input Validation

```typescript
/**
 * Input validation using decorators and Joi/class-validator
 */

// Using class-validator
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDTO {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number and special character'
  })
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;
}

// Validation helper
export class ValidationUtil {
  /**
   * Validate object against class
   */
  static async validate<T extends object>(
    cls: new () => T,
    data: any
  ): Promise<{ valid: boolean; errors?: string[]; data?: T }> {
    const instance = plainToClass(cls, data);
    const errors = await validate(instance);

    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors.map(err =>
          Object.values(err.constraints || {}).join(', ')
        )
      };
    }

    return { valid: true, data: instance };
  }

  /**
   * Validate using Joi schema
   */
  static validateWithJoi<T>(
    schema: Joi.Schema,
    data: any
  ): { valid: boolean; errors?: string[]; data?: T } {
    const result = schema.validate(data, { abortEarly: false });

    if (result.error) {
      return {
        valid: false,
        errors: result.error.details.map(d => d.message)
      };
    }

    return { valid: true, data: result.value };
  }
}
```

### 3.2 Data Sanitization

```typescript
export class SanitizationUtil {
  /**
   * Sanitize string (remove dangerous characters)
   */
  static sanitizeString(input: string, options?: {
    allowHtml?: boolean;
    maxLength?: number;
    trim?: boolean;
  }): string {
    let sanitized = input;

    // Trim whitespace
    if (options?.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags if not allowed
    if (!options?.allowHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Limit length
    if (options?.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  /**
   * Sanitize filename
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/\s+/g, '-')           // Spaces to hyphens
      .replace(/[^a-z0-9\-_.]/g, '')  // Remove special chars
      .replace(/-+/g, '-')            // Multiple hyphens to one
      .substring(0, 255);             // Limit length
  }

  /**
   * Sanitize HTML (allow safe tags)
   */
  static sanitizeHtml(html: string, allowedTags?: string[]): string {
    const defaultAllowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
    const allowed = allowedTags || defaultAllowedTags;

    // Use DOMPurify or similar library
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: allowed,
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  }

  /**
   * Remove null/undefined values from object
   */
  static removeNullish<T extends object>(obj: T): Partial<T> {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  }

  /**
   * Sanitize email
   */
  static sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
```

### 3.3 Type Guards

```typescript
export class TypeGuards {
  /**
   * Check if value is defined
   */
  static isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * Check if value is string
   */
  static isString(value: any): value is string {
    return typeof value === 'string';
  }

  /**
   * Check if value is number
   */
  static isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Check if value is object
   */
  static isObject(value: any): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Check if value is array
   */
  static isArray<T = any>(value: any): value is T[] {
    return Array.isArray(value);
  }

  /**
   * Check if value is valid UUID
   */
  static isUUID(value: any): value is string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return this.isString(value) && uuidRegex.test(value);
  }

  /**
   * Check if value is valid email
   */
  static isEmail(value: any): value is string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.isString(value) && emailRegex.test(value);
  }

  /**
   * Check if value is empty
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (this.isString(value)) return value.trim().length === 0;
    if (this.isArray(value)) return value.length === 0;
    if (this.isObject(value)) return Object.keys(value).length === 0;
    return false;
  }
}
```

---

## 4. Security Utilities

### 4.1 Encryption

```typescript
import * as crypto from 'crypto';

export class EncryptionUtil {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static ivLength = 16;
  private static saltLength = 64;
  private static tagLength = 16;

  /**
   * Encrypt data
   */
  static encrypt(
    data: string,
    key: string
  ): {
    encrypted: string;
    iv: string;
    tag: string;
  } {
    const derivedKey = this.deriveKey(key);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  static decrypt(
    encrypted: string,
    key: string,
    iv: string,
    tag: string
  ): string {
    const derivedKey = this.deriveKey(key);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      derivedKey,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Derive key from password
   */
  private static deriveKey(password: string): Buffer {
    const salt = crypto.scryptSync(password, 'salt', this.keyLength);
    return salt;
  }

  /**
   * Hash data (one-way)
   */
  static hash(data: string, algorithm: 'sha256' | 'sha512' = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate HMAC
   */
  static hmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * Generate random string
   */
  static randomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate random bytes
   */
  static randomBytes(length: number = 32): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Compare strings securely (constant time)
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
```

### 4.2 Token Generation

```typescript
export class TokenUtil {
  /**
   * Generate secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate URL-safe token
   */
  static generateUrlSafeToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate numeric token (OTP)
   */
  static generateNumericToken(length: number = 6): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    const code = crypto.randomInt(min, max + 1);
    return code.toString().padStart(length, '0');
  }

  /**
   * Generate API key
   */
  static generateApiKey(prefix: string = 'fw_live_'): string {
    const key = crypto.randomBytes(32).toString('base64url');
    return `${prefix}${key}`;
  }

  /**
   * Verify token expiration
   */
  static isExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt);
  }
}
```

---

## 5. Logging Utilities

### 5.1 Logger Service

```typescript
import winston from 'winston';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  service?: string;
  module?: string;
  [key: string]: any;
}

export class Logger {
  private logger: winston.Logger;

  constructor(context?: LogContext) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: context,
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // File transports
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760,          // 10MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 10485760,
          maxFiles: 5
        })
      ]
    });
  }

  /**
   * Log error
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined,
      ...context
    });
  }

  /**
   * Log warning
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, context);
  }

  /**
   * Log HTTP request
   */
  http(message: string, context?: LogContext): void {
    this.logger.http(message, context);
  }

  /**
   * Log debug
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context);
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }
}

// Global logger instance
export const logger = new Logger({
  service: 'fashion-wallet-api'
});
```

### 5.2 Request Logging

```typescript
export class RequestLogger {
  /**
   * Log incoming request
   */
  static logRequest(req: Request): void {
    logger.http('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      requestId: req.get('x-request-id')
    });
  }

  /**
   * Log outgoing response
   */
  static logResponse(
    req: Request,
    res: Response,
    duration: number
  ): void {
    logger.http('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.get('x-request-id')
    });
  }

  /**
   * Log API error
   */
  static logApiError(
    req: Request,
    error: Error,
    statusCode: number
  ): void {
    logger.error('API error', error, {
      method: req.method,
      url: req.url,
      statusCode,
      requestId: req.get('x-request-id'),
      userId: (req as any).user?.id
    });
  }
}
```

---

## 6. Error Handling Utilities

### 6.1 Custom Error Classes

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier ${identifier} not found`
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
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR', false);
  }
}
```

### 6.2 Error Handler

```typescript
export class ErrorHandler {
  /**
   * Handle error and format response
   */
  static handle(error: Error): {
    statusCode: number;
    message: string;
    code?: string;
    details?: any;
    stack?: string;
  } {
    // App errors
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        message: error.message,
        code: error.code,
        details: error instanceof ValidationError ? error.fields : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }

    // Database errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return {
        statusCode: 409,
        message: 'Resource already exists',
        code: 'DUPLICATE_ENTRY'
      };
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return {
        statusCode: 400,
        message: 'Invalid reference',
        code: 'INVALID_REFERENCE'
      };
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      };
    }

    // Default error
    logger.error('Unhandled error', error);
    return {
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  /**
   * Check if error is operational
   */
  static isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }
}
```

---

## 7. Date/Time Utilities

```typescript
import { format, parse, addDays, subDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export class DateUtil {
  /**
   * Format date
   */
  static format(date: Date, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
    return format(date, formatString);
  }

  /**
   * Parse date string
   */
  static parse(dateString: string, formatString: string = 'yyyy-MM-dd'): Date {
    return parse(dateString, formatString, new Date());
  }

  /**
   * Get current timestamp
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Get Unix timestamp
   */
  static timestamp(date: Date = new Date()): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * From Unix timestamp
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    return addDays(date, days);
  }

  /**
   * Subtract days from date
   */
  static subDays(date: Date, days: number): Date {
    return subDays(date, days);
  }

  /**
   * Get difference in days
   */
  static diffDays(date1: Date, date2: Date): number {
    return differenceInDays(date1, date2);
  }

  /**
   * Check if date is after another
   */
  static isAfter(date: Date, dateToCompare: Date): boolean {
    return isAfter(date, dateToCompare);
  }

  /**
   * Check if date is before another
   */
  static isBefore(date: Date, dateToCompare: Date): boolean {
    return isBefore(date, dateToCompare);
  }

  /**
   * Convert to timezone
   */
  static toTimezone(date: Date, timezone: string): Date {
    return utcToZonedTime(date, timezone);
  }

  /**
   * Convert from timezone to UTC
   */
  static fromTimezone(date: Date, timezone: string): Date {
    return zonedTimeToUtc(date, timezone);
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
  }

  /**
   * Check if date is expired
   */
  static isExpired(date: Date): boolean {
    return this.isBefore(date, new Date());
  }
}
```

---

## 8. String Utilities

```typescript
export class StringUtil {
  /**
   * Generate slug from string
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate string
   */
  static truncate(text: string, length: number, suffix: string = '...'): string {
    if (text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Camel case to snake case
   */
  static camelToSnake(text: string): string {
    return text.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Snake case to camel case
   */
  static snakeToCamel(text: string): string {
    return text.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Generate random string
   */
  static random(length: number = 10, charset: string = 'alphanumeric'): string {
    const charsets = {
      alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      numeric: '0123456789',
      hex: '0123456789abcdef'
    };

    const chars = charsets[charset] || charsets.alphanumeric;
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * Mask string (for sensitive data)
   */
  static mask(text: string, visibleChars: number = 4, maskChar: string = '*'): string {
    if (text.length <= visibleChars) return text;
    const visible = text.slice(-visibleChars);
    const masked = maskChar.repeat(text.length - visibleChars);
    return masked + visible;
  }

  /**
   * Parse template string
   */
  static template(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }
}
```

---

## 9. Async Utilities

```typescript
export class AsyncUtil {
  /**
   * Sleep/delay
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      factor?: number;
      onRetry?: (error: Error, attempt: number) => void;
    } = {}
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
        return await fn();
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
   * Timeout promise
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
   * Batch process array
   */
  static async batch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Sequential processing
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

## 10. Object/Array Utilities

```typescript
export class ObjectUtil {
  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Deep merge objects
   */
  static deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;

    const source = sources.shift();
    if (source === undefined) return target;

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!target[key]) {
            Object.assign(target, { [key]: {} });
          }
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Pick properties from object
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
   * Omit properties from object
   */
  static omit<T extends object, K extends keyof T>(
    obj: T,
    keys: K[]
  ): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }

  /**
   * Check if object
   */
  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

export class ArrayUtil {
  /**
   * Chunk array
   */
  static chunk<T>(array: T[], size: number): T[][] {
    return Array.from(
      { length: Math.ceil(array.length / size) },
      (_, i) => array.slice(i * size, i * size + size)
    );
  }

  /**
   * Unique values
   */
  static unique<T>(array: T[]): T[] {
    return Array.from(new Set(array));
  }

  /**
   * Group by property
   */
  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Sort by property
   */
  static sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
```

---

## 11. Testing Requirements

```yaml
Unit Tests (>90% coverage required):
  - All validation functions
  - Encryption/decryption
  - Token generation
  - String manipulations
  - Date operations
  - Error handling
  - Type guards
  - Array/Object utilities

Integration Tests:
  - Logging to files
  - Async retry logic
  - Batch processing
```

---

## 12. Success Criteria

```yaml
Acceptance Criteria:
  - All utilities are pure functions (where appropriate)
  - 100% TypeScript type safety
  - >90% test coverage
  - Zero security vulnerabilities
  - Documentation for all public methods
  - Performance benchmarks passed
  - No external side effects
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: None

---

**End of Core Utilities Specification**
