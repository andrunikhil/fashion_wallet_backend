# Architecture Document: Storage Infrastructure

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-infra-01
**Related Spec**: spec-infra-01

---

## 1. Executive Summary

This architecture document describes the implementation design for the storage infrastructure, including object storage (S3/MinIO), CDN integration, file processing pipelines, and media handling for the Fashion Wallet backend.

---

## 2. Architectural Overview

### 2.1 Storage Tiers

```
┌─────────────────────────────────────────────────────────┐
│                    CDN Layer (CloudFront)               │
│         Global edge caching for static assets           │
└──────────────────────┬──────────────────────────────────┘
                       │ (Cache Miss)
┌──────────────────────▼──────────────────────────────────┐
│              Object Storage (S3/MinIO)                  │
│  - User uploads       - 3D models      - Exports        │
│  - Catalog assets     - Textures       - Thumbnails     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│           Processing Layer (Job Queue)                  │
│  - Image optimization  - Model conversion               │
│  - Thumbnail generation - Format conversion             │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture

### 3.1 Module Structure

```
src/infrastructure/storage/
├── storage.module.ts
├── services/
│   ├── storage.service.ts          # Main storage service
│   ├── upload.service.ts           # File upload handling
│   ├── cdn.service.ts              # CDN operations
│   ├── image-processing.service.ts # Image manipulation
│   ├── model-processing.service.ts # 3D model processing
│   └── presigned-url.service.ts    # URL generation
├── processors/
│   ├── image.processor.ts          # Image job processor
│   ├── model.processor.ts          # 3D model processor
│   └── video.processor.ts          # Video generation
├── entities/
│   └── file-metadata.entity.ts     # File metadata
├── interfaces/
│   ├── storage.interface.ts
│   ├── processor.interface.ts
│   └── cdn.interface.ts
└── config/
    ├── s3.config.ts
    ├── minio.config.ts
    └── cdn.config.ts
```

### 3.2 Storage Service Architecture

```typescript
/**
 * Main storage service with provider abstraction
 */
@Injectable()
export class StorageService {
  private provider: IStorageProvider;

  constructor(
    @Inject('STORAGE_CONFIG') private config: StorageConfig,
    private fileMetadataRepository: FileMetadataRepository,
    private queueService: QueueService
  ) {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): IStorageProvider {
    if (this.config.provider === 's3') {
      return new S3Provider(this.config.s3);
    } else if (this.config.provider === 'minio') {
      return new MinIOProvider(this.config.minio);
    }
    throw new Error(`Unsupported storage provider: ${this.config.provider}`);
  }

  /**
   * Upload file with automatic processing
   */
  async uploadFile(params: UploadFileParams): Promise<FileMetadata> {
    // 1. Validate file
    await this.validateFile(params.file);

    // 2. Generate unique key
    const key = this.generateFileKey(params);

    // 3. Upload to storage
    const uploadResult = await this.provider.putObject({
      bucket: params.bucket,
      key,
      body: params.file.buffer,
      contentType: params.file.mimetype,
      metadata: params.metadata
    });

    // 4. Save metadata
    const fileMetadata = await this.fileMetadataRepository.create({
      bucket: params.bucket,
      key,
      originalName: params.file.originalname,
      size: params.file.size,
      mimeType: params.file.mimetype,
      userId: params.userId,
      category: params.category,
      status: 'uploaded'
    });

    // 5. Queue processing job
    if (params.autoProcess) {
      await this.queueProcessingJob(fileMetadata);
    }

    return fileMetadata;
  }

  /**
   * Generate secure pre-signed URLs
   */
  async getPresignedUrl(params: {
    fileId: string;
    expiresIn?: number;
    operation: 'get' | 'put';
  }): Promise<string> {
    const file = await this.fileMetadataRepository.findById(params.fileId);
    if (!file) {
      throw new NotFoundError('File', params.fileId);
    }

    return this.provider.getPresignedUrl({
      bucket: file.bucket,
      key: file.key,
      expiresIn: params.expiresIn || 3600,
      operation: params.operation
    });
  }
}
```

---

## 4. CDN Integration

### 4.1 CDN Architecture

```
User Request → CDN Edge → Origin (S3)
     ↓
  ┌────────────┐
  │ CloudFront │
  │   Edge     │ ← Cache Hit (Fast)
  └─────┬──────┘
        │ Cache Miss
  ┌─────▼──────┐
  │     S3     │
  │   Origin   │
  └────────────┘
```

### 4.2 CDN Service Implementation

```typescript
@Injectable()
export class CDNService {
  private cloudfront: CloudFrontClient;

