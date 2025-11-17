# Implementation Plan: File Processing & Media Utilities (arch-utils-02)

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Implementation Plan
**Status**: Draft
**Plan ID**: plan-utils-02
**Related Arch**: arch-utils-02
**Parent Plan**: plan.md (Fashion Wallet Implementation Plan)

---

## 1. Executive Summary

This implementation plan outlines the development of file processing and media utilities for the Fashion Wallet backend. These utilities will provide comprehensive support for handling images, 3D models, textures, videos, and other media types essential for avatar creation, catalog management, and design exports.

**Timeline**: 3-4 weeks
**Priority**: High (Critical for avatar and catalog services)
**Dependencies**: arch-utils-00 (Core Utilities), arch-infra-01 (Storage Infrastructure)

---

## 2. Scope & Objectives

### 2.1 In Scope

```yaml
File Processing:
  - File upload handling and validation
  - MIME type detection and verification
  - File size and dimension validation
  - Multi-part upload support
  - Temporary file management

Image Processing:
  - Image resizing and cropping
  - Format conversion (JPEG, PNG, WebP)
  - Thumbnail generation
  - Image optimization and compression
  - EXIF data extraction and manipulation
  - Color analysis and palette extraction
  - Background removal integration

3D Model Processing:
  - 3D model validation (GLTF, OBJ, FBX)
  - Model optimization and compression (Draco)
  - LOD (Level of Detail) generation
  - Model format conversion
  - Texture extraction and processing
  - Model metadata extraction
  - Bounding box calculation

Video Processing:
  - Video encoding and transcoding
  - Thumbnail extraction from video
  - Video compression
  - 360° turntable video generation
  - Format conversion (MP4, WebM)
  - Video metadata extraction

Texture & Pattern Processing:
  - Texture tiling validation
  - Normal map generation
  - PBR texture processing
  - UV map validation
  - Texture compression

Media CDN Integration:
  - CDN upload utilities
  - Signed URL generation
  - Cache invalidation helpers
  - Multi-region upload support
```

### 2.2 Out of Scope

- Real-time video streaming (future phase)
- Advanced AI-based image processing (Phase 4 feature)
- Audio processing (not required for MVP)
- Live video processing

### 2.3 Objectives

1. **Performance**: Process images <500ms, 3D models <2s
2. **Reliability**: 99.9% success rate for file operations
3. **Security**: Comprehensive file validation, malware scanning
4. **Scalability**: Support parallel processing up to 100 concurrent operations
5. **Quality**: Maintain visual quality while optimizing file sizes
6. **Flexibility**: Support multiple formats and transformations

---

## 3. Architecture Overview

### 3.1 Utility Organization

```
src/common/utils/media/
├── file/
│   ├── file-validator.util.ts
│   ├── file-uploader.util.ts
│   ├── mime-detector.util.ts
│   ├── multipart-handler.util.ts
│   └── temp-file-manager.util.ts
├── image/
│   ├── image-processor.util.ts
│   ├── image-optimizer.util.ts
│   ├── thumbnail-generator.util.ts
│   ├── exif-handler.util.ts
│   ├── color-analyzer.util.ts
│   └── background-remover.util.ts
├── model3d/
│   ├── model-validator.util.ts
│   ├── model-optimizer.util.ts
│   ├── model-converter.util.ts
│   ├── lod-generator.util.ts
│   ├── texture-processor.util.ts
│   └── model-analyzer.util.ts
├── video/
│   ├── video-processor.util.ts
│   ├── video-encoder.util.ts
│   ├── thumbnail-extractor.util.ts
│   └── turntable-generator.util.ts
├── texture/
│   ├── texture-validator.util.ts
│   ├── texture-optimizer.util.ts
│   ├── normal-map-generator.util.ts
│   └── pbr-processor.util.ts
├── cdn/
│   ├── cdn-uploader.util.ts
│   ├── signed-url-generator.util.ts
│   └── cache-invalidator.util.ts
└── index.ts
```

### 3.2 Technology Stack

```yaml
Core Libraries:
  - Sharp: Image processing (fast, native)
  - FFmpeg: Video processing
  - gltf-pipeline: 3D model processing
  - Draco: 3D model compression
  - ExifReader: EXIF data extraction
  - file-type: MIME type detection
  - multer: File upload handling

Optional/Integration:
  - AWS S3 SDK: Storage integration
  - Cloudflare API: CDN management
  - ClamAV: Malware scanning (optional)
```

---

## 4. Detailed Implementation Plan

### 4.1 Week 1: File Processing Foundation

#### Day 1-2: File Validation & Upload

**Tasks**:
1. Implement file validator utility
   - MIME type validation
   - File size validation
   - File extension validation
   - Magic number verification
   - Malicious file detection

