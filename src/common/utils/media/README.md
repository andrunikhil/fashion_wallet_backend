# Media Processing Utilities

Comprehensive media processing utilities for the Fashion Wallet Backend, providing support for file handling, image processing, 3D model processing, video processing, and CDN integration.

## Overview

This module implements the utilities defined in `docs/plans/plan-utils-02.md` (File Processing & Media Utilities Implementation Plan).

## Structure

```
src/common/utils/media/
├── file/                 # File processing utilities
│   ├── file-validator.util.ts
│   ├── file-uploader.util.ts
│   ├── mime-detector.util.ts
│   ├── multipart-handler.util.ts
│   └── temp-file-manager.util.ts
├── image/                # Image processing utilities
│   ├── image-processor.util.ts
│   ├── image-optimizer.util.ts
│   ├── thumbnail-generator.util.ts
│   ├── exif-handler.util.ts
│   ├── color-analyzer.util.ts
│   └── background-remover.util.ts
├── model3d/              # 3D model processing utilities
│   ├── model-validator.util.ts
│   └── model-optimizer.util.ts
├── video/                # Video processing utilities
│   └── video-processor.util.ts
├── texture/              # Texture processing utilities
│   └── texture-validator.util.ts
├── cdn/                  # CDN utilities
│   └── cdn-uploader.util.ts
└── index.ts              # Main exports
```

## Installation

Dependencies are already installed via npm. Key libraries used:

- **sharp**: Fast image processing
- **file-type**: MIME type detection
- **ExifReader**: EXIF data extraction
- **@aws-sdk/client-s3**: S3 storage integration
- **@aws-sdk/lib-storage**: Multipart upload support

## Usage Examples

### File Processing

#### File Validation

```typescript
import { FileValidator } from './media/file';

// Validate an image file
const result = await FileValidator.validateImage(imageBuffer);
if (result.valid) {
  console.log('Image is valid:', result.metadata);
} else {
  console.error('Validation errors:', result.errors);
}

// Validate with custom options
const customResult = await FileValidator.validate(fileBuffer, {
  allowedMimeTypes: ['image/jpeg', 'image/png'],
  maxSize: 10 * 1024 * 1024, // 10MB
  scanMalware: true,
});
```

#### File Upload

```typescript
import { FileUploader } from './media/file';

// Single file upload to S3
const uploadResult = await FileUploader.uploadSingle(
  imageBuffer,
  'my-bucket/uploads/image.jpg'
);
console.log('File uploaded:', uploadResult.location);

// Chunked upload for large files
const chunkedResult = await FileUploader.uploadChunked(
  largeFileBuffer,
  {
    bucket: 'my-bucket',
    key: 'large-file.bin',
    chunkSize: 5 * 1024 * 1024, // 5MB chunks
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress.percentage}%`);
    },
  }
);
```

#### MIME Type Detection

```typescript
import { MimeDetector } from './media/file';

// Detect MIME type from buffer
const mimeResult = await MimeDetector.detect(fileBuffer, 'example.jpg');
console.log('MIME type:', mimeResult.mimeType);
console.log('Confidence:', mimeResult.confidence);

// Check file type
if (MimeDetector.isImage(mimeResult.mimeType)) {
  console.log('This is an image file');
}
```

#### Temporary File Management

```typescript
import { TempFileManager } from './media/file';

// Create temporary file
const tempId = await TempFileManager.create(
  fileBuffer,
  3600000 // 1 hour TTL
);

// Retrieve temporary file
const content = await TempFileManager.get(tempId);

// Schedule automatic cleanup
TempFileManager.scheduleCleanup(300000); // Every 5 minutes
```

### Image Processing

#### Image Processing

```typescript
import { ImageProcessor } from './media/image';

// Resize image
const resized = await ImageProcessor.resize(imageBuffer, {
  width: 800,
  height: 600,
  fit: 'cover',
});

