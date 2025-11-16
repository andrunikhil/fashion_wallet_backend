# Infrastructure Specification: Storage Layer

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Infrastructure Specification
**Status**: Draft
**Spec ID**: spec-infra-01

---

## 1. Executive Summary

This specification defines the storage infrastructure for the Fashion Wallet backend, covering object storage (S3/MinIO), file management, CDN integration, and media processing. The infrastructure must handle photos, 3D models, textures, and user-generated content with high performance and reliability.

---

## 2. Storage Architecture Overview

### 2.1 Storage Types

```yaml
Object Storage (Primary):
  Technology: S3-compatible (AWS S3 / MinIO)
  Purpose:
    - User photos (avatar creation)
    - 3D models (GLTF, FBX, OBJ)
    - Textures and materials
    - Design exports
    - Catalog assets
    - Generated renders

  Characteristics:
    - Scalable (petabyte-scale)
    - Durable (99.999999999%)
    - Versioned
    - Encrypted
    - Globally accessible

Temporary Storage:
  Technology: Local filesystem / tmpfs
  Purpose:
    - Processing workspace
    - Upload staging
    - Render generation
    - Format conversion

  Characteristics:
    - Fast (SSD/RAM)
    - Ephemeral (auto-cleanup)
    - Limited size
    - Local to processing nodes

CDN Storage (Cache):
  Technology: CloudFront / Cloudflare
  Purpose:
    - Static asset delivery
    - Image optimization
    - 3D model streaming
    - Global distribution

  Characteristics:
    - Low latency (< 50ms)
    - High bandwidth
    - Edge caching
    - Auto-scaling
```

---

## 3. Object Storage Infrastructure

### 3.1 Bucket Organization

#### 3.1.1 Bucket Structure

```yaml
Production Buckets:
  fashion-wallet-avatars:
    Purpose: Avatar-related files
    Structure:
      /photos/
        /{user-id}/
          /original/{timestamp}-{filename}
          /processed/{timestamp}-{filename}
      /models/
        /{user-id}/
          /{avatar-id}/
            /model.gltf
            /textures/
            /thumbnails/

  fashion-wallet-catalog:
    Purpose: Catalog assets
    Structure:
      /silhouettes/
        /{category}/
          /{item-id}/
            /model.gltf
            /preview.png
            /variants/
      /fabrics/
        /{category}/
          /{fabric-id}/
            /diffuse.jpg
            /normal.jpg
            /roughness.jpg
      /patterns/
        /{category}/
          /{pattern-id}/
            /tile.png
            /preview.png

  fashion-wallet-designs:
    Purpose: User designs
    Structure:
      /{user-id}/
        /{design-id}/
          /saves/
            /v{version}.json
          /exports/
            /image/{timestamp}-{name}.png
            /video/{timestamp}-{name}.mp4
            /model/{timestamp}-{name}.gltf
          /renders/
            /{timestamp}-{view}.png

  fashion-wallet-temp:
    Purpose: Temporary processing files
    Lifecycle: Auto-delete after 24 hours
    Structure:
      /uploads/{session-id}/
      /processing/{job-id}/
      /renders/{job-id}/

Development/Staging Buckets:
  - fashion-wallet-dev-*
  - fashion-wallet-staging-*
```

#### 3.1.2 Naming Conventions

```yaml
File Naming:
  Format: {timestamp}-{uuid}-{original-name}.{ext}
  Example: 1699876543-a1b2c3d4-avatar-photo.jpg

  Components:
    timestamp: Unix timestamp (seconds)
    uuid: Short UUID (8 chars)
    original-name: Sanitized original filename
    ext: File extension (lowercase)

  Sanitization Rules:
    - Lowercase only
    - Replace spaces with hyphens
    - Remove special characters (keep: a-z, 0-9, -, _)
    - Maximum length: 100 characters
    - Prevent path traversal (no ../)
```

### 3.2 Storage Configuration

#### 3.2.1 S3/MinIO Configuration