2. Implement file uploader utility
   - Single file upload
   - Chunked upload for large files
   - Progress tracking
   - Upload resumption support
   - Error handling and retry logic

3. Implement MIME detector utility
   - Magic number-based detection
   - Extension fallback
   - Content sniffing
   - Custom MIME type registry

**Deliverables**:
```typescript
// file-validator.util.ts
interface FileValidationResult {
  valid: boolean;
  errors?: string[];
  metadata?: {
    mimeType: string;
    size: number;
    extension: string;
  };
}

class FileValidator {
  static async validate(file: Buffer | string, options: ValidationOptions): Promise<FileValidationResult>
  static validateMimeType(file: Buffer, allowedTypes: string[]): boolean
  static validateSize(size: number, min: number, max: number): boolean
  static validateExtension(filename: string, allowedExtensions: string[]): boolean
  static async scanForMalware(file: Buffer): Promise<boolean>
}

// file-uploader.util.ts
class FileUploader {
  static async uploadSingle(file: File, destination: string): Promise<UploadResult>
  static async uploadChunked(file: File, options: ChunkedUploadOptions): Promise<UploadResult>
  static async trackProgress(uploadId: string): Promise<UploadProgress>
  static async resumeUpload(uploadId: string): Promise<UploadResult>
}
```

**Testing**:
- Unit tests for all validation scenarios
- Integration tests with S3
- Load testing for concurrent uploads

#### Day 3-4: Multi-part Upload & Temp File Management

**Tasks**:
1. Implement multi-part upload handler
   - Initialize multi-part upload
   - Upload parts in parallel
   - Complete multi-part upload
   - Abort and cleanup on failure

2. Implement temporary file manager
   - Create temp files with TTL
   - Cleanup expired temp files
   - Temp file storage optimization
   - Background cleanup scheduler

**Deliverables**:
```typescript
// multipart-handler.util.ts
class MultipartHandler {
  static async initiate(filename: string, totalSize: number): Promise<string>
  static async uploadPart(uploadId: string, partNumber: number, data: Buffer): Promise<PartETag>
  static async complete(uploadId: string, parts: PartETag[]): Promise<string>
  static async abort(uploadId: string): Promise<void>
}

// temp-file-manager.util.ts
class TempFileManager {
  static async create(content: Buffer, ttl: number): Promise<string>
  static async get(tempId: string): Promise<Buffer>
  static async delete(tempId: string): Promise<void>
  static async cleanup(): Promise<number>
  static scheduleCleanup(intervalMs: number): void
}
```

**Testing**:
- Multi-part upload with large files (>100MB)
- Concurrent multi-part uploads
- Temp file cleanup under load
- TTL expiration tests

#### Day 5: Integration & Documentation

**Tasks**:
- Integration testing with avatar service
- Performance benchmarking
- Documentation for all file utilities
- Code review and refactoring

---

### 4.2 Week 2: Image Processing

#### Day 1-2: Core Image Processing

**Tasks**:
1. Implement image processor utility
   - Resize images (maintain aspect ratio)
   - Crop images (smart crop, focal point)
   - Rotate and flip images
   - Format conversion (JPEG, PNG, WebP, AVIF)
   - Quality adjustment

2. Implement image optimizer
   - Lossy compression
   - Lossless compression
   - Progressive JPEG generation
   - WebP conversion
   - AVIF conversion (next-gen format)

**Deliverables**:
```typescript
// image-processor.util.ts
class ImageProcessor {
  static async resize(image: Buffer, options: ResizeOptions): Promise<Buffer>
  static async crop(image: Buffer, options: CropOptions): Promise<Buffer>
  static async rotate(image: Buffer, degrees: number): Promise<Buffer>
  static async convert(image: Buffer, format: ImageFormat): Promise<Buffer>
  static async composite(background: Buffer, overlay: Buffer, options: CompositeOptions): Promise<Buffer>
  static async getMetadata(image: Buffer): Promise<ImageMetadata>
}

// image-optimizer.util.ts
class ImageOptimizer {
  static async optimize(image: Buffer, options: OptimizeOptions): Promise<Buffer>
  static async compressLossy(image: Buffer, quality: number): Promise<Buffer>
  static async compressLossless(image: Buffer): Promise<Buffer>
  static async convertToWebP(image: Buffer, quality: number): Promise<Buffer>
  static async generateProgressive(image: Buffer): Promise<Buffer>
  static async calculateSavings(original: Buffer, optimized: Buffer): Promise<number>
}
```

**Testing**:
- Image processing accuracy tests
- Performance benchmarks (target: <500ms for 4K images)
- Quality preservation tests
- Format conversion tests

#### Day 3: Thumbnail & EXIF Processing

**Tasks**:
1. Implement thumbnail generator
   - Generate multiple sizes
   - Smart cropping for thumbnails
   - Batch thumbnail generation
   - Placeholder generation