  constructor(@Inject('CDN_CONFIG') private config: CDNConfig) {
    this.cloudfront = new CloudFrontClient({
      region: config.region,
      credentials: config.credentials
    });
  }

  /**
   * Get CDN URL for file
   */
  getCDNUrl(key: string, transforms?: ImageTransforms): string {
    const baseUrl = this.config.distributionDomain;
    const path = this.buildPath(key, transforms);
    return `https://${baseUrl}/${path}`;
  }

  /**
   * Invalidate CDN cache
   */
  async invalidate(paths: string[]): Promise<string> {
    const command = new CreateInvalidationCommand({
      DistributionId: this.config.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths
        },
        CallerReference: Date.now().toString()
      }
    });

    const response = await this.cloudfront.send(command);
    return response.Invalidation.Id;
  }

  /**
   * Build path with image transformations
   */
  private buildPath(key: string, transforms?: ImageTransforms): string {
    if (!transforms) return key;

    const params = new URLSearchParams();
    if (transforms.width) params.set('w', transforms.width.toString());
    if (transforms.height) params.set('h', transforms.height.toString());
    if (transforms.format) params.set('fm', transforms.format);
    if (transforms.quality) params.set('q', transforms.quality.toString());

    return `${key}?${params.toString()}`;
  }
}
```

---

## 5. File Processing Pipeline

### 5.1 Processing Architecture

```
Upload → Queue Job → Process → Store Variants → Update Metadata
   ↓                    ↓              ↓
Original           Resize         Thumbnail
                   Convert        Multiple Sizes
                   Compress       WebP/AVIF
```

### 5.2 Image Processor Implementation

```typescript
/**
 * Image processing service using Sharp
 */
@Injectable()
export class ImageProcessingService {
  /**
   * Process uploaded image
   */
  async processImage(params: {
    fileId: string;
    operations: ImageOperation[];
  }): Promise<ProcessedImage[]> {
    const file = await this.fileMetadataRepository.findById(params.fileId);
    const buffer = await this.storageService.downloadFile(file.key);

    const results: ProcessedImage[] = [];

    for (const operation of params.operations) {
      const processed = await this.applyOperation(buffer, operation);
      const key = this.generateVariantKey(file.key, operation);

      // Upload variant
      await this.storageService.uploadBuffer({
        bucket: file.bucket,
        key,
        buffer: processed,
        contentType: this.getContentType(operation.format)
      });

      results.push({
        key,
        operation: operation.type,
        size: processed.length
      });
    }

    // Update file metadata with variants
    await this.fileMetadataRepository.update(params.fileId, {
      status: 'ready',
      processedAt: new Date(),
      variants: results
    });

    return results;
  }

  /**
   * Apply image operation using Sharp
   */
  private async applyOperation(
    buffer: Buffer,
    operation: ImageOperation
  ): Promise<Buffer> {
    let image = sharp(buffer);

    switch (operation.type) {
      case 'resize':
        image = image.resize(operation.width, operation.height, {
          fit: operation.fit || 'cover',
          withoutEnlargement: true
        });
        break;

      case 'convert':
        image = image.toFormat(operation.format, {
          quality: operation.quality || 90
        });
        break;

      case 'compress':
        image = image.jpeg({ quality: operation.quality || 85 });
        break;

      case 'thumbnail':
        image = image.resize(operation.size, operation.size, {
          fit: 'cover'
        });
        break;
    }

    return image.toBuffer();
  }
}
```

---

## 6. Multipart Upload

### 6.1 Multipart Upload Flow

```typescript
/**
 * Handle large file uploads with multipart
 */
@Injectable()
export class MultipartUploadService {
  /**
   * Initiate multipart upload
   */
  async initiateUpload(params: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    userId: string;
  }): Promise<MultipartUploadResponse> {
    const key = this.generateFileKey(params);
    const bucket = this.getBucketForCategory(params);

    // Initiate S3 multipart upload
    const uploadId = await this.provider.createMultipartUpload({
      bucket,
      key,
      contentType: params.mimeType
    });

    // Calculate parts
    const partSize = 10 * 1024 * 1024; // 10 MB
    const partCount = Math.ceil(params.fileSize / partSize);

    // Generate pre-signed URLs for each part
    const uploadUrls = await this.generatePartUrls({
      bucket,
      key,
      uploadId,
      partCount
    });

    // Store upload session
    await this.uploadSessionRepository.create({
      uploadId,
      userId: params.userId,
      bucket,
      key,
      partCount,
      status: 'initiated'
    });

    return {
      uploadId,
      uploadUrls,
      partSize,
      partCount
    };
  }

  /**
   * Complete multipart upload
   */
  async completeUpload(params: {
    uploadId: string;
    parts: UploadedPart[];
  }): Promise<FileMetadata> {
    const session = await this.uploadSessionRepository.findByUploadId(
      params.uploadId
    );

    // Complete S3 multipart upload
    await this.provider.completeMultipartUpload({
      bucket: session.bucket,
      key: session.key,
      uploadId: params.uploadId,
      parts: params.parts
    });

    // Create file metadata
    const fileMetadata = await this.fileMetadataRepository.create({
      bucket: session.bucket,
      key: session.key,
      userId: session.userId,
      size: this.calculateTotalSize(params.parts),
      status: 'uploaded'
    });

    // Cleanup session
    await this.uploadSessionRepository.delete(session.id);

    return fileMetadata;
  }
}
```

---

## 7. Security

### 7.1 Access Control

```typescript
/**
 * File access control service
 */