```typescript
interface StorageConfig {
  provider: 's3' | 'minio';

  // Connection settings
  endpoint?: string;              // For MinIO or custom S3 endpoint
  region: string;                 // e.g., 'us-east-1'
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };

  // Client configuration
  options: {
    apiVersion: '2006-03-01';
    signatureVersion: 'v4';
    s3ForcePathStyle: boolean;    // true for MinIO
    maxRetries: 3;
    httpOptions: {
      timeout: 300000;            // 5 minutes
      connectTimeout: 5000;       // 5 seconds
    };
  };

  // Upload defaults
  uploadConfig: {
    partSize: 5 * 1024 * 1024;    // 5 MB
    queueSize: 4;                 // Concurrent parts
    serverSideEncryption: 'AES256';
    storageClass: 'STANDARD' | 'INTELLIGENT_TIERING';
  };
}
```

#### 3.2.2 Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fashion-wallet-catalog/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": ["cloudfront-ips"]
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::fashion-wallet-*/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

### 3.3 File Upload Infrastructure

#### 3.3.1 Upload Flow

```typescript
/**
 * Multi-step upload process
 */
interface UploadFlow {
  // Step 1: Request upload URL
  requestUpload: {
    input: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      purpose: 'avatar' | 'design' | 'catalog';
    };
    output: {
      uploadId: string;
      uploadUrl: string;          // Pre-signed URL
      expiresIn: number;          // Seconds
      maxSize: number;            // Bytes
    };
  };

  // Step 2: Upload file
  uploadFile: {
    method: 'PUT';
    url: 'uploadUrl from step 1';
    headers: {
      'Content-Type': string;
      'Content-Length': number;
    };
    body: File | Buffer;
  };

  // Step 3: Confirm upload
  confirmUpload: {
    input: {
      uploadId: string;
      checksum: string;           // MD5 or SHA-256
    };
    output: {
      fileId: string;
      fileUrl: string;
      status: 'processing' | 'ready';
    };
  };
}
```

#### 3.3.2 Multipart Upload (Large Files)

```typescript
interface MultipartUploadConfig {
  // Enable for files > 100 MB
  threshold: 100 * 1024 * 1024;   // 100 MB

  // Part configuration
  partSize: 10 * 1024 * 1024;     // 10 MB per part
  maxParts: 10000;                // S3 limit
  concurrentParts: 4;             // Parallel uploads

  // Progress tracking
  onProgress: (progress: {
    loaded: number;
    total: number;
    part: number;
    percentage: number;
  }) => void;

  // Error handling
  retryStrategy: {
    maxRetries: 3;
    retryDelay: 1000;             // Initial delay in ms
    backoffMultiplier: 2;
  };
}

// Implementation interface
interface IMultipartUploadService {
  initiateUpload(params: InitiateParams): Promise<UploadId>;
  uploadPart(params: PartParams): Promise<PartETag>;
  completeUpload(params: CompleteParams): Promise<FileMetadata>;
  abortUpload(uploadId: string): Promise<void>;
  listParts(uploadId: string): Promise<PartInfo[]>;
}
```

#### 3.3.3 Upload Validation

```typescript
interface UploadValidation {
  // File type validation
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    models: ['model/gltf-binary', 'model/gltf+json', 'model/obj', 'model/fbx'],
    videos: ['video/mp4', 'video/webm'],
    documents: ['application/pdf']
  };

  // Size limits (bytes)
  maxFileSizes: {
    avatar_photo: 10 * 1024 * 1024,      // 10 MB
    design_export: 50 * 1024 * 1024,      // 50 MB
    model_3d: 100 * 1024 * 1024,          // 100 MB
    video_render: 500 * 1024 * 1024       // 500 MB
  };

  // Content validation
  validateContent: {
    checkMagicBytes: true;        // Verify file type from content
    scanVirus: true;              // ClamAV integration
    validateStructure: true;      // Validate file format
  };

  // Security
  sanitizeFilename: true;
  preventPathTraversal: true;
  checksumVerification: 'md5' | 'sha256';
}
```