2. Implement EXIF handler
   - Extract EXIF data
   - Remove EXIF data (privacy)
   - Preserve specific EXIF fields
   - Orientation correction

**Deliverables**:
```typescript
// thumbnail-generator.util.ts
class ThumbnailGenerator {
  static async generate(image: Buffer, sizes: ThumbnailSize[]): Promise<Map<string, Buffer>>
  static async generateSingle(image: Buffer, width: number, height: number): Promise<Buffer>
  static async generateWithSmartCrop(image: Buffer, size: ThumbnailSize): Promise<Buffer>
  static async generatePlaceholder(width: number, height: number): Promise<Buffer>
}

// exif-handler.util.ts
class ExifHandler {
  static async extract(image: Buffer): Promise<ExifData>
  static async remove(image: Buffer): Promise<Buffer>
  static async preserve(image: Buffer, fields: string[]): Promise<Buffer>
  static async correctOrientation(image: Buffer): Promise<Buffer>
  static async getOrientation(image: Buffer): Promise<number>
}
```

**Testing**:
- Thumbnail quality tests
- EXIF extraction accuracy
- Orientation correction tests
- Batch processing tests

#### Day 4: Color Analysis & Background Removal

**Tasks**:
1. Implement color analyzer
   - Extract dominant colors
   - Generate color palettes
   - Color histogram analysis
   - Similarity detection

2. Implement background remover integration
   - SAM model integration
   - Batch processing support
   - Alpha channel handling
   - Edge refinement

**Deliverables**:
```typescript
// color-analyzer.util.ts
class ColorAnalyzer {
  static async extractDominantColors(image: Buffer, count: number): Promise<Color[]>
  static async generatePalette(image: Buffer, colors: number): Promise<ColorPalette>
  static async getHistogram(image: Buffer): Promise<ColorHistogram>
  static async calculateSimilarity(color1: Color, color2: Color): Promise<number>
  static async averageColor(image: Buffer): Promise<Color>
}

// background-remover.util.ts
class BackgroundRemover {
  static async remove(image: Buffer, options: RemovalOptions): Promise<Buffer>
  static async removeBatch(images: Buffer[], options: RemovalOptions): Promise<Buffer[]>
  static async refineEdges(image: Buffer, iterations: number): Promise<Buffer>
  static async createAlphaMask(image: Buffer): Promise<Buffer>
}
```

**Testing**:
- Color extraction accuracy
- Background removal quality
- Performance under load
- Edge case handling

#### Day 5: Integration & Optimization

**Tasks**:
- Integration testing with avatar service
- Performance optimization
- Memory usage optimization
- Batch processing tests

---

### 4.3 Week 3: 3D Model Processing

#### Day 1-2: Model Validation & Optimization

**Tasks**:
1. Implement 3D model validator
   - Format validation (GLTF, GLB, OBJ, FBX)
   - Structure validation
   - Texture validation
   - Size limits
   - Vertex/polygon count validation

2. Implement 3D model optimizer
   - Draco compression
   - Mesh simplification
   - Texture compression
   - Remove unused data
   - Optimize draw calls

**Deliverables**:
```typescript
// model-validator.util.ts
class ModelValidator {
  static async validate(modelBuffer: Buffer, format: ModelFormat): Promise<ValidationResult>
  static async validateStructure(model: any): Promise<boolean>
  static async validateTextures(model: any): Promise<boolean>
  static async getStats(modelBuffer: Buffer): Promise<ModelStats>
  static async checkLimits(model: any, limits: ModelLimits): Promise<boolean>
}

// model-optimizer.util.ts
class ModelOptimizer {
  static async optimize(modelBuffer: Buffer, options: OptimizeOptions): Promise<Buffer>
  static async compressDraco(modelBuffer: Buffer, options: DracoOptions): Promise<Buffer>
  static async simplifyMesh(modelBuffer: Buffer, targetRatio: number): Promise<Buffer>
  static async compressTextures(modelBuffer: Buffer): Promise<Buffer>
  static async removeUnusedData(modelBuffer: Buffer): Promise<Buffer>
  static async calculateSavings(original: Buffer, optimized: Buffer): Promise<OptimizationStats>
}
```

**Testing**:
- Validation for various model formats
- Optimization quality tests
- Compression ratio tests
- Performance benchmarks

#### Day 3: Model Conversion & LOD Generation

**Tasks**:
1. Implement model converter
   - GLTF ↔ GLB conversion
   - OBJ → GLTF conversion
   - FBX → GLTF conversion
   - Preserve materials and textures
   - Metadata preservation

2. Implement LOD generator
   - Generate multiple LOD levels
   - Automatic polygon reduction
   - Quality thresholds
   - Distance-based LOD switching

