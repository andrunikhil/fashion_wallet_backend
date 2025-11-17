/**
 * File Utility
 * File operations and validation
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import {
  FileValidationOptions,
  FileValidationResult,
  HashOptions,
} from '../../types/media.types';

export class FileUtil {
  /**
   * Validate a file
   * @param input - File buffer
   * @param options - Validation options
   * @returns Validation result
   */
  static async validate(
    input: Buffer,
    options: FileValidationOptions = {},
  ): Promise<FileValidationResult> {
    const errors: string[] = [];

    try {
      const fileSize = input.length;

      // Check file size
      if (options.maxSize && fileSize > options.maxSize) {
        errors.push(
          `File size ${fileSize} bytes exceeds maximum ${options.maxSize} bytes`,
        );
      }

      if (options.minSize && fileSize < options.minSize) {
        errors.push(
          `File size ${fileSize} bytes is below minimum ${options.minSize} bytes`,
        );
      }

      // Detect MIME type
      const fileType = await fileTypeFromBuffer(input);
      const mimeType = fileType?.mime;

      // Check MIME type
      if (
        options.allowedMimeTypes &&
        options.allowedMimeTypes.length > 0 &&
        mimeType
      ) {
        if (!options.allowedMimeTypes.includes(mimeType)) {
          errors.push(
            `Invalid MIME type: ${mimeType}. Allowed: ${options.allowedMimeTypes.join(', ')}`,
          );
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        mimeType,
        size: fileSize,
      };
    } catch (error) {
      errors.push(`Failed to validate file: ${error.message}`);
      return {
        valid: false,
        errors,
        size: input.length,
      };
    }
  }

  /**
   * Detect MIME type of a file
   * @param input - File buffer
   * @returns MIME type
   */
  static async getMimeType(input: Buffer): Promise<string | undefined> {
    try {
      const fileType = await fileTypeFromBuffer(input);
      return fileType?.mime;
    } catch (error) {
      throw new Error(`Failed to detect MIME type: ${error.message}`);
    }
  }

  /**
   * Get file extension from MIME type
   * @param mimeType - MIME type
   * @returns File extension (without dot)
   */
  static getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/avif': 'avif',
      'image/tiff': 'tiff',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'model/gltf+json': 'gltf',
      'model/gltf-binary': 'glb',
      'application/zip': 'zip',
      'application/json': 'json',
    };

    return mimeMap[mimeType] || 'bin';
  }

  /**
   * Generate unique filename
   * @param prefix - Filename prefix
   * @param extension - File extension (without dot)
   * @returns Unique filename
   */
  static generateUniqueFilename(
    prefix: string = 'file',
    extension?: string,
  ): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = extension ? `.${extension}` : '';

    return `${prefix}_${timestamp}_${random}${ext}`;
  }

  /**
   * Generate filename from hash
   * @param input - File buffer
   * @param extension - File extension (without dot)
   * @param algorithm - Hash algorithm
   * @returns Filename based on hash
   */
  static async generateHashFilename(
    input: Buffer,
    extension?: string,
    algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256',
  ): Promise<string> {
    const hash = await this.calculateHash(input, { algorithm });
    const ext = extension ? `.${extension}` : '';
    return `${hash}${ext}`;
  }

  /**
   * Calculate file hash
   * @param input - File buffer
   * @param options - Hash options
   * @returns Hash string
   */
  static async calculateHash(
    input: Buffer,
    options: HashOptions = {},
  ): Promise<string> {
    const algorithm = options.algorithm || 'sha256';

    try {
      const hash = crypto.createHash(algorithm);
      hash.update(input);
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Failed to calculate hash: ${error.message}`);
    }
  }

  /**
   * Calculate MD5 hash
   * @param input - File buffer
   * @returns MD5 hash
   */
  static async calculateMD5(input: Buffer): Promise<string> {
    return this.calculateHash(input, { algorithm: 'md5' });
  }

  /**
   * Calculate SHA256 hash
   * @param input - File buffer
   * @returns SHA256 hash
   */
  static async calculateSHA256(input: Buffer): Promise<string> {
    return this.calculateHash(input, { algorithm: 'sha256' });
  }

  /**
   * Read file from disk
   * @param filePath - Path to file
   * @returns File buffer
   */
  static async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write file to disk
   * @param filePath - Path to file
   * @param data - Data to write
   */
  static async writeFile(filePath: string, data: Buffer): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.promises.mkdir(dir, { recursive: true });

      await fs.promises.writeFile(filePath, data);
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * Delete file from disk
   * @param filePath - Path to file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if file exists
   * @param filePath - Path to file
   * @returns True if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   * @param filePath - Path to file
   * @returns File size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Failed to get file size: ${error.message}`);
    }
  }

  /**
   * Ensure directory exists
   * @param dirPath - Path to directory
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Create a read stream
   * @param filePath - Path to file
   * @returns Read stream
   */
  static createReadStream(filePath: string): fs.ReadStream {
    return fs.createReadStream(filePath);
  }

  /**
   * Create a write stream
   * @param filePath - Path to file
   * @returns Write stream
   */
  static createWriteStream(filePath: string): fs.WriteStream {
    return fs.createWriteStream(filePath);
  }

  /**
   * Format file size for display
   * @param bytes - File size in bytes
   * @param decimals - Number of decimal places
   * @returns Formatted file size
   */
  static formatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * Sanitize filename (remove unsafe characters)
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  static sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Get file extension
   * @param filename - Filename
   * @returns File extension (without dot)
   */
  static getExtension(filename: string): string {
    const ext = path.extname(filename);
    return ext.startsWith('.') ? ext.slice(1) : ext;
  }

  /**
   * Get filename without extension
   * @param filename - Filename
   * @returns Filename without extension
   */
  static getBasename(filename: string): string {
    return path.basename(filename, path.extname(filename));
  }
}