### 3.4 Pre-signed URLs

#### 3.4.1 URL Generation

```typescript
interface PresignedUrlService {
  /**
   * Generate pre-signed URL for upload
   */
  generateUploadUrl(params: {
    bucket: string;
    key: string;
    expiresIn: number;            // Seconds (max 604800 = 7 days)
    contentType: string;
    maxSize: number;
    metadata?: Record<string, string>;
  }): Promise<string>;

  /**
   * Generate pre-signed URL for download
   */
  generateDownloadUrl(params: {
    bucket: string;
    key: string;
    expiresIn: number;            // Seconds
    responseHeaders?: {
      'Content-Disposition'?: string;
      'Content-Type'?: string;
      'Cache-Control'?: string;
    };
  }): Promise<string>;

  /**
   * Generate batch pre-signed URLs
   */
  generateBatchUrls(params: {
    operations: Array<{
      bucket: string;
      key: string;
      operation: 'get' | 'put';
      expiresIn: number;
    }>;
  }): Promise<Map<string, string>>;
}
```

#### 3.4.2 URL Security

```typescript
interface PresignedUrlSecurity {
  // Expiration limits
  maxExpirationTime: {
    upload: 3600,                 // 1 hour
    download: 86400,              // 24 hours
    public_asset: 604800          // 7 days
  };

  // IP restrictions (optional)
  ipWhitelist?: string[];

  // Content-Type enforcement
  enforceContentType: true;

  // Size restrictions
  maxContentLength?: number;

  // Custom conditions
  conditions?: Array<{
    key: string;
    value: string | number;
    operator: 'eq' | 'starts-with' | 'content-length-range';
  }>;
}
```

### 3.5 File Metadata Management

#### 3.5.1 Metadata Structure

```typescript
interface FileMetadata {
  // Identity
  fileId: string;                 // UUID
  bucket: string;
  key: string;
  originalName: string;

  // File properties
  size: number;                   // Bytes
  mimeType: string;
  extension: string;
  checksum: {
    md5: string;
    etag: string;
  };

  // Ownership
  userId: string;
  uploadedAt: Date;
  uploadedBy: string;

  // Classification
  category: 'avatar' | 'catalog' | 'design' | 'temp';
  purpose: string;
  tags: string[];

  // Processing
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  processedAt?: Date;
  processingError?: string;

  // Access
  visibility: 'private' | 'public' | 'shared';
  accessCount: number;
  lastAccessedAt?: Date;

  // Lifecycle
  expiresAt?: Date;
  deletedAt?: Date;

  // Relations
  relatedFiles: Array<{
    fileId: string;
    relationship: 'thumbnail' | 'variant' | 'source' | 'derived';
  }>;

  // Custom metadata
  custom: Record<string, any>;
}
```

#### 3.5.2 Metadata Storage

```sql
-- PostgreSQL table for file metadata
CREATE TABLE shared.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- S3 information
  bucket VARCHAR(255) NOT NULL,
  key VARCHAR(1024) NOT NULL,
  original_name VARCHAR(255) NOT NULL,

  -- File properties
  size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  extension VARCHAR(10) NOT NULL,
  checksum_md5 VARCHAR(32) NOT NULL,
  checksum_etag VARCHAR(255),

  -- Ownership
  user_id UUID NOT NULL REFERENCES shared.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Classification
  category VARCHAR(50) NOT NULL,
  purpose VARCHAR(100),
  tags TEXT[],

  -- Processing
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded',
  processed_at TIMESTAMPTZ,
  processing_error TEXT,

  -- Access
  visibility VARCHAR(20) DEFAULT 'private',
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,

  -- Lifecycle
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Custom metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT chk_files_status CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')),
  CONSTRAINT chk_files_visibility CHECK (visibility IN ('private', 'public', 'shared'))
);

-- Indexes
CREATE INDEX idx_files_user_id ON shared.files(user_id, created_at DESC);
CREATE INDEX idx_files_bucket_key ON shared.files(bucket, key);
CREATE INDEX idx_files_status ON shared.files(status) WHERE status = 'processing';
CREATE INDEX idx_files_expires ON shared.files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_files_tags ON shared.files USING GIN(tags);
CREATE INDEX idx_files_metadata ON shared.files USING GIN(metadata);
```

