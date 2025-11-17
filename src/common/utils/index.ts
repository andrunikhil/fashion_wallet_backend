/**
 * Common utilities barrel export
 *
 * This module provides comprehensive reusable utilities for the Fashion Wallet backend:
 * - Validation: Input validation, sanitization, and type guards
 * - Error Handling: Custom error classes and error formatting
 * - Logging: Structured logging with Winston
 * - Security: Encryption, hashing, and token generation
 * - Async: Retry logic, timeouts, parallel execution, and batch processing
 * - String: Slugification, case conversion, masking, and templating
 * - Date/Time: Formatting, parsing, timezone handling, and date arithmetic
 * - Object/Array: Deep cloning, merging, grouping, and sorting
 * - File: MIME type detection, validation, and path operations
 * - Media: Image/video processing, optimization, and analysis
 * - Storage: S3 and cloud storage operations
 *
 * Usage:
 * ```typescript
 * import {
 *   ValidationUtil,
 *   Logger,
 *   AppError,
 *   EncryptionUtil,
 *   AsyncUtil,
 *   StringUtil,
 *   DateUtil,
 *   ObjectUtil,
 *   FileUtil,
 *   ImageUtil,
 *   VideoUtil,
 *   S3Util
 * } from '@/common/utils';
 * ```
 */

// Validation utilities
export * from './validation';

// Error utilities
export * from './error';

// Logging utilities
export * from './logging';

// Security utilities
export * from './security';

// Async utilities
export * from './async';

// String utilities
export * from './string';

// Date/Time utilities
export * from './datetime';

// Object and Array utilities
export * from './object';

// File utilities
export * from './file';

// Image utilities
export { ImageUtil } from './media/image/image.util';
export { ImageConverter } from './media/image/image-converter.util';
export { ImageOptimizer } from './media/image/image-optimizer.util';
export { ThumbnailGenerator } from './media/image/thumbnail-generator.util';
export { ImageAnalyzer } from './media/image/image-analyzer.util';

// Video utilities
export { VideoUtil } from './media/video/video.util';

// 3D Model utilities
export { Model3DUtil } from './media/model3d/model3d.util';

// Storage utilities
export { S3Util } from './storage/s3.util';

// Media types
export * from '../types/media.types';
