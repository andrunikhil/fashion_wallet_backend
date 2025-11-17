import { fileTypeFromBuffer } from 'file-type';
import * as fs from 'fs/promises';

/**
 * File validation result interface
 */
export interface FileValidationResult {
  valid: boolean;
  errors?: string[];
  metadata?: {
    mimeType: string;
    size: number;
    extension: string;
  };
}

/**
 * Validation options interface
 */
export interface ValidationOptions {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  minSize?: number;
  maxSize?: number;
  checkMagicNumber?: boolean;
  scanMalware?: boolean;
}

/**
 * File Validator Utility
 * Provides comprehensive file validation including MIME type, size, extension, and security checks
 */
export class FileValidator {
  /**
   * Validate a file buffer or file path
   * @param file - Buffer or file path to validate
   * @param options - Validation options
   * @returns Validation result
   */
  static async validate(
    file: Buffer | string,
    options: ValidationOptions = {},
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    let buffer: Buffer;
    let fileSize: number;
    let filename: string | undefined;

    try {
      // Load file if path is provided
      if (typeof file === 'string') {
        filename = file;
        buffer = await fs.readFile(file);
        const stats = await fs.stat(file);
        fileSize = stats.size;
      } else {
        buffer = file;
        fileSize = buffer.length;
      }

      // Detect file type using magic numbers
      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType && options.checkMagicNumber !== false) {
        errors.push('Could not detect file type from magic numbers');
      }

      const mimeType = fileType?.mime || 'application/octet-stream';
      const extension = fileType?.ext || '';

      // MIME type validation
      if (options.allowedMimeTypes && fileType) {
        if (!this.validateMimeType(buffer, options.allowedMimeTypes, fileType.mime)) {
          errors.push(
            `Invalid MIME type. Expected one of: ${options.allowedMimeTypes.join(', ')}, got: ${mimeType}`,
          );
        }
      }

      // File size validation
      if (options.minSize !== undefined || options.maxSize !== undefined) {
        if (!this.validateSize(fileSize, options.minSize, options.maxSize)) {
          errors.push(
            `Invalid file size. Size: ${fileSize}B, Min: ${options.minSize}B, Max: ${options.maxSize}B`,
          );
        }
      }

      // Extension validation
      if (options.allowedExtensions && filename) {
        if (!this.validateExtension(filename, options.allowedExtensions)) {
          errors.push(
            `Invalid file extension. Expected one of: ${options.allowedExtensions.join(', ')}`,
          );
        }
      }

      // Malware scanning (if enabled)
      if (options.scanMalware) {
        const isSafe = await this.scanForMalware(buffer);
        if (!isSafe) {
          errors.push('File failed malware scan');
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          mimeType,
          size: fileSize,
          extension,
        },
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Validate MIME type against allowed types
   * @param file - File buffer
   * @param allowedTypes - Array of allowed MIME types
   * @param detectedMime - Detected MIME type (optional)
   * @returns True if valid
   */
  static validateMimeType(
    file: Buffer,
    allowedTypes: string[],
    detectedMime?: string,
  ): boolean {
    if (detectedMime) {
      return allowedTypes.some(
        (type) => type === detectedMime || (type.endsWith('/*') && detectedMime.startsWith(type.slice(0, -2))),
      );
    }
    return false;
  }

  /**
   * Validate file size
   * @param size - File size in bytes
   * @param min - Minimum size (optional)
   * @param max - Maximum size (optional)
   * @returns True if valid
   */
  static validateSize(size: number, min?: number, max?: number): boolean {
    if (min !== undefined && size < min) {
      return false;
    }
    if (max !== undefined && size > max) {
      return false;
    }
    return true;
  }

  /**
   * Validate file extension
   * @param filename - File name
   * @param allowedExtensions - Array of allowed extensions
   * @returns True if valid
   */
  static validateExtension(filename: string, allowedExtensions: string[]): boolean {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return allowedExtensions.some(
      (ext) => ext.toLowerCase() === extension || ext.toLowerCase() === `.${extension}`,
    );
  }

  /**
   * Scan file for malware (placeholder - requires ClamAV integration)
   * @param file - File buffer
   * @returns True if safe
   */
  static async scanForMalware(file: Buffer): Promise<boolean> {
    // TODO: Integrate with ClamAV or other malware scanning service
    // For now, perform basic checks for suspicious patterns

    // Check for script injections in common formats
    const fileContent = file.toString('utf-8', 0, Math.min(file.length, 1024));

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onclick=/i,
      /eval\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileContent)) {
        return false;
      }
    }

    // Check for zip bombs (highly compressed files)
    const compressionRatio = file.length;
    if (compressionRatio < 100 && file.length > 100) {
      // Potential zip bomb (very small file with high compression)
      return false;
    }

    return true;
  }

  /**
   * Validate image file
   * @param file - File buffer or path
   * @param maxSize - Maximum size in bytes (default: 10MB)
   * @returns Validation result
   */
  static async validateImage(
    file: Buffer | string,
    maxSize: number = 10 * 1024 * 1024,
  ): Promise<FileValidationResult> {
    return this.validate(file, {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
      maxSize,
      checkMagicNumber: true,
    });
  }

  /**
   * Validate 3D model file
   * @param file - File buffer or path
   * @param maxSize - Maximum size in bytes (default: 500MB)
   * @returns Validation result
   */
  static async validateModel(
    file: Buffer | string,
    maxSize: number = 500 * 1024 * 1024,
  ): Promise<FileValidationResult> {
    return this.validate(file, {
      allowedMimeTypes: ['model/gltf-binary', 'model/gltf+json'],
      allowedExtensions: ['gltf', 'glb', 'obj', 'fbx'],
      maxSize,
    });
  }

  /**
   * Validate video file
   * @param file - File buffer or path
   * @param maxSize - Maximum size in bytes (default: 1GB)
   * @returns Validation result
   */
  static async validateVideo(
    file: Buffer | string,
    maxSize: number = 1024 * 1024 * 1024,
  ): Promise<FileValidationResult> {
    return this.validate(file, {
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      maxSize,
    });
  }
}