---

## 4. CDN Integration

### 4.1 CDN Configuration

#### 4.1.1 Distribution Setup

```typescript
interface CDNConfig {
  provider: 'cloudfront' | 'cloudflare';

  // Distribution settings
  distribution: {
    domainName: string;           // e.g., cdn.fashionwallet.com
    aliases: string[];            // CNAME aliases
    enabled: true;
    priceClass: 'all' | 'use-only-us-eu' | 'use-only-north-america';
  };

  // Origin configuration
  origins: Array<{
    id: string;
    domainName: string;           // S3 bucket domain
    originPath?: string;          // Optional path prefix
    customHeaders?: Record<string, string>;
    s3OriginConfig?: {
      originAccessIdentity: string;
    };
  }>;

  // Cache behavior
  cacheBehaviors: Array<{
    pathPattern: string;          // e.g., /images/*
    targetOriginId: string;
    viewerProtocolPolicy: 'allow-all' | 'https-only' | 'redirect-to-https';
    allowedMethods: ('GET' | 'HEAD' | 'OPTIONS' | 'PUT' | 'POST' | 'PATCH' | 'DELETE')[];
    cachedMethods: ('GET' | 'HEAD' | 'OPTIONS')[];
    compress: boolean;
    ttl: {
      min: number;                // Seconds
      default: number;
      max: number;
    };
  }>;

  // SSL/TLS
  ssl: {
    certificateArn: string;
    minimumProtocolVersion: 'TLSv1.2_2021';
    sslSupportMethod: 'sni-only';
  };
}
```

#### 4.1.2 Cache Strategy

```yaml
Cache Rules:
  Static Assets:
    Pattern: /catalog/*, /static/*
    TTL: 31536000 (1 year)
    Headers: Cache-Control: public, max-age=31536000, immutable
    Compression: Enabled

  User Uploads:
    Pattern: /avatars/*, /designs/*
    TTL: 86400 (24 hours)
    Headers: Cache-Control: private, max-age=86400
    Compression: Enabled

  Dynamic Content:
    Pattern: /api/*
    TTL: 0 (no cache)
    Headers: Cache-Control: no-cache, no-store, must-revalidate

  Images (Optimized):
    Pattern: /images/*
    TTL: 2592000 (30 days)
    Headers: Cache-Control: public, max-age=2592000
    Compression: Enabled
    Transform: Auto WebP conversion

  3D Models:
    Pattern: /models/*
    TTL: 604800 (7 days)
    Headers: Cache-Control: public, max-age=604800
    Compression: Enabled (gzip for GLTF)
```

### 4.2 Image Optimization

#### 4.2.1 On-the-Fly Transformations

```typescript
interface ImageTransformService {
  /**
   * Transform image on-the-fly via CDN
   * URL format: https://cdn.example.com/image.jpg?w=800&h=600&fit=cover&fm=webp
   */
  transform(params: {
    sourceUrl: string;
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    format?: 'jpeg' | 'png' | 'webp' | 'avif';
    quality?: number;             // 1-100
    blur?: number;                // Blur radius
    sharpen?: number;             // Sharpen amount
    grayscale?: boolean;
    rotate?: number;              // Degrees
    flip?: 'h' | 'v' | 'both';
  }): string;

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(params: {
    sourceUrl: string;
    widths: number[];             // e.g., [320, 640, 1024, 1920]
    format?: string;
  }): string;

  /**
   * Generate image variants
   */
  generateVariants(params: {
    sourceUrl: string;
    variants: Array<{
      name: string;
      width: number;
      height?: number;
      quality?: number;
    }>;
  }): Promise<Map<string, string>>;
}
```