@Injectable()
export class FileAccessControlService {
  /**
   * Check if user can access file
   */
  async canAccess(params: {
    userId: string;
    fileId: string;
    operation: 'read' | 'write' | 'delete';
  }): Promise<boolean> {
    const file = await this.fileMetadataRepository.findById(params.fileId);

    // Owner check
    if (file.userId === params.userId) {
      return true;
    }

    // Public file check
    if (file.visibility === 'public' && params.operation === 'read') {
      return true;
    }

    // Shared access check
    const sharedAccess = await this.sharedAccessRepository.findOne({
      fileId: params.fileId,
      sharedWithUserId: params.userId
    });

    if (sharedAccess && sharedAccess.permissions.includes(params.operation)) {
      return true;
    }

    return false;
  }

  /**
   * Generate temporary access token
   */
  async grantTemporaryAccess(params: {
    fileId: string;
    userId: string;
    expiresIn: number;
  }): Promise<string> {
    const token = TokenUtil.generateToken();

    await this.temporaryAccessRepository.create({
      token,
      fileId: params.fileId,
      userId: params.userId,
      expiresAt: DateUtil.addSeconds(new Date(), params.expiresIn)
    });

    return token;
  }
}
```

---

## 8. Monitoring

### 8.1 Storage Metrics

```typescript
@Injectable()
export class StorageMetricsService {
  /**
   * Collect storage metrics
   */
  async collectMetrics(): Promise<StorageMetrics> {
    return {
      totalFiles: await this.fileMetadataRepository.count(),
      totalSize: await this.getTotalStorageSize(),
      byCategory: await this.getStorageByCategory(),
      uploadRate: await this.getUploadRate(),
      downloadRate: await this.getDownloadRate(),
      processingQueue: await this.getProcessingQueueSize(),
      cdnMetrics: {
        hitRate: await this.cdnService.getCacheHitRate(),
        bandwidth: await this.cdnService.getBandwidthUsage()
      }
    };
  }

  /**
   * Monitor storage usage
   */
  async monitorUsage(userId: string): Promise<UsageMetrics> {
    const files = await this.fileMetadataRepository.findByUser(userId);

    return {
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      byType: this.groupByType(files),
      quota: await this.getQuotaForUser(userId),
      remaining: await this.getRemainingQuota(userId)
    };
  }
}
```

---

## 9. Deployment

### 9.1 Environment Configuration

```yaml
Development:
  Provider: MinIO (local)
  CDN: Disabled
  Processing: Synchronous

Staging:
  Provider: AWS S3
  CDN: CloudFront (staging distribution)
  Processing: Queue-based
  Backup: Daily

Production:
  Provider: AWS S3
  Buckets:
    - fashion-wallet-avatars (Multi-region)
    - fashion-wallet-catalog (Multi-region)
    - fashion-wallet-designs (Multi-region)
  CDN: CloudFront (global distribution)
  Processing: Queue-based with auto-scaling
  Backup: Continuous + Daily snapshots
  Lifecycle: Automated transitions to cheaper storage
```

---

## 10. Performance Optimization

### 10.1 Optimization Strategies

```yaml
Upload Optimization:
  - Multipart uploads for large files (>100MB)
  - Client-side validation before upload
  - Progress tracking and resume capability
  - Parallel chunk uploads

Download Optimization:
  - CDN edge caching (90%+ hit rate target)
  - Pre-signed URLs to bypass application
  - Range requests for partial downloads
  - Compression (gzip/brotli)

Processing Optimization:
  - Queue-based async processing
  - Batch processing for similar operations
  - Auto-scaling workers based on queue depth
  - Caching of processed variants
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: arch-infra-00

---

**End of Storage Infrastructure Architecture Document**
