/**
 * S3 Utility
 * AWS S3 storage operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3UploadOptions,
  S3DownloadOptions,
  S3SignedUrlOptions,
  S3DeleteOptions,
  S3CopyOptions,
  S3BatchUploadOptions,
  S3UploadResult,
} from '../../types/media.types';

export class S3Util {
  private static client: S3Client;

  /**
   * Initialize S3 client
   * @param region - AWS region
   * @param credentials - AWS credentials (optional, uses default credential chain if not provided)
   */
  static initialize(
    region: string = 'us-east-1',
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    },
  ): void {
    this.client = new S3Client({
      region,
      credentials,
    });
  }

  /**
   * Get S3 client instance (lazy initialization)
   * @returns S3Client instance
   */
  private static getClient(): S3Client {
    if (!this.client) {
      this.initialize();
    }
    return this.client;
  }

  /**
   * Upload file to S3
   * @param data - File buffer
   * @param options - Upload options
   * @returns Upload result
   */
  static async upload(
    data: Buffer,
    options: S3UploadOptions,
  ): Promise<S3UploadResult> {
    try {
      const client = this.getClient();

      const command = new PutObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
        Body: data,
        ContentType: options.contentType,
        Metadata: options.metadata,
        ACL: options.acl,
        CacheControl: options.cacheControl,
      });

      const response = await client.send(command);

      const url = `https://${options.bucket}.s3.amazonaws.com/${options.key}`;

      return {
        bucket: options.bucket,
        key: options.key,
        url,
        etag: response.ETag,
        versionId: response.VersionId,
      };
    } catch (error) {
      throw new Error(`Failed to upload to S3: ${error.message}`);
    }
  }

  /**
   * Upload file from local path
   * @param filePath - Local file path
   * @param options - Upload options
   * @returns Upload result
   */
  static async uploadFromFile(
    filePath: string,
    options: S3UploadOptions,
  ): Promise<S3UploadResult> {
    const fs = await import('fs');
    const data = await fs.promises.readFile(filePath);
    return this.upload(data, options);
  }

  /**
   * Download file from S3
   * @param options - Download options
   * @returns File buffer
   */
  static async download(options: S3DownloadOptions): Promise<Buffer> {
    try {
      const client = this.getClient();

      const command = new GetObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
      });

      const response = await client.send(command);

      if (!response.Body) {
        throw new Error('No data returned from S3');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      throw new Error(`Failed to download from S3: ${error.message}`);
    }
  }

  /**
   * Download file to local path
   * @param options - Download options
   * @param outputPath - Local output path
   */
  static async downloadToFile(
    options: S3DownloadOptions,
    outputPath: string,
  ): Promise<void> {
    const fs = await import('fs');
    const data = await this.download(options);
    await fs.promises.writeFile(outputPath, data);
  }

  /**
   * Generate signed URL for S3 object
   * @param options - Signed URL options
   * @returns Signed URL
   */
  static async generateSignedUrl(
    options: S3SignedUrlOptions,
  ): Promise<string> {
    try {
      const client = this.getClient();

      const command =
        options.operation === 'putObject'
          ? new PutObjectCommand({
              Bucket: options.bucket,
              Key: options.key,
            })
          : new GetObjectCommand({
              Bucket: options.bucket,
              Key: options.key,
            });

      const expiresIn = options.expiresIn ?? 3600; // Default 1 hour

      const signedUrl = await getSignedUrl(client, command, { expiresIn });

      return signedUrl;
    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete file from S3
   * @param options - Delete options
   */
  static async delete(options: S3DeleteOptions): Promise<void> {
    try {
      const client = this.getClient();

      const command = new DeleteObjectCommand({
        Bucket: options.bucket,
        Key: options.key,
      });

      await client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  /**
   * Copy file within S3
   * @param options - Copy options
   * @returns New object key
   */
  static async copy(options: S3CopyOptions): Promise<string> {
    try {
      const client = this.getClient();

      const command = new CopyObjectCommand({
        Bucket: options.destinationBucket,
        Key: options.destinationKey,
        CopySource: `${options.sourceBucket}/${options.sourceKey}`,
      });

      await client.send(command);

      return options.destinationKey;
    } catch (error) {
      throw new Error(`Failed to copy in S3: ${error.message}`);
    }
  }

  /**
   * Check if object exists in S3
   * @param bucket - S3 bucket name
   * @param key - Object key
   * @returns True if object exists
   */
  static async exists(bucket: string, key: string): Promise<boolean> {
    try {
      const client = this.getClient();

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw new Error(`Failed to check S3 object existence: ${error.message}`);
    }
  }

  /**
   * Get object metadata
   * @param bucket - S3 bucket name
   * @param key - Object key
   * @returns Object metadata
   */
  static async getMetadata(
    bucket: string,
    key: string,
  ): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
    etag?: string;
    metadata?: Record<string, string>;
  }> {
    try {
      const client = this.getClient();

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        metadata: response.Metadata,
      };
    } catch (error) {
      throw new Error(`Failed to get S3 object metadata: ${error.message}`);
    }
  }

  /**
   * Batch upload multiple files
   * @param options - Batch upload options
   * @returns Array of upload results
   */
  static async batchUpload(
    options: S3BatchUploadOptions,
  ): Promise<S3UploadResult[]> {
    const results: S3UploadResult[] = [];

    for (const file of options.files) {
      try {
        const result = await this.upload(file.data, {
          bucket: options.bucket,
          key: file.key,
          contentType: file.contentType,
          metadata: file.metadata,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.key}:`, error.message);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Batch delete multiple files
   * @param bucket - S3 bucket name
   * @param keys - Array of object keys to delete
   */
  static async batchDelete(bucket: string, keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.delete({ bucket, key });
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error.message);
        // Continue with other files
      }
    }
  }

  /**
   * Get public URL for S3 object
   * @param bucket - S3 bucket name
   * @param key - Object key
   * @param region - AWS region (optional)
   * @returns Public URL
   */
  static getPublicUrl(
    bucket: string,
    key: string,
    region?: string,
  ): string {
    if (region) {
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }

  /**
   * Upload with progress tracking
   * @param data - File buffer
   * @param options - Upload options
   * @param onProgress - Progress callback
   * @returns Upload result
   */
  static async uploadWithProgress(
    data: Buffer,
    options: S3UploadOptions,
    onProgress?: (progress: number) => void,
  ): Promise<S3UploadResult> {
    // For simple uploads, we can't track progress easily
    // This would require using the Upload class from @aws-sdk/lib-storage
    // For now, just call upload and invoke callback with 100%
    const result = await this.upload(data, options);
    if (onProgress) {
      onProgress(100);
    }
    return result;
  }
}