#### 4.2.2 Image Processing Pipeline

```yaml
Processing Steps:
  1. Upload:
     - Receive original image
     - Store in S3 original bucket
     - Trigger processing

  2. Validation:
     - Check file type
     - Verify dimensions
     - Scan for malware
     - Extract EXIF

  3. Optimization:
     - Strip metadata (privacy)
     - Auto-orient based on EXIF
     - Compress (quality 85-90)
     - Generate multiple sizes:
       - thumbnail: 150x150
       - small: 320xAuto
       - medium: 640xAuto
       - large: 1024xAuto
       - original: unchanged

  4. Format Conversion:
     - Generate WebP version
     - Generate AVIF (optional)
     - Keep original format

  5. Storage:
     - Store all variants
     - Update metadata
     - Invalidate CDN cache

  6. Notification:
     - Emit event
     - Update status
     - Notify user
```

### 4.3 Cache Invalidation

#### 4.3.1 Invalidation Strategies

```typescript
interface CacheInvalidationService {
  /**
   * Invalidate specific paths
   */
  invalidate(params: {
    paths: string[];              // e.g., ['/images/user-123/*']
    waitForCompletion?: boolean;
  }): Promise<InvalidationId>;

  /**
   * Invalidate by tag
   */
  invalidateByTag(params: {
    tags: string[];               // e.g., ['user-123', 'avatar-456']
  }): Promise<InvalidationId>;

  /**
   * Invalidate all cache (use sparingly)
   */
  invalidateAll(): Promise<InvalidationId>;

  /**
   * Check invalidation status
   */
  getInvalidationStatus(invalidationId: string): Promise<{
    status: 'InProgress' | 'Completed';
    createdAt: Date;
    completedAt?: Date;
  }>;
}
```

#### 4.3.2 Cache Versioning

```typescript
/**
 * Version-based cache busting
 */
interface CacheVersioning {
  // Append version to URL
  // Example: /images/avatar.jpg?v=1699876543

  generateVersionedUrl(params: {
    path: string;
    version?: string | number;    // Auto-generate if not provided
  }): string;

  // Update version on file change
  bumpVersion(fileId: string): Promise<string>;

  // Get current version
  getCurrentVersion(fileId: string): Promise<string>;
}
```

---

## 5. File Processing Infrastructure

### 5.1 Image Processing

#### 5.1.1 Image Processing Service

```typescript
interface ImageProcessingService {
  /**
   * Resize image
   */
  resize(params: {
    input: Buffer | string;       // Buffer or file path
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill';
    withoutEnlargement?: boolean;
  }): Promise<Buffer>;

  /**
   * Convert format
   */
  convert(params: {
    input: Buffer | string;
    format: 'jpeg' | 'png' | 'webp' | 'avif';
    quality?: number;
  }): Promise<Buffer>;

  /**
   * Compress image
   */
  compress(params: {
    input: Buffer | string;
    quality?: number;             // 1-100
    lossless?: boolean;
  }): Promise<Buffer>;

  /**
   * Extract metadata
   */
  getMetadata(input: Buffer | string): Promise<{
    format: string;
    width: number;
    height: number;
    space: string;
    channels: number;
    depth: string;
    density: number;
    hasAlpha: boolean;
    orientation?: number;
    exif?: Record<string, any>;
  }>;

  /**
   * Remove background
   */
  removeBackground(input: Buffer | string): Promise<Buffer>;

  /**
   * Generate thumbnail
   */
  thumbnail(params: {
    input: Buffer | string;
    size: number;                 // Square thumbnail
    quality?: number;
  }): Promise<Buffer>;
}
```

#### 5.1.2 Image Processing Queue

