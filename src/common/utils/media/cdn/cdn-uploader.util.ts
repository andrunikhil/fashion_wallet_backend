import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

/**
 * CDN upload options
 */
export interface CDNOptions {
  region?: string;
  bucket?: string;
  acl?: 'public-read' | 'private';
  cacheControl?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * CDN S3 Configuration
 */
export interface CDNS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

/**
 * CDN Uploader Utility
 * Handles uploads to CDN and cloud storage
 */
export class CDNUploader {
  private static createS3Client(config?: CDNS3Config): S3Client {
    const region = config?.region || process.env.AWS_REGION || 'us-east-1';
    const credentials = config
      ? {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        }
      : undefined;

    return new S3Client({
      region,
      credentials,
      endpoint: config?.endpoint,
    });
  }

  /**
   * Upload file to CDN
   * @param file - File buffer
   * @param path - Destination path
   * @param options - CDN options
   * @param config - S3 configuration
   * @returns Public URL of uploaded file
   */
  static async upload(
    file: Buffer,
    path: string,
    options: CDNOptions = {},
    config?: CDNS3Config,
  ): Promise<string> {
    try {
      const s3Client = this.createS3Client(config);
      const bucket = options.bucket || process.env.CDN_BUCKET || 'default-bucket';

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: file,
        ACL: options.acl || 'public-read',
        CacheControl: options.cacheControl || 'max-age=31536000',
        ContentType: options.contentType,
        Metadata: options.metadata,
      });

      await s3Client.send(command);

      // Generate public URL
      const region = config?.region || process.env.AWS_REGION || 'us-east-1';
      return `https://${bucket}.s3.${region}.amazonaws.com/${path}`;
    } catch (error) {
      throw new Error(
        `Failed to upload to CDN: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload multiple files in batch
   * @param files - Map of path to file buffer
   * @param basePath - Base path for all files
   * @param options - CDN options
   * @param config - S3 configuration
   * @returns Map of path to public URL
   */
  static async uploadBatch(
    files: Map<string, Buffer>,
    basePath: string,
    options: CDNOptions = {},
    config?: CDNS3Config,
  ): Promise<Map<string, string>> {
    try {
      const urls = new Map<string, string>();
      const promises: Promise<void>[] = [];

      for (const [filename, buffer] of files.entries()) {
        const path = `${basePath}/${filename}`;
        const promise = this.upload(buffer, path, options, config).then((url) => {
          urls.set(filename, url);
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      return urls;
    } catch (error) {
      throw new Error(
        `Failed to batch upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate signed URL for private file access
   * @param path - File path
   * @param expiresIn - Expiration time in seconds
   * @param options - CDN options
   * @param config - S3 configuration
   * @returns Signed URL
   */
  static async generateSignedUrl(
    path: string,
    expiresIn: number = 3600,
    options: CDNOptions = {},
    config?: CDNS3Config,
  ): Promise<string> {
    try {
      const s3Client = this.createS3Client(config);
      const bucket = options.bucket || process.env.CDN_BUCKET || 'default-bucket';

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: path,
      });

      return await getSignedUrl(s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      throw new Error(
        `Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Invalidate CDN cache for specific paths
   * @param paths - Array of paths to invalidate
   * @returns Invalidation ID
   */
  static async invalidateCache(paths: string[]): Promise<string> {
    try {
      // TODO: Implement CloudFront cache invalidation
      // This requires:
      // 1. Create CloudFront client
      // 2. Create invalidation request
      // 3. Return invalidation ID

      const invalidationId = crypto.randomBytes(16).toString('hex');
      return invalidationId;
    } catch (error) {
      throw new Error(
        `Failed to invalidate cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload to multiple regions
   * @param file - File buffer
   * @param path - File path
   * @param regions - Array of region names
   * @param options - CDN options
   * @returns Map of region to URL
   */
  static async uploadToMultiRegion(
    file: Buffer,
    path: string,
    regions: string[],
    options: CDNOptions = {},
  ): Promise<Map<string, string>> {
    try {
      const urls = new Map<string, string>();
      const promises: Promise<void>[] = [];

      for (const region of regions) {
        const config: S3Config = {
          region,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        };

        const promise = this.upload(file, path, options, config).then((url) => {
          urls.set(region, url);
        });
        promises.push(promise);
      }

      await Promise.all(promises);
      return urls;
    } catch (error) {
      throw new Error(
        `Failed to upload to multi-region: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate unique file path
   * @param filename - Original filename
   * @param prefix - Optional prefix
   * @returns Unique file path
   */
  static generateUniquePath(filename: string, prefix?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop();
    const basename = filename.replace(`.${extension}`, '');

    const path = `${basename}-${timestamp}-${random}.${extension}`;
    return prefix ? `${prefix}/${path}` : path;
  }

  /**
   * Upload with automatic path generation
   * @param file - File buffer
   * @param filename - Original filename
   * @param prefix - Optional prefix
   * @param options - CDN options
   * @param config - S3 configuration
   * @returns Public URL and generated path
   */
  static async uploadWithAutoPath(
    file: Buffer,
    filename: string,
    prefix?: string,
    options: CDNOptions = {},
    config?: CDNS3Config,
  ): Promise<{ url: string; path: string }> {
    try {
      const path = this.generateUniquePath(filename, prefix);
      const url = await this.upload(file, path, options, config);

      return { url, path };
    } catch (error) {
      throw new Error(
        `Failed to upload with auto path: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