**Deliverables**:
```typescript
// model-converter.util.ts
class ModelConverter {
  static async convert(modelBuffer: Buffer, from: ModelFormat, to: ModelFormat): Promise<Buffer>
  static async gltfToGlb(gltfBuffer: Buffer): Promise<Buffer>
  static async glbToGltf(glbBuffer: Buffer): Promise<{ json: any; buffers: Buffer[] }>
  static async objToGltf(objBuffer: Buffer, materials?: Buffer): Promise<Buffer>
  static async preserveMaterials(model: any): Promise<any>
}

// lod-generator.util.ts
class LODGenerator {
  static async generate(modelBuffer: Buffer, levels: LODLevel[]): Promise<Map<string, Buffer>>
  static async generateLevel(modelBuffer: Buffer, targetPolyCount: number): Promise<Buffer>
  static async calculateDistances(modelSize: number, levels: number): Promise<number[]>
  static async analyze(modelBuffer: Buffer): Promise<LODRecommendation>
}
```

**Testing**:
- Conversion accuracy tests
- Material preservation tests
- LOD quality at different levels
- Polygon reduction accuracy

#### Day 4: Texture Processing & Model Analysis

**Tasks**:
1. Implement texture processor
   - Extract textures from models
   - Resize and optimize textures
   - Generate texture atlases
   - PBR texture processing

2. Implement model analyzer
   - Extract metadata
   - Calculate bounding box
   - Analyze topology
   - Material analysis
   - UV map validation

**Deliverables**:
```typescript
// texture-processor.util.ts (in model3d/)
class Model3DTextureProcessor {
  static async extractTextures(modelBuffer: Buffer): Promise<Map<string, Buffer>>
  static async optimizeTextures(textures: Map<string, Buffer>): Promise<Map<string, Buffer>>
  static async generateAtlas(textures: Buffer[], maxSize: number): Promise<{ atlas: Buffer; uvMap: any }>
  static async processPBRTextures(textures: PBRTextures): Promise<PBRTextures>
}

// model-analyzer.util.ts
class ModelAnalyzer {
  static async analyze(modelBuffer: Buffer): Promise<ModelAnalysis>
  static async getBoundingBox(modelBuffer: Buffer): Promise<BoundingBox>
  static async getTopologyStats(modelBuffer: Buffer): Promise<TopologyStats>
  static async analyzeMaterials(modelBuffer: Buffer): Promise<MaterialInfo[]>
  static async validateUVs(modelBuffer: Buffer): Promise<UVValidationResult>
  static async getCenterPoint(modelBuffer: Buffer): Promise<Vector3>
}
```

**Testing**:
- Texture extraction accuracy
- Atlas generation tests
- Metadata extraction accuracy
- Bounding box calculation

#### Day 5: Integration & Performance

**Tasks**:
- Integration with catalog service
- Performance optimization for large models
- Memory management
- Batch processing support

---

### 4.4 Week 4: Video & Texture Processing

#### Day 1-2: Video Processing

**Tasks**:
1. Implement video processor
   - Video encoding/transcoding
   - Format conversion
   - Resolution adjustment
   - Compression

2. Implement video encoder
   - H.264 encoding
   - H.265 encoding (HEVC)
   - VP9 encoding
   - Quality presets
   - Bitrate control

**Deliverables**:
```typescript
// video-processor.util.ts
class VideoProcessor {
  static async process(videoBuffer: Buffer, options: ProcessOptions): Promise<Buffer>
  static async convert(videoBuffer: Buffer, format: VideoFormat): Promise<Buffer>
  static async resize(videoBuffer: Buffer, width: number, height: number): Promise<Buffer>
  static async compress(videoBuffer: Buffer, quality: number): Promise<Buffer>
  static async getMetadata(videoBuffer: Buffer): Promise<VideoMetadata>
  static async getDuration(videoBuffer: Buffer): Promise<number>
}

// video-encoder.util.ts
class VideoEncoder {
  static async encode(frames: Buffer[], options: EncodeOptions): Promise<Buffer>
  static async encodeH264(videoBuffer: Buffer, options: H264Options): Promise<Buffer>
  static async encodeHEVC(videoBuffer: Buffer, options: HEVCOptions): Promise<Buffer>
  static async encodeVP9(videoBuffer: Buffer, options: VP9Options): Promise<Buffer>
  static async setBitrate(videoBuffer: Buffer, bitrate: number): Promise<Buffer>
}
```

**Testing**:
- Video encoding quality
- Format conversion accuracy
- Compression ratio tests
- Performance benchmarks

#### Day 3: Thumbnail Extraction & Turntable Generation

**Tasks**:
1. Implement thumbnail extractor
   - Extract frame at timestamp
   - Extract multiple frames
   - Generate video preview
   - Animated GIF generation