```typescript
/**
 * Queue-based image processing for heavy operations
 */
interface ImageProcessingJob {
  jobId: string;
  fileId: string;
  operations: Array<{
    type: 'resize' | 'convert' | 'compress' | 'thumbnail' | 'remove-bg';
    params: Record<string, any>;
    outputKey: string;
  }>;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Processing queue configuration
interface ImageQueueConfig {
  concurrency: 4;                 // Concurrent jobs
  timeout: 60000;                 // 60 seconds per job
  retries: 3;
  removeOnComplete: 100;          // Keep last 100 completed
  removeOnFail: 1000;             // Keep last 1000 failed
}
```

### 5.2 3D Model Processing

#### 5.2.1 Model Processing Service

```typescript
interface ModelProcessingService {
  /**
   * Optimize 3D model
   */
  optimize(params: {
    input: string;                // File path or URL
    outputFormat: 'gltf' | 'glb';
    options: {
      compress?: boolean;         // Draco compression
      maxTextureSize?: number;    // Max 2048x2048
      decimationRatio?: number;   // 0-1, reduce poly count
      generateLODs?: boolean;     // Level of detail
    };
  }): Promise<{
    outputPath: string;
    originalSize: number;
    optimizedSize: number;
    stats: {
      vertices: number;
      faces: number;
      textures: number;
    };
  }>;

  /**
   * Convert model format
   */
  convert(params: {
    input: string;
    inputFormat: 'obj' | 'fbx' | 'gltf' | 'glb';
    outputFormat: 'gltf' | 'glb' | 'obj';
  }): Promise<string>;

  /**
   * Generate model thumbnail
   */
  generateThumbnail(params: {
    modelPath: string;
    size: { width: number; height: number };
    cameraAngle?: { x: number; y: number; z: number };
    format?: 'png' | 'jpeg';
  }): Promise<Buffer>;

  /**
   * Validate model
   */
  validate(modelPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    stats: {
      vertices: number;
      faces: number;
      textures: number;
      animations: number;
    };
  }>;

  /**
   * Extract model metadata
   */
  getMetadata(modelPath: string): Promise<{
    format: string;
    version: string;
    generator: string;
    copyright?: string;
    boundingBox: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
    stats: {
      vertices: number;
      faces: number;
      meshes: number;
      materials: number;
      textures: number;
    };
  }>;
}
```

### 5.3 Video Processing

#### 5.3.1 Video Generation Service

```typescript
interface VideoGenerationService {
  /**
   * Generate 360-degree turntable video
   */
  generateTurntable(params: {
    modelPath: string;
    avatarId?: string;
    duration: number;             // Seconds
    fps: 30 | 60;
    resolution: '720p' | '1080p' | '4k';
    format: 'mp4' | 'webm';
    quality: 'low' | 'medium' | 'high';
  }): Promise<string>;

  /**
   * Generate promotional video
   */
  generatePromo(params: {
    scenes: Array<{
      modelPath: string;
      duration: number;
      cameraPath: CameraKeyframe[];
      transitions?: string;
    }>;
    audio?: string;               // Background music
    watermark?: string;           // Logo/watermark
  }): Promise<string>;

  /**
   * Convert video format
   */
  convertVideo(params: {
    input: string;
    outputFormat: 'mp4' | 'webm' | 'mov';
    resolution?: string;
    fps?: number;
    quality?: number;
  }): Promise<string>;
}
```

---

## 6. Storage Lifecycle Management

### 6.1 Object Lifecycle Policies

```typescript
interface LifecyclePolicy {
  rules: Array<{
    id: string;
    enabled: boolean;
    prefix: string;               // e.g., 'temp/' or 'designs/exports/'

    // Transition rules
    transitions?: Array<{
      days: number;
      storageClass: 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
    }>;

    // Expiration rules
    expiration?: {
      days?: number;
      date?: Date;
      expiredObjectDeleteMarker?: boolean;
    };

    // Non-current version expiration
    noncurrentVersionExpiration?: {
      noncurrentDays: number;
    };

    // Abort incomplete multipart uploads
    abortIncompleteMultipartUpload?: {
      daysAfterInitiation: number;
    };
  }>;
}

// Example policies
const lifecyclePolicies: LifecyclePolicy = {
  rules: [
    {
      id: 'delete-temp-files',
      enabled: true,
      prefix: 'temp/',
      expiration: { days: 1 }
    },
    {
      id: 'archive-old-exports',
      enabled: true,
      prefix: 'designs/exports/',
      transitions: [
        { days: 30, storageClass: 'STANDARD_IA' },
        { days: 90, storageClass: 'GLACIER' }
      ]
    },
    {
      id: 'cleanup-multipart',
      enabled: true,
      prefix: '',
      abortIncompleteMultipartUpload: { daysAfterInitiation: 7 }
    }
  ]
};
```

