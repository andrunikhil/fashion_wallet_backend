import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

/**
 * Upload result interface
 */
export interface UploadResult {
  key: string;
  bucket: string;
  location: string;
  etag: string;
  size: number;
  uploadId?: string;
}

/**
 * Upload progress interface
 */
export interface UploadProgress {
  uploadId: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

/**
 * Chunked upload options
 */
export interface ChunkedUploadOptions {
  bucket: string;
  key: string;
  chunkSize?: number; // Default: 5MB
  concurrency?: number; // Default: 4
  onProgress?: (progress: UploadProgress) => void;
  metadata?: Record<string, string>;
  contentType?: string;
}

/**
 * S3 Configuration
 */
export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

/**
 * File Uploader Utility
 * Handles single and chunked file uploads to S3-compatible storage
 */
export class FileUploader {
  private static uploadProgress: Map<string, UploadProgress> = new Map();

  /**
   * Create S3 client
   * @param config - S3 configuration
   * @returns S3 client
   */
  private static createS3Client(config?: S3Config): S3Client {
    // Use environment variables if config not provided
    const region = config?.region || process.env.AWS_REGION || 'us-east-1';
    const credentials = config ? {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    } : undefined;

    return new S3Client({
      region,
      credentials,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Upload a single file to S3
   * @param file - File buffer or path
   * @param destination - S3 destination (bucket/key)
   * @param config - S3 configuration
   * @returns Upload result
   */
  static async uploadSingle(
    file: Buffer | string,
    destination: string,
    config?: S3Config,
  ): Promise<UploadResult> {
    try {
      const s3Client = this.createS3Client(config);
      const [bucket, ...keyParts] = destination.split('/');
      const key = keyParts.join('/');

      let buffer: Buffer;
      let fileSize: number;

      // Load file if path is provided
      if (typeof file === 'string') {
        buffer = await fs.readFile(file);
        const stats = await fs.stat(file);
        fileSize = stats.size;
      } else {
        buffer = file;
        fileSize = buffer.length;
      }

      const params: PutObjectCommandInput = {
        Bucket: bucket,
        Key: key,
        Body: buffer,
      };

      const command = new PutObjectCommand(params);
      const response = await s3Client.send(command);

      return {
        key,
        bucket,
        location: `s3://${bucket}/${key}`,
        etag: response.ETag || '',
        size: fileSize,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload file using chunked/multipart upload
   * @param file - File buffer or path
   * @param options - Chunked upload options
   * @param config - S3 configuration
   * @returns Upload result
   */
  static async uploadChunked(
    file: Buffer | string,
    options: ChunkedUploadOptions,
    config?: S3Config,
  ): Promise<UploadResult> {
    try {
      const s3Client = this.createS3Client(config);
      const uploadId = crypto.randomBytes(16).toString('hex');

      let buffer: Buffer;
      let fileSize: number;

      // Load file if path is provided
      if (typeof file === 'string') {
        buffer = await fs.readFile(file);
        const stats = await fs.stat(file);
        fileSize = stats.size;
      } else {
        buffer = file;
        fileSize = buffer.length;
      }

      // Initialize progress tracking
      const progress: UploadProgress = {
        uploadId,
        loaded: 0,
        total: fileSize,
        percentage: 0,
        status: 'pending',
      };
      this.uploadProgress.set(uploadId, progress);

      // Use AWS SDK's Upload for automatic multipart handling
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: options.bucket,
          Key: options.key,
          Body: buffer,
          Metadata: options.metadata,
          ContentType: options.contentType,
        },
        queueSize: options.concurrency || 4,
        partSize: options.chunkSize || 5 * 1024 * 1024, // 5MB default
        leavePartsOnError: false,
      });

      // Track progress
      upload.on('httpUploadProgress', (progressEvent) => {
        const loaded = progressEvent.loaded || 0;
        const total = progressEvent.total || fileSize;
        const percentage = Math.round((loaded / total) * 100);

        const updatedProgress: UploadProgress = {
          uploadId,
          loaded,
          total,
          percentage,
          status: 'uploading',
        };

        this.uploadProgress.set(uploadId, updatedProgress);

        if (options.onProgress) {
          options.onProgress(updatedProgress);
        }
      });

      progress.status = 'uploading';
      const response = await upload.done();

      // Update final progress
      const completedProgress: UploadProgress = {
        uploadId,
        loaded: fileSize,
        total: fileSize,
        percentage: 100,
        status: 'completed',
      };
      this.uploadProgress.set(uploadId, completedProgress);

      if (options.onProgress) {
        options.onProgress(completedProgress);
      }

      return {
        key: options.key,
        bucket: options.bucket,
        location: response.Location || `s3://${options.bucket}/${options.key}`,
        etag: response.ETag || '',
        size: fileSize,
        uploadId,
      };
    } catch (error) {
      // Update progress to failed
      const failedProgress = this.uploadProgress.get(crypto.randomBytes(16).toString('hex'));
      if (failedProgress) {
        failedProgress.status = 'failed';
      }

      throw new Error(
        `Failed to upload file (chunked): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Track upload progress by upload ID
   * @param uploadId - Upload ID
   * @returns Upload progress
   */
  static async trackProgress(uploadId: string): Promise<UploadProgress | null> {
    return this.uploadProgress.get(uploadId) || null;
  }

  /**
   * Resume upload (Note: AWS SDK Upload handles resumption internally)
   * @param uploadId - Upload ID
   * @returns Upload result
   */
  static async resumeUpload(uploadId: string): Promise<UploadResult> {
    // AWS SDK's Upload class handles resumption automatically
    // This method is a placeholder for future enhancement
    throw new Error('Upload resumption requires storing upload state - not yet implemented');
  }

  /**
   * Upload multiple files in parallel
   * @param files - Array of files (buffer or path)
   * @param destinations - Array of S3 destinations
   * @param config - S3 configuration
   * @returns Array of upload results
   */
  static async uploadBatch(
    files: (Buffer | string)[],
    destinations: string[],
    config?: S3Config,
  ): Promise<UploadResult[]> {
    if (files.length !== destinations.length) {
      throw new Error('Files and destinations arrays must have the same length');
    }

    const uploadPromises = files.map((file, index) =>
      this.uploadSingle(file, destinations[index], config),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Generate a unique key for file upload
   * @param filename - Original filename
   * @param prefix - Optional prefix
   * @returns Unique key
   */
  static generateUniqueKey(filename: string, prefix?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop();
    const basename = filename.replace(`.${extension}`, '');

    const key = `${basename}-${timestamp}-${random}.${extension}`;

    return prefix ? `${prefix}/${key}` : key;
  }

  /**
   * Clean up progress tracking for completed uploads
   * @param uploadId - Upload ID
   */
  static clearProgress(uploadId: string): void {
    this.uploadProgress.delete(uploadId);
  }

  /**
   * Clear all progress tracking
   */
  static clearAllProgress(): void {
    this.uploadProgress.clear();
  }
}