2. Implement turntable generator
   - 360° rotation video
   - Custom rotation speed
   - Multiple angles
   - Background customization

**Deliverables**:
```typescript
// thumbnail-extractor.util.ts
class VideoThumbnailExtractor {
  static async extractFrame(videoBuffer: Buffer, timestamp: number): Promise<Buffer>
  static async extractFrames(videoBuffer: Buffer, timestamps: number[]): Promise<Buffer[]>
  static async generatePreview(videoBuffer: Buffer, frameCount: number): Promise<Buffer[]>
  static async createAnimatedGif(videoBuffer: Buffer, options: GifOptions): Promise<Buffer>
}

// turntable-generator.util.ts
class TurntableGenerator {
  static async generate(modelBuffer: Buffer, options: TurntableOptions): Promise<Buffer>
  static async render360(modelBuffer: Buffer, frameCount: number): Promise<Buffer[]>
  static async combineFrames(frames: Buffer[], fps: number): Promise<Buffer>
  static async setBackground(frames: Buffer[], background: Buffer): Promise<Buffer[]>
}
```

**Testing**:
- Thumbnail quality tests
- Turntable smooth rotation
- Frame rate accuracy
- Background integration

#### Day 4: Texture & CDN Utilities

**Tasks**:
1. Implement texture utilities
   - Texture tiling validation
   - Normal map generation
   - PBR texture processing

2. Implement CDN utilities
   - CDN upload helper
   - Signed URL generation
   - Cache invalidation

**Deliverables**:
```typescript
// texture-validator.util.ts
class TextureValidator {
  static async validateTiling(textureBuffer: Buffer): Promise<TilingResult>
  static async validateSize(textureBuffer: Buffer, maxSize: number): Promise<boolean>
  static async validateFormat(textureBuffer: Buffer, allowedFormats: string[]): Promise<boolean>
}

// cdn-uploader.util.ts
class CDNUploader {
  static async upload(file: Buffer, path: string, options: CDNOptions): Promise<string>
  static async uploadBatch(files: Map<string, Buffer>, basePath: string): Promise<Map<string, string>>
  static async generateSignedUrl(path: string, expiresIn: number): Promise<string>
  static async invalidateCache(paths: string[]): Promise<void>
  static async uploadToMultiRegion(file: Buffer, path: string, regions: string[]): Promise<Map<string, string>>
}
```

**Testing**:
- Texture validation tests
- CDN upload integration
- Signed URL generation
- Multi-region upload

#### Day 5: Final Integration & Documentation

**Tasks**:
- Complete integration testing
- Performance optimization pass
- Documentation completion
- Code review
- Deployment preparation

---

## 5. Testing Strategy

### 5.1 Unit Testing

```yaml
Coverage Target: >90%

Test Categories:
  File Processing:
    - File validation (valid/invalid files)
    - MIME type detection accuracy
    - Size validation
    - Multi-part upload logic
    - Temp file lifecycle

  Image Processing:
    - Resize accuracy
    - Format conversion quality
    - Optimization ratios
    - EXIF handling
    - Color extraction accuracy

  3D Model Processing:
    - Model validation
    - Compression ratios
    - LOD generation quality
    - Texture extraction
    - Conversion accuracy

  Video Processing:
    - Encoding quality
    - Format conversion
    - Thumbnail extraction
    - Frame rate accuracy
```

### 5.2 Integration Testing

```yaml
Integration Scenarios:
  - Avatar photo upload → image processing → S3 storage
  - Catalog item upload → 3D model processing → CDN upload
  - Design export → rendering → video encoding → S3 storage
  - Batch processing with queue integration
  - Error handling and retry logic
```

### 5.3 Performance Testing

```yaml
Benchmarks:
  Image Processing:
    - 1920x1080 resize: <100ms
    - 4K image optimize: <500ms
    - Thumbnail generation (3 sizes): <200ms
    - Background removal: <2s

  3D Model Processing:
    - Model validation: <500ms
    - Draco compression: <2s
    - LOD generation (3 levels): <5s
    - Texture extraction: <1s

  Video Processing:
    - 1080p encode: <30s for 10s video
    - Thumbnail extraction: <500ms
    - 360° turntable (30 fps, 10s): <60s

  File Operations:
    - Upload 10MB file: <2s
    - Multi-part upload 100MB: <10s
    - Batch upload 10 files: <5s
```

### 5.4 Load Testing

```yaml
Concurrent Operations:
  - 100 concurrent image uploads
  - 50 concurrent 3D model processing
  - 20 concurrent video encoding
  - 1000 concurrent file validations

Success Criteria:
  - 99.9% success rate
  - <5% degradation in performance
  - No memory leaks
  - Proper error handling
```

---

## 6. Security Considerations

### 6.1 File Upload Security

