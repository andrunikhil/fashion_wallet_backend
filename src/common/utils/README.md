# Media & File Processing Utilities

Comprehensive set of utilities for media and file processing in the Fashion Wallet backend.

## Overview

This package provides utilities for:
- Image processing (resize, crop, convert, optimize)
- Video processing (convert, extract frames, thumbnails)
- 3D model processing (validate, convert GLTF/GLB)
- File operations (validation, hashing, MIME detection)
- Cloud storage (S3 upload/download, signed URLs)

## Installation

The required dependencies are already installed in the project:

```bash
npm install sharp fluent-ffmpeg file-type archiver unzipper @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Usage

### Image Processing

```typescript
import { ImageUtil, ImageConverter, ImageOptimizer, ThumbnailGenerator, ImageAnalyzer } from './common/utils';

// Resize image
const resized = await ImageUtil.resize(imageBuffer, {
  width: 800,
  height: 600,
  fit: 'cover',
});

// Convert format
const webp = await ImageConverter.toWebP(imageBuffer, 80);

// Optimize for web
const optimized = await ImageOptimizer.optimize(imageBuffer, {
  quality: 80,
  maxWidth: 1920,
  stripMetadata: true,
});

// Generate thumbnail
const thumbnail = await ThumbnailGenerator.generate(imageBuffer, {
  width: 256,
  height: 256,
  fit: 'cover',
});

// Extract colors
const colors = await ImageAnalyzer.extractColors(imageBuffer);
console.log(colors.dominant); // Hex color
console.log(colors.palette); // Array of colors

// Calculate perceptual hash
const hash = await ImageAnalyzer.calculateDHash(imageBuffer);
```

### Video Processing

```typescript
import { VideoUtil } from './common/utils';

// Get metadata
const metadata = await VideoUtil.getMetadata('/path/to/video.mp4');
console.log(metadata.duration, metadata.width, metadata.height);

// Generate thumbnail
await VideoUtil.generateThumbnail(
  '/path/to/video.mp4',
  '/path/to/thumbnail.jpg',
  { timestamp: 5, width: 640, height: 360 }
);

// Extract frames
const frames = await VideoUtil.extractFrames(
  '/path/to/video.mp4',
  '/output/dir',
  { count: 10 }
);

// Convert video
await VideoUtil.convert(
  '/path/to/input.mp4',
  '/path/to/output.webm',
  { format: 'webm', quality: 23 }
);
```

### File Operations

```typescript
import { FileUtil } from './common/utils';

// Validate file
const validation = await FileUtil.validate(fileBuffer, {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png'],
});

// Generate unique filename
const filename = FileUtil.generateUniqueFilename('avatar', 'jpg');

// Calculate hash
const hash = await FileUtil.calculateSHA256(fileBuffer);

// Detect MIME type
const mimeType = await FileUtil.getMimeType(fileBuffer);
```

### S3 Storage

```typescript
import { S3Util } from './common/utils';

// Initialize S3 (optional, uses default credentials if not called)
S3Util.initialize('us-east-1', {
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
});

// Upload file
const result = await S3Util.upload(fileBuffer, {
  bucket: 'my-bucket',
  key: 'uploads/image.jpg',
  contentType: 'image/jpeg',
  acl: 'public-read',
});

// Download file
const data = await S3Util.download({
  bucket: 'my-bucket',
  key: 'uploads/image.jpg',
});

// Generate signed URL
const signedUrl = await S3Util.generateSignedUrl({
  bucket: 'my-bucket',
  key: 'uploads/image.jpg',
  expiresIn: 3600, // 1 hour
});

// Delete file
await S3Util.delete({
  bucket: 'my-bucket',
  key: 'uploads/image.jpg',
});
```

### 3D Model Processing

```typescript
import { Model3DUtil } from './common/utils';

// Validate model
const isValid = await Model3DUtil.validate(modelBuffer);

// Get metadata
const metadata = await Model3DUtil.getMetadata(modelBuffer);
console.log(metadata.vertexCount, metadata.faceCount);

// Convert between GLTF and GLB
await Model3DUtil.convert('/path/to/model.gltf', '/path/to/model.glb');
```

## Architecture

```
src/common/utils/
├── media/
│   ├── image/
│   │   ├── image.util.ts              # Core image operations
│   │   ├── image-converter.util.ts    # Format conversions
│   │   ├── image-optimizer.util.ts    # Web optimization
│   │   ├── thumbnail-generator.util.ts # Thumbnail generation
│   │   └── image-analyzer.util.ts     # Color extraction, hashing
│   ├── video/
│   │   └── video.util.ts              # Video processing
│   └── model3d/
│       └── model3d.util.ts            # 3D model processing
├── file/
│   └── file.util.ts                   # File operations
├── storage/
│   └── s3.util.ts                     # S3 storage
├── types/
│   └── media.types.ts                 # TypeScript types
└── index.ts                           # Main exports
```

## Features

### Image Processing
- ✅ Resize, crop, rotate, flip
- ✅ Format conversion (JPEG, PNG, WebP, AVIF)
- ✅ Web optimization
- ✅ Thumbnail generation
- ✅ Color extraction
- ✅ Perceptual hashing
- ✅ Responsive image variants
- ✅ Sprite sheet generation

### Video Processing
- ✅ Metadata extraction
- ✅ Format conversion
- ✅ Frame extraction
- ✅ Thumbnail generation
- ✅ Compression
- ✅ 360° turntable video creation

### File Operations
- ✅ File validation
- ✅ MIME type detection
- ✅ Hash calculation (MD5, SHA256, etc.)
- ✅ Unique filename generation
- ✅ File I/O operations

### S3 Storage
- ✅ Upload/download
- ✅ Signed URL generation
- ✅ Batch operations
- ✅ File copying
- ✅ Metadata retrieval

### 3D Models
- ✅ GLTF/GLB validation
- ✅ Metadata extraction
- ✅ Format conversion
- ⏳ Draco compression (requires gltf-pipeline)
- ⏳ LOD generation (requires additional libraries)

## Performance Benchmarks

Based on the plan specifications:

- Image resize (4K): <100ms
- Format conversion: <200ms
- Thumbnail generation: <50ms
- Video thumbnail: <5 seconds
- File validation: <10ms

## Testing

Unit tests are located in the `test/` directory. Run tests with:

```bash
npm test
```

## Dependencies

- `sharp`: Image processing
- `fluent-ffmpeg`: Video processing
- `file-type`: MIME type detection
- `@aws-sdk/client-s3`: S3 operations
- `@aws-sdk/s3-request-presigner`: Signed URL generation

## Environment Variables

For S3 operations, configure:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

Or use AWS IAM roles when deployed to AWS infrastructure.

## Related Documentation

- [Implementation Plan](../../../docs/plans/plan-utils-01.md)
- [Architecture Specification](../../../docs/arch/arch-utils-01.md)
- [Technical Specification](../../../docs/spec/spec-utils-01.md)

## License

ISC