// Convert format
const webp = await ImageProcessor.convert(imageBuffer, 'webp', 85);

// Smart crop
const cropped = await ImageProcessor.smartCrop(imageBuffer, 400, 400);

// Get metadata
const metadata = await ImageProcessor.getMetadata(imageBuffer);
console.log('Dimensions:', metadata.width, 'x', metadata.height);
```

#### Image Optimization

```typescript
import { ImageOptimizer } from './media/image';

// Optimize image
const optimized = await ImageOptimizer.optimize(imageBuffer, {
  quality: 85,
  progressive: true,
  format: 'webp',
});

// Optimize with statistics
const result = await ImageOptimizer.optimizeWithStats(imageBuffer);
console.log('Savings:', result.savingsPercentage.toFixed(2) + '%');

// Generate web-optimized versions
const webVersions = await ImageOptimizer.optimizeForWeb(imageBuffer);
// Returns: { jpeg, webp, avif? }
```

#### Thumbnail Generation

```typescript
import { ThumbnailGenerator, THUMBNAIL_PRESETS } from './media/image';

// Generate single thumbnail
const thumb = await ThumbnailGenerator.generateSingle(imageBuffer, 300, 300);

// Generate multiple sizes
const sizes = [
  THUMBNAIL_PRESETS.SMALL,
  THUMBNAIL_PRESETS.MEDIUM,
  THUMBNAIL_PRESETS.LARGE,
];
const thumbnails = await ThumbnailGenerator.generate(imageBuffer, sizes);

// Generate responsive image set
const responsiveSet = await ThumbnailGenerator.generateResponsiveSet(
  imageBuffer,
  [320, 640, 1024, 1920]
);
```

#### EXIF Handling

```typescript
import { ExifHandler } from './media/image';

// Extract EXIF data
const exif = await ExifHandler.extract(imageBuffer);
console.log('Camera:', exif.make, exif.model);

// Remove EXIF data for privacy
const stripped = await ExifHandler.remove(imageBuffer);

// Correct orientation
const oriented = await ExifHandler.correctOrientation(imageBuffer);
```

#### Color Analysis

```typescript
import { ColorAnalyzer } from './media/image';

// Extract dominant colors
const colors = await ColorAnalyzer.extractDominantColors(imageBuffer, 5);
colors.forEach((color) => {
  console.log(`Color: ${color.hex} (${color.percentage}%)`);
});

// Generate color palette
const palette = await ColorAnalyzer.generatePalette(imageBuffer);
console.log('Dominant color:', palette.dominantColor.hex);

// Calculate average color
const avgColor = await ColorAnalyzer.averageColor(imageBuffer);
```

### 3D Model Processing

#### Model Validation

```typescript
import { ModelValidator } from './media/model3d';

// Validate model file
const validationResult = await ModelValidator.validate(
  modelBuffer,
  'glb',
  {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxPolygons: 100000,
  }
);

if (validationResult.valid) {
  console.log('Model stats:', validationResult.stats);
} else {
  console.error('Validation errors:', validationResult.errors);
}
```

#### Model Optimization

```typescript
import { ModelOptimizer } from './media/model3d';

// Optimize model
const optimized = await ModelOptimizer.optimize(modelBuffer, {
  compressionLevel: 7,
  simplifyRatio: 0.5,
  removeUnusedData: true,
  compressTextures: true,
});

// Calculate savings
const stats = await ModelOptimizer.calculateSavings(modelBuffer, optimized);
console.log('Compression ratio:', stats.compressionRatio);
```

### Video Processing

```typescript
import { VideoProcessor } from './media/video';

// Convert video format
const mp4 = await VideoProcessor.convert(videoBuffer, 'mp4', 85);

// Resize video
const resized = await VideoProcessor.resize(videoBuffer, 1920, 1080);

// Get metadata
const metadata = await VideoProcessor.getMetadata(videoBuffer);
console.log('Duration:', metadata.duration, 'seconds');
```

### CDN Upload

```typescript
import { CDNUploader } from './media/cdn';