```yaml
Security Measures:
  - MIME type validation (not just extension)
  - Magic number verification
  - File size limits enforcement
  - Malware scanning (ClamAV integration)
  - Sandbox execution for processing
  - Content Security Policy headers
  - Signed URLs with expiration
  - Input sanitization for filenames

Malicious File Detection:
  - Polyglot file detection
  - Script injection in images (SVG)
  - Zip bombs
  - XXE attacks in XML-based formats
  - Path traversal attempts
```

### 6.2 Processing Security

```yaml
Resource Limits:
  - Max file size: 100MB for images, 500MB for models
  - Processing timeout: 30s for images, 60s for models
  - Memory limits per operation
  - CPU throttling for non-priority tasks
  - Concurrent processing limits

Data Protection:
  - Temp file encryption
  - Secure deletion of temp files
  - No persistent logs of file content
  - EXIF data privacy (strip by default)
```

---

## 7. Performance Optimization

### 7.1 Image Processing Optimization

```typescript
// Use Sharp's pipeline for chained operations
async function optimizeImagePipeline(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(1920, 1080, { fit: 'inside' })
    .webp({ quality: 85 })
    .toBuffer();
}

// Parallel processing for thumbnails
async function generateThumbnailsParallel(buffer: Buffer, sizes: number[]): Promise<Buffer[]> {
  return Promise.all(
    sizes.map(size =>
      sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .toBuffer()
    )
  );
}
```

### 7.2 3D Model Processing Optimization

```typescript
// Streaming for large models
async function processLargeModel(modelPath: string): Promise<void> {
  const readStream = fs.createReadStream(modelPath);
  const writeStream = fs.createWriteStream(outputPath);

  // Stream through gltf-pipeline
  await gltfPipeline.processGltf(readStream, {
    dracoOptions: { compressionLevel: 7 }
  }).pipe(writeStream);
}

// Worker threads for CPU-intensive tasks
async function generateLODWithWorkers(modelBuffer: Buffer): Promise<Buffer[]> {
  const { Worker } = require('worker_threads');

  return Promise.all(
    lodLevels.map(level =>
      new Promise((resolve, reject) => {
        const worker = new Worker('./lod-worker.js');
        worker.postMessage({ modelBuffer, level });
        worker.on('message', resolve);
        worker.on('error', reject);
      })
    )
  );
}
```

### 7.3 Caching Strategy

```yaml
Cache Layers:
  L1 - Memory Cache:
    - Processed thumbnails (max 100MB)
    - Frequently accessed models
    - TTL: 5 minutes

  L2 - Redis Cache:
    - Processing results
    - Metadata
    - TTL: 1 hour

  L3 - CDN Edge Cache:
    - Final processed files
    - TTL: 30 days

Cache Keys:
  - Image: `img:{hash}:{width}x{height}:{format}`
  - Model: `model:{hash}:{lod}:{format}`
  - Video: `video:{hash}:{resolution}:{format}`
```

---

## 8. Error Handling

### 8.1 Error Types

```typescript
// Custom errors for media utilities
export class MediaProcessingError extends AppError {
  constructor(message: string, public processingType: string) {
    super(message, 500, 'MEDIA_PROCESSING_ERROR');
  }
}

export class InvalidFileFormatError extends AppError {
  constructor(expectedFormat: string, actualFormat: string) {
    super(
      `Invalid file format. Expected ${expectedFormat}, got ${actualFormat}`,
      400,
      'INVALID_FILE_FORMAT'
    );
  }
}

export class FileTooLargeError extends AppError {
  constructor(size: number, maxSize: number) {
    super(
      `File too large. Size: ${size}B, Max: ${maxSize}B`,
      413,
      'FILE_TOO_LARGE'
    );
  }
}

export class ProcessingTimeoutError extends AppError {
  constructor(operation: string, timeout: number) {
    super(
      `${operation} timed out after ${timeout}ms`,
      408,
      'PROCESSING_TIMEOUT'
    );
  }
}
```

### 8.2 Error Recovery

```yaml
Retry Strategy:
  - Network errors: 3 attempts with exponential backoff
  - Processing errors: 2 attempts with different parameters
  - CDN upload errors: 3 attempts with different regions

Fallback Strategy:
  - If WebP conversion fails → use original JPEG
  - If Draco compression fails → use uncompressed GLTF
  - If thumbnail generation fails → use placeholder

Error Logging:
  - Log all processing errors with context
  - Track error rates by operation type
  - Alert on error rate > 5%
```

---

## 9. Monitoring & Metrics

### 9.1 Key Metrics

