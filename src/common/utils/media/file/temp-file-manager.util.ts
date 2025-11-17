import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Temporary file metadata
 */
export interface TempFileMetadata {
  id: string;
  path: string;
  size: number;
  createdAt: Date;
  expiresAt: Date;
  ttl: number;
}

/**
 * Cleanup result
 */
export interface CleanupResult {
  deletedCount: number;
  freedSpace: number;
  errors: string[];
}

/**
 * Temporary File Manager Utility
 * Manages temporary files with TTL and automatic cleanup
 */
export class TempFileManager {
  private static tempDir: string = path.join(os.tmpdir(), 'fashion-wallet-temp');
  private static files: Map<string, TempFileMetadata> = new Map();
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static readonly DEFAULT_TTL = 3600000; // 1 hour in milliseconds

  /**
   * Initialize temp directory
   */
  private static async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Set custom temp directory
   * @param directory - Custom temp directory path
   */
  static setTempDirectory(directory: string): void {
    this.tempDir = directory;
  }

  /**
   * Create a temporary file with content
   * @param content - File content (Buffer or string)
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   * @param extension - Optional file extension
   * @returns Temporary file ID
   */
  static async create(
    content: Buffer | string,
    ttl: number = this.DEFAULT_TTL,
    extension?: string,
  ): Promise<string> {
    try {
      await this.ensureTempDir();

      const id = crypto.randomBytes(16).toString('hex');
      const filename = extension ? `${id}.${extension}` : id;
      const filePath = path.join(this.tempDir, filename);

      const buffer = typeof content === 'string' ? Buffer.from(content) : content;

      await fs.writeFile(filePath, buffer);

      const now = new Date();
      const metadata: TempFileMetadata = {
        id,
        path: filePath,
        size: buffer.length,
        createdAt: now,
        expiresAt: new Date(now.getTime() + ttl),
        ttl,
      };

      this.files.set(id, metadata);

      return id;
    } catch (error) {
      throw new Error(
        `Failed to create temp file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create a temporary file from an existing file
   * @param sourcePath - Source file path
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   * @returns Temporary file ID
   */
  static async createFromFile(
    sourcePath: string,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<string> {
    try {
      const content = await fs.readFile(sourcePath);
      const extension = path.extname(sourcePath).slice(1);
      return await this.create(content, ttl, extension);
    } catch (error) {
      throw new Error(
        `Failed to create temp file from source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get temporary file content
   * @param tempId - Temporary file ID
   * @returns File content buffer
   */
  static async get(tempId: string): Promise<Buffer> {
    try {
      const metadata = this.files.get(tempId);
      if (!metadata) {
        throw new Error(`Temp file not found: ${tempId}`);
      }

      // Check if file has expired
      if (new Date() > metadata.expiresAt) {
        await this.delete(tempId);
        throw new Error(`Temp file expired: ${tempId}`);
      }

      return await fs.readFile(metadata.path);
    } catch (error) {
      throw new Error(
        `Failed to get temp file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get temporary file path
   * @param tempId - Temporary file ID
   * @returns File path
   */
  static getPath(tempId: string): string | null {
    const metadata = this.files.get(tempId);
    return metadata?.path || null;
  }

  /**
   * Get temporary file metadata
   * @param tempId - Temporary file ID
   * @returns File metadata
   */
  static getMetadata(tempId: string): TempFileMetadata | null {
    return this.files.get(tempId) || null;
  }

  /**
   * Delete a temporary file
   * @param tempId - Temporary file ID
   */
  static async delete(tempId: string): Promise<void> {
    try {
      const metadata = this.files.get(tempId);
      if (!metadata) {
        return; // Already deleted or doesn't exist
      }

      try {
        await fs.unlink(metadata.path);
      } catch (error) {
        // File might already be deleted, ignore error
      }

      this.files.delete(tempId);
    } catch (error) {
      throw new Error(
        `Failed to delete temp file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extend TTL for a temporary file
   * @param tempId - Temporary file ID
   * @param additionalTtl - Additional time in milliseconds
   */
  static extend(tempId: string, additionalTtl: number): void {
    const metadata = this.files.get(tempId);
    if (!metadata) {
      throw new Error(`Temp file not found: ${tempId}`);
    }

    metadata.expiresAt = new Date(metadata.expiresAt.getTime() + additionalTtl);
    metadata.ttl += additionalTtl;
    this.files.set(tempId, metadata);
  }

  /**
   * Clean up expired temporary files
   * @returns Cleanup result
   */
  static async cleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      freedSpace: 0,
      errors: [],
    };

    const now = new Date();
    const expiredFiles: string[] = [];

    // Find expired files
    for (const [id, metadata] of this.files.entries()) {
      if (now > metadata.expiresAt) {
        expiredFiles.push(id);
      }
    }

    // Delete expired files
    for (const id of expiredFiles) {
      try {
        const metadata = this.files.get(id);
        if (metadata) {
          result.freedSpace += metadata.size;
        }
        await this.delete(id);
        result.deletedCount++;
      } catch (error) {
        result.errors.push(
          `Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return result;
  }

  /**
   * Clean up all temporary files (including non-expired)
   * @returns Cleanup result
   */
  static async cleanupAll(): Promise<CleanupResult> {
    const result: CleanupResult = {
      deletedCount: 0,
      freedSpace: 0,
      errors: [],
    };

    const allIds = Array.from(this.files.keys());

    for (const id of allIds) {
      try {
        const metadata = this.files.get(id);
        if (metadata) {
          result.freedSpace += metadata.size;
        }
        await this.delete(id);
        result.deletedCount++;
      } catch (error) {
        result.errors.push(
          `Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return result;
  }

  /**
   * Schedule automatic cleanup
   * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
   */
  static scheduleCleanup(intervalMs: number = 300000): void {
    // Clear existing interval if any
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Schedule cleanup
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop scheduled cleanup
   */
  static stopScheduledCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get statistics about temporary files
   * @returns Statistics object
   */
  static getStats(): {
    totalFiles: number;
    totalSize: number;
    expiredFiles: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    const now = new Date();
    let totalSize = 0;
    let expiredFiles = 0;
    let oldestFile: Date | null = null;
    let newestFile: Date | null = null;

    for (const metadata of this.files.values()) {
      totalSize += metadata.size;

      if (now > metadata.expiresAt) {
        expiredFiles++;
      }

      if (!oldestFile || metadata.createdAt < oldestFile) {
        oldestFile = metadata.createdAt;
      }

      if (!newestFile || metadata.createdAt > newestFile) {
        newestFile = metadata.createdAt;
      }
    }

    return {
      totalFiles: this.files.size,
      totalSize,
      expiredFiles,
      oldestFile,
      newestFile,
    };
  }

  /**
   * List all temporary files
   * @param includeExpired - Include expired files (default: true)
   * @returns Array of temp file metadata
   */
  static list(includeExpired: boolean = true): TempFileMetadata[] {
    const now = new Date();
    const files: TempFileMetadata[] = [];

    for (const metadata of this.files.values()) {
      if (includeExpired || now <= metadata.expiresAt) {
        files.push({ ...metadata });
      }
    }

    return files.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Check if temp file exists and is not expired
   * @param tempId - Temporary file ID
   * @returns True if exists and not expired
   */
  static exists(tempId: string): boolean {
    const metadata = this.files.get(tempId);
    if (!metadata) {
      return false;
    }

    const now = new Date();
    return now <= metadata.expiresAt;
  }
}
