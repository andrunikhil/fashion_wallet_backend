import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';

/**
 * Part ETag interface
 */
export interface PartETag {
  PartNumber: number;
  ETag: string;
}

/**
 * Multipart upload state
 */
export interface MultipartUploadState {
  uploadId: string;
  bucket: string;
  key: string;
  parts: PartETag[];
  totalSize: number;
  uploadedSize: number;
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
 * Multipart Handler Utility
 * Handles low-level multipart upload operations for large files
 */
export class MultipartHandler {
  private static uploads: Map<string, MultipartUploadState> = new Map();

  /**
   * Create S3 client
   * @param config - S3 configuration
   * @returns S3 client
   */
  private static createS3Client(config?: S3Config): S3Client {
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
   * Initiate a multipart upload
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @param totalSize - Total file size
   * @param config - S3 configuration
   * @param metadata - Optional metadata
   * @param contentType - Optional content type
   * @returns Upload ID
   */
  static async initiate(
    bucket: string,
    key: string,
    totalSize: number,
    config?: S3Config,
    metadata?: Record<string, string>,
    contentType?: string,
  ): Promise<string> {
    try {
      const s3Client = this.createS3Client(config);

      const command = new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        Metadata: metadata,
        ContentType: contentType,
      });

      const response = await s3Client.send(command);
      const uploadId = response.UploadId;

      if (!uploadId) {
        throw new Error('Failed to initiate multipart upload');
      }

      // Store upload state
      const state: MultipartUploadState = {
        uploadId,
        bucket,
        key,
        parts: [],
        totalSize,
        uploadedSize: 0,
      };
      this.uploads.set(uploadId, state);

      return uploadId;
    } catch (error) {
      throw new Error(
        `Failed to initiate multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload a single part
   * @param uploadId - Multipart upload ID
   * @param partNumber - Part number (1-indexed)
   * @param data - Part data buffer
   * @param config - S3 configuration
   * @returns Part ETag
   */
  static async uploadPart(
    uploadId: string,
    partNumber: number,
    data: Buffer,
    config?: S3Config,
  ): Promise<PartETag> {
    try {
      const state = this.uploads.get(uploadId);
      if (!state) {
        throw new Error(`Upload ID not found: ${uploadId}`);
      }

      const s3Client = this.createS3Client(config);

      const command = new UploadPartCommand({
        Bucket: state.bucket,
        Key: state.key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: data,
      });

      const response = await s3Client.send(command);

      if (!response.ETag) {
        throw new Error(`Failed to upload part ${partNumber}`);
      }

      const partETag: PartETag = {
        PartNumber: partNumber,
        ETag: response.ETag,
      };

      // Update state
      state.parts.push(partETag);
      state.uploadedSize += data.length;
      this.uploads.set(uploadId, state);

      return partETag;
    } catch (error) {
      throw new Error(
        `Failed to upload part ${partNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Upload multiple parts in parallel
   * @param uploadId - Multipart upload ID
   * @param parts - Array of part data with part numbers
   * @param config - S3 configuration
   * @param concurrency - Number of concurrent uploads (default: 4)
   * @returns Array of part ETags
   */
  static async uploadPartsParallel(
    uploadId: string,
    parts: Array<{ partNumber: number; data: Buffer }>,
    config?: S3Config,
    concurrency: number = 4,
  ): Promise<PartETag[]> {
    const results: PartETag[] = [];

    // Process parts in batches for controlled concurrency
    for (let i = 0; i < parts.length; i += concurrency) {
      const batch = parts.slice(i, i + concurrency);
      const batchPromises = batch.map((part) =>
        this.uploadPart(uploadId, part.partNumber, part.data, config),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Complete multipart upload
   * @param uploadId - Multipart upload ID
   * @param parts - Array of part ETags (optional if tracked internally)
   * @param config - S3 configuration
   * @returns S3 object location
   */
  static async complete(
    uploadId: string,
    parts?: PartETag[],
    config?: S3Config,
  ): Promise<string> {
    try {
      const state = this.uploads.get(uploadId);
      if (!state) {
        throw new Error(`Upload ID not found: ${uploadId}`);
      }

      const s3Client = this.createS3Client(config);

      // Use provided parts or state parts
      const sortedParts = (parts || state.parts).sort(
        (a, b) => a.PartNumber - b.PartNumber,
      );

      const command = new CompleteMultipartUploadCommand({
        Bucket: state.bucket,
        Key: state.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sortedParts,
        },
      });

      const response = await s3Client.send(command);

      // Clean up state
      this.uploads.delete(uploadId);

      return response.Location || `s3://${state.bucket}/${state.key}`;
    } catch (error) {
      throw new Error(
        `Failed to complete multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Abort multipart upload and clean up
   * @param uploadId - Multipart upload ID
   * @param config - S3 configuration
   */
  static async abort(uploadId: string, config?: S3Config): Promise<void> {
    try {
      const state = this.uploads.get(uploadId);
      if (!state) {
        throw new Error(`Upload ID not found: ${uploadId}`);
      }

      const s3Client = this.createS3Client(config);

      const command = new AbortMultipartUploadCommand({
        Bucket: state.bucket,
        Key: state.key,
        UploadId: uploadId,
      });

      await s3Client.send(command);

      // Clean up state
      this.uploads.delete(uploadId);
    } catch (error) {
      throw new Error(
        `Failed to abort multipart upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * List uploaded parts for a multipart upload
   * @param uploadId - Multipart upload ID
   * @param config - S3 configuration
   * @returns Array of part ETags
   */
  static async listParts(
    uploadId: string,
    config?: S3Config,
  ): Promise<PartETag[]> {
    try {
      const state = this.uploads.get(uploadId);
      if (!state) {
        throw new Error(`Upload ID not found: ${uploadId}`);
      }

      const s3Client = this.createS3Client(config);

      const command = new ListPartsCommand({
        Bucket: state.bucket,
        Key: state.key,
        UploadId: uploadId,
      });

      const response = await s3Client.send(command);

      if (!response.Parts) {
        return [];
      }

      return response.Parts.map((part) => ({
        PartNumber: part.PartNumber || 0,
        ETag: part.ETag || '',
      }));
    } catch (error) {
      throw new Error(
        `Failed to list parts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get upload state
   * @param uploadId - Multipart upload ID
   * @returns Upload state or null
   */
  static getUploadState(uploadId: string): MultipartUploadState | null {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * Get upload progress percentage
   * @param uploadId - Multipart upload ID
   * @returns Progress percentage (0-100)
   */
  static getProgress(uploadId: string): number {
    const state = this.uploads.get(uploadId);
    if (!state || state.totalSize === 0) {
      return 0;
    }

    return Math.round((state.uploadedSize / state.totalSize) * 100);
  }

  /**
   * Split file buffer into parts for multipart upload
   * @param buffer - File buffer
   * @param partSize - Size of each part (default: 5MB, min: 5MB)
   * @returns Array of part buffers with part numbers
   */
  static splitIntoParts(
    buffer: Buffer,
    partSize: number = 5 * 1024 * 1024,
  ): Array<{ partNumber: number; data: Buffer }> {
    const minPartSize = 5 * 1024 * 1024; // 5MB minimum for S3
    const actualPartSize = Math.max(partSize, minPartSize);

    const parts: Array<{ partNumber: number; data: Buffer }> = [];
    let offset = 0;
    let partNumber = 1;

    while (offset < buffer.length) {
      const end = Math.min(offset + actualPartSize, buffer.length);
      const partData = buffer.slice(offset, end);

      parts.push({
        partNumber,
        data: partData,
      });

      offset = end;
      partNumber++;
    }

    return parts;
  }

  /**
   * Clean up all upload states
   */
  static clearAllStates(): void {
    this.uploads.clear();
  }
}