```yaml
Processing Metrics:
  - media_processing_duration_seconds{type, operation}
  - media_processing_success_total{type, operation}
  - media_processing_failure_total{type, operation, error_type}
  - media_file_size_bytes{type, operation}
  - media_optimization_ratio{type}

Resource Metrics:
  - media_processing_memory_usage_bytes{operation}
  - media_processing_cpu_usage_percent{operation}
  - media_temp_files_count
  - media_temp_files_size_bytes

Queue Metrics:
  - media_queue_depth{operation}
  - media_queue_wait_time_seconds{operation}
  - media_concurrent_operations{type}
```

### 9.2 Alerts

```yaml
Critical Alerts:
  - Error rate > 5% for any operation (5 min window)
  - Processing time > 2x baseline (15 min window)
  - Memory usage > 80% (5 min window)
  - Temp file cleanup failure
  - CDN upload failure rate > 10%

Warning Alerts:
  - Error rate > 2% (15 min window)
  - Processing queue depth > 100
  - Temp file count > 1000
  - Disk space < 20%
```

---

## 10. Dependencies & Prerequisites

### 10.1 System Dependencies

```yaml
Required:
  - Node.js >= 18.x
  - FFmpeg >= 4.4
  - libvips >= 8.12 (for Sharp)
  - Python >= 3.8 (for ML models)

Optional:
  - ClamAV (for malware scanning)
  - GPU support (for faster processing)
```

### 10.2 NPM Dependencies

```json
{
  "dependencies": {
    "sharp": "^0.32.0",
    "fluent-ffmpeg": "^2.1.2",
    "gltf-pipeline": "^4.0.0",
    "draco3dgltf": "^1.5.0",
    "exifreader": "^4.14.0",
    "file-type": "^18.0.0",
    "multer": "^1.4.5-lts.1",
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/lib-storage": "^3.0.0",
    "file-type": "^18.0.0"
  },
  "devDependencies": {
    "@types/sharp": "^0.32.0",
    "@types/fluent-ffmpeg": "^2.1.0",
    "@types/multer": "^1.4.7"
  }
}
```

### 10.3 Service Dependencies

```yaml
Required Services:
  - S3 (or compatible object storage)
  - Redis (for caching and queues)

Optional Services:
  - CloudFlare (CDN)
  - AWS Rekognition (for advanced image analysis)
  - ClamAV daemon (for malware scanning)
```

---

## 11. Deliverables & Milestones

### 11.1 Week 1 Deliverables

```yaml
Code:
  - File validation utilities
  - File upload utilities
  - Multi-part upload handler
  - Temp file manager

Tests:
  - Unit tests (>90% coverage)
  - Integration tests with S3
  - Load tests (100 concurrent uploads)

Documentation:
  - API documentation
  - Usage examples
  - Integration guide
```

### 11.2 Week 2 Deliverables

```yaml
Code:
  - Image processing utilities
  - Image optimization utilities
  - Thumbnail generator
  - EXIF handler
  - Color analyzer
  - Background remover integration

Tests:
  - Unit tests (>90% coverage)
  - Quality tests
  - Performance benchmarks
  - Integration tests with avatar service

Documentation:
  - API documentation
  - Performance guide
  - Best practices
```

### 11.3 Week 3 Deliverables

```yaml
Code:
  - 3D model validator
  - 3D model optimizer
  - Model converter
  - LOD generator
  - Texture processor
  - Model analyzer

Tests:
  - Unit tests (>90% coverage)
  - Quality validation tests
  - Format conversion tests
  - Integration tests with catalog service

Documentation:
  - API documentation
  - Format support guide
  - Optimization guide
```

### 11.4 Week 4 Deliverables

```yaml
Code:
  - Video processor
  - Video encoder
  - Thumbnail extractor
  - Turntable generator
  - Texture utilities
  - CDN utilities

Tests:
  - Unit tests (>90% coverage)
  - End-to-end tests
  - Performance tests
  - Load tests

Documentation:
  - Complete API documentation
  - Integration guide
  - Troubleshooting guide
  - Performance tuning guide
```

---

## 12. Success Criteria

### 12.1 Functional Requirements

```yaml
Must Have:
  ✓ Support JPEG, PNG, WebP image formats
  ✓ Support GLTF/GLB 3D model formats
  ✓ Support MP4 video format
  ✓ Image resize/crop/optimize
  ✓ 3D model validation and compression
  ✓ Thumbnail generation
  ✓ Multi-part upload
  ✓ CDN integration

Should Have:
  ○ AVIF image support
  ○ OBJ/FBX 3D model support
  ○ WebM video support
  ○ Background removal
  ○ LOD generation
  ○ 360° video generation

Could Have:
  ○ Malware scanning
  ○ Advanced color analysis
  ○ Normal map generation
  ○ Animated GIF generation
```

### 12.2 Non-Functional Requirements