### 6.2 Versioning

```typescript
interface VersioningConfig {
  enabled: boolean;
  mfaDelete?: boolean;            // Require MFA for deletion

  // Version retention
  retentionPolicy?: {
    keepVersions: number;         // Number of versions to keep
    keepDays: number;             // Days to keep versions
  };

  // Cleanup old versions
  cleanupPolicy?: {
    deleteAfterDays: number;
    keepMinimumVersions: number;
  };
}
```

### 6.3 Storage Analytics

```typescript
interface StorageAnalytics {
  /**
   * Get storage usage statistics
   */
  getUsageStats(params: {
    bucket?: string;
    prefix?: string;
    groupBy?: 'bucket' | 'prefix' | 'storageClass' | 'user';
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalSize: number;
    objectCount: number;
    breakdown: Array<{
      category: string;
      size: number;
      count: number;
      percentage: number;
    }>;
  }>;

  /**
   * Get access patterns
   */
  getAccessPatterns(params: {
    bucket: string;
    timeRange: 'day' | 'week' | 'month';
  }): Promise<{
    totalRequests: number;
    getRequests: number;
    putRequests: number;
    deleteRequests: number;
    bytesDownloaded: number;
    bytesUploaded: number;
    topObjects: Array<{
      key: string;
      accessCount: number;
    }>;
  }>;

  /**
   * Get cost estimates
   */
  getCostEstimate(params: {
    bucket?: string;
    timeRange: 'month' | 'year';
  }): Promise<{
    storageCost: number;
    requestCost: number;
    dataTransferCost: number;
    totalCost: number;
    projectedCost: number;
  }>;
}
```

---

## 7. Security and Access Control

### 7.1 Access Control Lists (ACL)

```typescript
interface FileAccessControl {
  /**
   * Set file permissions
   */
  setPermissions(params: {
    fileId: string;
    acl: {
      owner: string;              // User ID
      grants: Array<{
        grantee: string | 'public' | 'authenticated';
        permission: 'read' | 'write' | 'full-control';
      }>;
    };
  }): Promise<void>;

  /**
   * Check file access
   */
  checkAccess(params: {
    fileId: string;
    userId: string;
    permission: 'read' | 'write' | 'delete';
  }): Promise<boolean>;

  /**
   * Generate temporary access
   */
  grantTemporaryAccess(params: {
    fileId: string;
    userId: string;
    expiresIn: number;            // Seconds
    permissions: ('read' | 'write')[];
  }): Promise<{
    accessToken: string;
    expiresAt: Date;
  }>;
}
```

### 7.2 Encryption

```yaml
Encryption Requirements:
  At Rest:
    Method: Server-side encryption (SSE-S3 or SSE-KMS)
    Algorithm: AES-256
    Key Management: AWS KMS or custom key
    Enabled: All buckets

  In Transit:
    Protocol: TLS 1.3
    Enforcement: Deny non-HTTPS requests
    Certificate: Valid SSL certificate

  Client-Side (Optional):
    For sensitive data
    Encrypt before upload
    Decrypt after download
```

### 7.3 Virus Scanning

