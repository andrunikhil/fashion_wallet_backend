import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  fileSize: number;
}

/**
 * Storage Service
 * Handles file uploads to S3-compatible storage
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly publicUrl: string;

  constructor() {
    // Initialize S3 client with environment variables
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'fashion-wallet-exports';
    this.publicUrl = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      // Support for S3-compatible services (like MinIO)
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
  }

  /**
   * Upload a file from local path to S3
   */
  async uploadFile(
    localPath: string,
    key: string,
    contentType?: string,
  ): Promise<UploadResult> {
    try {
      // Get file stats
      const stats = await fs.stat(localPath);
      const fileSize = stats.size;

      // Read file
      const fileStream = createReadStream(localPath);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ACL: 'public-read', // Make files publicly accessible
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`Uploaded file to S3: ${key} (${fileSize} bytes)`);

      return {
        url,
        key,
        bucket: this.bucket,
        fileSize,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Upload buffer to S3
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType?: string,
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${key}`;
      const fileSize = buffer.length;

      this.logger.log(`Uploaded buffer to S3: ${key} (${fileSize} bytes)`);

      return {
        url,
        key,
        bucket: this.bucket,
        fileSize,
      };
    } catch (error) {
      this.logger.error(`Failed to upload buffer to S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Deleted file from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for: ${key}`, error);
      throw error;
    }
  }

  /**
   * Generate S3 key for export files
   */
  generateExportKey(
    userId: string,
    designId: string,
    exportType: string,
    extension: string,
  ): string {
    const timestamp = Date.now();
    return `exports/${userId}/${designId}/${exportType}-${timestamp}.${extension}`;
  }

  /**
   * Generate S3 key for render cache
   */
  generateRenderKey(
    designId: string,
    preset: string,
    extension: string,
  ): string {
    const timestamp = Date.now();
    return `renders/${designId}/${preset}-${timestamp}.${extension}`;
  }
}