// Upload to CDN
const url = await CDNUploader.upload(
  fileBuffer,
  'images/avatar-123.jpg',
  {
    bucket: 'my-cdn-bucket',
    acl: 'public-read',
    cacheControl: 'max-age=31536000',
  }
);
console.log('CDN URL:', url);

// Generate signed URL
const signedUrl = await CDNUploader.generateSignedUrl(
  'private/document.pdf',
  3600 // 1 hour expiration
);

// Batch upload
const files = new Map([
  ['thumb-small.jpg', smallThumb],
  ['thumb-medium.jpg', mediumThumb],
  ['thumb-large.jpg', largeThumb],
]);
const urls = await CDNUploader.uploadBatch(files, 'thumbnails/product-123');
```

## Configuration

### Environment Variables

```env
# AWS/S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# CDN Configuration
CDN_BUCKET=your-cdn-bucket

# Optional
S3_ENDPOINT=https://custom-s3-endpoint.com
```

## Features

### File Processing
- ✅ File validation (MIME type, size, extension)
- ✅ Single and multipart upload to S3
- ✅ MIME type detection (magic numbers + extension)
- ✅ Temporary file management with TTL
- ✅ Progress tracking for uploads
- ✅ Malware scanning (basic pattern detection)

### Image Processing
- ✅ Resize, crop, rotate, flip
- ✅ Format conversion (JPEG, PNG, WebP, AVIF)
- ✅ Image optimization and compression
- ✅ Thumbnail generation (multiple sizes, responsive sets)
- ✅ EXIF data extraction and manipulation
- ✅ Color analysis and palette extraction
- ✅ Background removal (placeholder for ML integration)
- ✅ Smart crop with attention-based detection

### 3D Model Processing
- ✅ Model validation (GLTF, GLB, OBJ, FBX)
- ✅ Structure validation
- ✅ Model statistics extraction
- ✅ Model format conversion (GLTF ↔ GLB, OBJ → GLTF)
- ✅ LOD (Level of Detail) generation structure
- ✅ Model optimization framework
- ⏳ Draco compression (requires gltf-pipeline setup)
- ⏳ Mesh simplification (requires meshoptimizer library)

### Video Processing
- ✅ Video encoding utilities (H.264, HEVC, VP9)
- ✅ Thumbnail extraction from video
- ✅ Turntable 360° video generation
- ✅ Animated GIF creation
- ✅ Video sprite sheet generation
- ⏳ FFmpeg integration for actual processing

### Texture Processing
- ✅ Texture validation (tiling, power-of-2, format)
- ✅ Texture optimization (resize, compress, mipmaps)
- ✅ Normal map generation from height maps
- ✅ Mipmap generation
- ⏳ Basis Universal compression

### CDN Integration
- ✅ S3/CDN upload
- ✅ Batch upload
- ✅ Signed URL generation
- ✅ Multi-region upload
- ⏳ Cache invalidation (requires CloudFront setup)

## Performance Targets

Based on `plan-utils-02.md`:

- Image processing: <500ms for 4K images
- 3D model validation: <500ms
- 3D model optimization: <2s
- Thumbnail generation (3 sizes): <200ms
- Concurrent operations: Support 100+ parallel

## Testing

Tests will be created in a future phase. See `plan-utils-02.md` for testing strategy.

## Future Enhancements

- Integration with ML models for background removal (SAM, remove.bg)
- FFmpeg integration for video processing
- Advanced 3D model optimization with gltf-pipeline
- LOD generation for 3D models
- Texture baking and UV unwrapping
- Real-time video processing

## Related Documentation

- Implementation Plan: `docs/plans/plan-utils-02.md`
- Architecture: `docs/architecture/arch-utils-02.md`

## License

Copyright © 2025 Fashion Wallet. All rights reserved.