```typescript
interface VirusScanService {
  /**
   * Scan uploaded file
   */
  scanFile(params: {
    bucket: string;
    key: string;
  }): Promise<{
    clean: boolean;
    threats: string[];
    scanDate: Date;
  }>;

  /**
   * Quarantine infected file
   */
  quarantine(params: {
    bucket: string;
    key: string;
    reason: string;
  }): Promise<void>;

  /**
   * Get scan history
   */
  getScanHistory(fileId: string): Promise<Array<{
    scanDate: Date;
    result: 'clean' | 'infected' | 'suspicious';
    threats: string[];
  }>>;
}
```

---

## 8. Monitoring and Logging

### 8.1 Metrics

```yaml
Storage Metrics:
  Usage:
    - Total storage size
    - Object count by bucket
    - Growth rate
    - Storage class distribution

  Performance:
    - Upload throughput
    - Download throughput
    - Request latency (p50, p95, p99)
    - Error rates

  Cost:
    - Storage costs by bucket
    - Request costs
    - Data transfer costs
    - Trends and forecasts

  Operations:
    - Upload success rate
    - Processing success rate
    - CDN hit rate
    - Cache efficiency
```

### 8.2 Logging

```typescript
interface StorageLogging {
  // Access logs
  accessLogs: {
    enabled: boolean;
    bucket: string;               // Log storage bucket
    prefix: string;               // Log file prefix
    fields: [
      'timestamp',
      'requester',
      'bucket',
      'key',
      'operation',
      'status',
      'bytes',
      'latency'
    ];
  };

  // Error logs
  errorLogs: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info';
    destinations: ['cloudwatch', 'elasticsearch'];
  };

  // Audit logs
  auditLogs: {
    enabled: boolean;
    events: [
      'upload',
      'download',
      'delete',
      'permission_change',
      'encryption_change'
    ];
  };
}
```

---

## 9. Implementation Requirements

### 9.1 Storage Module Structure

```typescript
@Module({
  providers: [
    StorageService,
    FileUploadService,
    FileProcessingService,
    ImageProcessingService,
    ModelProcessingService,
    CDNService,
    StorageHealthService
  ],
  exports: [
    StorageService,
    FileUploadService,
    CDNService
  ]
})
export class StorageModule {}
```

### 9.2 Service Interfaces

```typescript
interface IStorageService {
  // Upload operations
  uploadFile(params: UploadParams): Promise<FileMetadata>;
  uploadMultipart(params: MultipartParams): Promise<FileMetadata>;

  // Download operations
  downloadFile(fileId: string): Promise<Buffer>;
  getFileUrl(fileId: string, expiresIn?: number): Promise<string>;

  // File operations
  deleteFile(fileId: string): Promise<void>;
  copyFile(sourceId: string, destKey: string): Promise<FileMetadata>;
  moveFile(sourceId: string, destKey: string): Promise<FileMetadata>;

  // Metadata operations
  getMetadata(fileId: string): Promise<FileMetadata>;
  updateMetadata(fileId: string, metadata: Partial<FileMetadata>): Promise<void>;

  // List operations
  listFiles(params: ListParams): Promise<FileList>;

  // Health check
  healthCheck(): Promise<boolean>;
}
```

---

## 10. Testing Requirements

```yaml
Unit Tests:
  - File upload/download
  - Metadata management
  - Pre-signed URL generation
  - File validation
  - Error handling

Integration Tests:
  - S3/MinIO connectivity
  - CDN invalidation
  - Image processing pipeline
  - 3D model processing
  - Multipart uploads

Performance Tests:
  - Large file uploads
  - Concurrent uploads
  - Download throughput
  - CDN cache hit rate
  - Processing queue throughput
```

---

## 11. Success Criteria

```yaml
Acceptance Criteria:
  - File upload success rate > 99.9%
  - Download latency < 100ms (with CDN)
  - Image processing < 5 seconds
  - 3D model optimization < 30 seconds
  - CDN cache hit rate > 90%
  - Storage costs optimized with lifecycle policies
  - All files encrypted at rest
  - Virus scanning 100% coverage
  - Monitoring dashboards operational
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-infra-00 (Database)

---

**End of Storage Infrastructure Specification**
