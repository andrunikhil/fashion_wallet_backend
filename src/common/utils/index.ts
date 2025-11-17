/**
 * Common utilities barrel export
 *
 * This module provides reusable utilities for the Fashion Wallet backend:
 * - Validation: Input validation, sanitization, and type guards
 * - Error Handling: Custom error classes and error formatting
 * - Logging: Structured logging with Winston
 *
 * Usage:
 * ```typescript
 * import { ValidationUtil, Logger, AppError } from '@/common/utils';
 * ```
 */

// Validation utilities
export * from './validation';

// Error utilities
export * from './error';

// Logging utilities
export * from './logging';

// Note: Additional utility modules will be added in future phases:
// - Security utilities (encryption, hashing, tokens)
// - Async utilities (retry, timeout, batch processing)
// - String utilities (slugify, truncate, case conversion)
// - Date utilities (formatting, parsing, timezone)
// - Object/Array utilities (deep clone, merge, group)
// - File utilities (validation, MIME detection)