```yaml
Performance:
  ✓ Image processing: <500ms for 4K
  ✓ 3D model processing: <2s validation, <5s optimization
  ✓ Video encoding: <30s for 10s 1080p video
  ✓ Concurrent operations: Support 100+ parallel

Reliability:
  ✓ 99.9% success rate
  ✓ Graceful degradation on errors
  ✓ Automatic retry on transient failures

Security:
  ✓ File validation (MIME type, size)
  ✓ Secure temp file handling
  ✓ Signed URLs for access control
  ✓ No persistent sensitive data

Quality:
  ✓ >90% test coverage
  ✓ Zero critical bugs
  ✓ Complete documentation
  ✓ Code review approved
```

---

## 13. Risks & Mitigation

### 13.1 Technical Risks

```yaml
High Risk:
  Risk: Sharp/FFmpeg installation issues on different platforms
  Impact: High - utilities won't work
  Mitigation:
    - Docker containers with pre-installed dependencies
    - Fallback to cloud processing services
    - Comprehensive installation documentation

  Risk: Memory leaks in long-running processes
  Impact: High - service degradation
  Mitigation:
    - Strict memory limits per operation
    - Worker process recycling
    - Comprehensive memory profiling
    - Monitoring and alerting

Medium Risk:
  Risk: Processing performance below targets
  Impact: Medium - poor user experience
  Mitigation:
    - Early performance testing
    - GPU acceleration where possible
    - Optimize algorithms
    - Queue-based processing

  Risk: CDN integration complexity
  Impact: Medium - delayed feature
  Mitigation:
    - Start with S3 direct upload
    - Add CDN as enhancement
    - Use abstraction layer for storage

Low Risk:
  Risk: Format compatibility issues
  Impact: Low - limited functionality
  Mitigation:
    - Support most common formats first
    - Add formats incrementally
    - Clear error messages for unsupported formats
```

### 13.2 Operational Risks

```yaml
Risk: Disk space exhaustion from temp files
Impact: High
Mitigation:
  - Aggressive temp file cleanup
  - Monitoring disk space
  - Alerts at 80% capacity
  - Automatic cleanup triggers

Risk: Processing queue backlog
Impact: Medium
Mitigation:
  - Auto-scaling workers
  - Priority queues
  - Queue depth monitoring
  - Rate limiting on upload
```

---

## 14. Future Enhancements

### 14.1 Phase 2 Enhancements

```yaml
Advanced Features:
  - AI-powered image enhancement
  - Smart cropping with face detection
  - Automatic quality adjustment
  - Image similarity search
  - Duplicate detection

3D Model Features:
  - Automatic UV unwrapping
  - Texture baking
  - Animation support
  - Rigging support

Video Features:
  - Live streaming support
  - Adaptive bitrate encoding
  - Watermarking
  - Video effects
```

### 14.2 Performance Enhancements

```yaml
Optimizations:
  - GPU acceleration for image processing
  - Distributed processing cluster
  - Edge computing for CDN processing
  - WebAssembly for client-side processing
  - Machine learning for optimization parameters
```

---

## 15. Rollout Plan

### 15.1 Development Environment (Week 1)

```yaml
Tasks:
  - Deploy to dev environment
  - Basic smoke tests
  - Developer documentation
  - Integration with dev services
```

### 15.2 Staging Environment (Week 2-3)

```yaml
Tasks:
  - Deploy to staging
  - Full integration testing
  - Performance testing
  - Security testing
  - QA approval
```

### 15.3 Production Rollout (Week 4)

```yaml
Phase 1 - Canary (Day 1-2):
  - Deploy to 10% of instances
  - Monitor error rates and performance
  - Rollback plan ready

Phase 2 - Progressive Rollout (Day 3-5):
  - 25% → 50% → 100%
  - Monitor each stage
  - Gradual traffic increase

Phase 3 - Full Deployment (Day 6-7):
  - All instances updated
  - Monitoring continues
  - Documentation published
  - Team training completed
```

---

## 16. Team & Responsibilities

### 16.1 Core Team

```yaml
Backend Developer (Lead):
  - File processing utilities
  - Multi-part upload
  - CDN integration
  - Overall architecture

Backend Developer #2:
  - Image processing
  - Video processing
  - Optimization algorithms

ML Engineer:
  - Background removal integration
  - Color analysis
  - Advanced image processing

3D Specialist:
  - 3D model processing
  - LOD generation
  - Model optimization
  - Texture processing

DevOps Engineer:
  - Infrastructure setup
  - Monitoring and alerts
  - Performance optimization
  - Deployment automation

QA Engineer:
  - Test plan development
  - Integration testing
  - Performance testing
  - Quality validation
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Backend Team
**Status**: Draft
**Review Cycle**: Weekly during implementation
**Next Review**: TBD
**Dependencies**:
  - arch-utils-00 (Core Utilities)
  - arch-infra-01 (Storage Infrastructure)
  - plan.md (Main Implementation Plan)

---

**End of File Processing & Media Utilities Implementation Plan**
