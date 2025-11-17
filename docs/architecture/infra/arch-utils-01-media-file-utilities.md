# Architecture Document: Media & File Processing Utilities

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-utils-01
**Related Spec**: spec-utils-01

---

## 1. Executive Summary

This architecture document describes the implementation of media and file processing utilities for the Fashion Wallet backend. These utilities provide robust, performant, and scalable solutions for handling images, videos, 3D models, and file operations that are critical to the application's core functionality.

---

## 2. Architectural Overview

### 2.1 Utility Organization

```
src/common/utils/
├── media/
│   ├── image/
│   │   ├── image.util.ts
│   │   ├── image-converter.util.ts
│   │   ├── image-optimizer.util.ts
│   │   ├── thumbnail-generator.util.ts
│   │   └── image-analyzer.util.ts
│   ├── video/
│   │   ├── video.util.ts
│   │   ├── video-converter.util.ts
│   │   └── video-thumbnail.util.ts
│   ├── model3d/
│   │   ├── model3d.util.ts
│   │   ├── model-validator.util.ts
│   │   ├── model-optimizer.util.ts
│   │   └── lod-generator.util.ts
│   └── index.ts
├── file/
│   ├── file.util.ts
│   ├── mime-type.util.ts
│   ├── archive.util.ts
│   └── temp-file-manager.util.ts
├── storage/
│   ├── s3.util.ts
│   ├── cdn.util.ts
│   └── signed-url.util.ts
└── index.ts
```

---

## 3. Image Processing Architecture

### 3.1 Image Processing Pipeline

```typescript
/**
 * Core image processing utility using Sharp
 */
import sharp from 'sharp';
import { promisify } from 'util';

export class ImageUtil {
  private static readonly DEFAULT_QUALITY = 85;
  private static readonly MAX_DIMENSION = 4096;

  /**
   * Resize image with smart defaults
   */
  static async resize(
    input: Buffer | string,
    options: ImageResizeOptions
  ): Promise<Buffer> {
    const {
      width,
      height,
      fit = 'cover',
      position = 'center',
      background = { r: 255, g: 255, b: 255, alpha: 1 },
      withoutEnlargement = true
    } = options;

    try {
      return await sharp(input)
        .resize(width, height, {
          fit,
          position,
          background,
          withoutEnlargement
        })
        .toBuffer();
    } catch (error) {
      throw new ImageProcessingError(
        `Failed to resize image: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate responsive image set
   */
  static async generateResponsiveSet(
    input: Buffer,
    sizes: ResponsiveImageSize[]
  ): Promise<Map<string, ResponsiveImage>> {
    const results = new Map<string, ResponsiveImage>();

    // Process images in parallel
    await Promise.all(
      sizes.map(async (size) => {
        const buffer = await this.resize(input, {
          width: size.width,
          height: size.height,
          fit: size.fit
        });

        const metadata = await sharp(buffer).metadata();

        results.set(size.name, {
          buffer,
          width: metadata.width!,
          height: metadata.height!,
          format: metadata.format!,
          size: buffer.byteLength
        });
      })
    );

    return results;
  }

  /**
   * Process image with pipeline
   */
  static async processPipeline(
    input: Buffer,
    pipeline: ImageOperation[]
  ): Promise<Buffer> {
    let image = sharp(input);

    for (const operation of pipeline) {
      switch (operation.type) {
        case 'resize':
          image = image.resize(operation.params.width, operation.params.height, {
            fit: operation.params.fit
          });
          break;

        case 'rotate':
          image = image.rotate(operation.params.angle);
          break;

        case 'flip':
          image = operation.params.direction === 'horizontal'
            ? image.flop()
            : image.flip();
          break;

        case 'blur':
          image = image.blur(operation.params.sigma || 5);
          break;

        case 'sharpen':
          image = image.sharpen(operation.params.sigma);
          break;

        case 'grayscale':
          image = image.grayscale();
          break;

        case 'normalize':
          image = image.normalize();
          break;

        case 'crop':
          image = image.extract({
            left: operation.params.x,
            top: operation.params.y,
            width: operation.params.width,
            height: operation.params.height
          });
          break;
      }
    }

    return image.toBuffer();
  }

  /**
   * Extract metadata from image
   */
  static async getMetadata(input: Buffer | string): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(input).metadata();

      return {
        width: metadata.width!,
        height: metadata.height!,
        format: metadata.format!,
        space: metadata.space,
        channels: metadata.channels!,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha!,
        orientation: metadata.orientation,
        exif: metadata.exif,
        icc: metadata.icc,
        size: (await sharp(input).toBuffer()).byteLength
      };
    } catch (error) {
      throw new ImageProcessingError(
        `Failed to extract metadata: ${error.message}`,
        error
      );
    }
  }

  /**
   * Validate image
   */
  static async validate(
    input: Buffer,
    options: ImageValidationOptions
  ): Promise<ValidationResult> {
    try {
      const metadata = await this.getMetadata(input);

      // Check dimensions
      if (options.maxWidth && metadata.width > options.maxWidth) {
        return {
          valid: false,
          error: `Image width ${metadata.width}px exceeds maximum ${options.maxWidth}px`
        };
      }

      if (options.maxHeight && metadata.height > options.maxHeight) {
        return {
          valid: false,
          error: `Image height ${metadata.height}px exceeds maximum ${options.maxHeight}px`
        };
      }

      // Check format
      if (options.allowedFormats && !options.allowedFormats.includes(metadata.format)) {
        return {
          valid: false,
          error: `Image format ${metadata.format} not allowed`
        };
      }

      // Check file size
      if (options.maxSize && metadata.size > options.maxSize) {
        return {
          valid: false,
          error: `Image size ${metadata.size} bytes exceeds maximum ${options.maxSize} bytes`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Image validation failed: ${error.message}`
      };
    }
  }
}
```

### 3.2 Image Format Conversion

```typescript
/**
 * Image format conversion utilities
 */
export class ImageConverter {
  private static readonly FORMAT_OPTIONS = {
    jpeg: {
      quality: 85,
      progressive: true,
      mozjpeg: true,
      chromaSubsampling: '4:4:4'
    },
    png: {
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true
    },
    webp: {
      quality: 85,
      effort: 6,
      lossless: false
    },
    avif: {
      quality: 80,
      effort: 4,
      chromaSubsampling: '4:4:4'
    }
  };

  /**
   * Convert to specific format with optimization
   */
  static async convert(
    input: Buffer,
    format: ImageFormat,
    options?: Partial<ConversionOptions>
  ): Promise<Buffer> {
    const formatOptions = {
      ...this.FORMAT_OPTIONS[format],
      ...options
    };

    try {
      switch (format) {
        case 'jpeg':
          return await sharp(input)
            .jpeg(formatOptions)
            .toBuffer();

        case 'png':
          return await sharp(input)
            .png(formatOptions)
            .toBuffer();

        case 'webp':
          return await sharp(input)
            .webp(formatOptions)
            .toBuffer();

        case 'avif':
          return await sharp(input)
            .avif(formatOptions)
            .toBuffer();

        case 'tiff':
          return await sharp(input)
            .tiff({ compression: 'lzw' })
            .toBuffer();

        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new ImageConversionError(
        `Failed to convert to ${format}: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate modern format variants (WebP + AVIF)
   */
  static async generateModernFormats(
    input: Buffer
  ): Promise<ModernFormatSet> {
    const [webp, avif] = await Promise.all([
      this.convert(input, 'webp'),
      this.convert(input, 'avif')
    ]);

    return { webp, avif };
  }

  /**
   * Auto-select best format based on source
   */
  static async autoConvert(
    input: Buffer,
    preferredFormat?: ImageFormat
  ): Promise<ConversionResult> {
    const metadata = await ImageUtil.getMetadata(input);
    const sourceFormat = metadata.format as ImageFormat;

    // If preferred format specified, use it
    if (preferredFormat) {
      const converted = await this.convert(input, preferredFormat);
      return {
        format: preferredFormat,
        buffer: converted,
        originalSize: input.byteLength,
        convertedSize: converted.byteLength,
        savings: ((input.byteLength - converted.byteLength) / input.byteLength) * 100
      };
    }

    // Auto-select based on image characteristics
    let targetFormat: ImageFormat;

    if (metadata.hasAlpha) {
      // Preserve transparency
      targetFormat = 'webp'; // WebP supports alpha
    } else if (metadata.format === 'jpeg') {
      targetFormat = 'webp'; // Convert JPEG to WebP
    } else {
      targetFormat = 'png'; // Safe default
    }

    const converted = await this.convert(input, targetFormat);

    return {
      format: targetFormat,
      buffer: converted,
      originalSize: input.byteLength,
      convertedSize: converted.byteLength,
      savings: ((input.byteLength - converted.byteLength) / input.byteLength) * 100
    };
  }
}
```

### 3.3 Image Optimization

```typescript
/**
 * Advanced image optimization utilities
 */
export class ImageOptimizer {
  /**
   * Optimize for web delivery
   */
  static async optimizeForWeb(
    input: Buffer,
    options: WebOptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
      format,
      stripMetadata = true,
      progressive = true
    } = options;

    const metadata = await ImageUtil.getMetadata(input);
    let optimized = sharp(input);

    // Resize if needed
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      optimized = optimized.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: false
      });
    }

    // Strip metadata
    if (stripMetadata) {
      optimized = optimized.withMetadata({});
    }

    // Convert to target format
    const targetFormat = format || (metadata.hasAlpha ? 'webp' : 'jpeg');

    if (targetFormat === 'jpeg') {
      optimized = optimized.jpeg({
        quality,
        progressive,
        mozjpeg: true
      });
    } else if (targetFormat === 'webp') {
      optimized = optimized.webp({ quality, effort: 6 });
    } else if (targetFormat === 'avif') {
      optimized = optimized.avif({ quality, effort: 4 });
    }

    const buffer = await optimized.toBuffer();

    return {
      buffer,
      originalSize: input.byteLength,
      optimizedSize: buffer.byteLength,
      savings: ((input.byteLength - buffer.byteLength) / input.byteLength) * 100,
      format: targetFormat,
      width: (await sharp(buffer).metadata()).width!,
      height: (await sharp(buffer).metadata()).height!
    };
  }

  /**
   * Compress to target size using binary search
   */
  static async compressToSize(
    input: Buffer,
    targetSizeKB: number,
    format: ImageFormat = 'jpeg'
  ): Promise<Buffer> {
    let minQuality = 10;
    let maxQuality = 100;
    let result = input;

    while (minQuality <= maxQuality) {
      const quality = Math.floor((minQuality + maxQuality) / 2);

      result = await ImageConverter.convert(input, format, { quality });

      const sizeKB = result.byteLength / 1024;

      if (sizeKB <= targetSizeKB) {
        // Try higher quality
        minQuality = quality + 1;
      } else {
        // Try lower quality
        maxQuality = quality - 1;
      }

      // If we're close enough, break
      if (Math.abs(sizeKB - targetSizeKB) < 5) {
        break;
      }
    }

    return result;
  }

  /**
   * Batch optimize images
   */
  static async batchOptimize(
    images: Buffer[],
    options: WebOptimizationOptions
  ): Promise<OptimizationResult[]> {
    // Process in parallel with concurrency limit
    const concurrency = 5;
    const results: OptimizationResult[] = [];

    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(img => this.optimizeForWeb(img, options))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
```

### 3.4 Thumbnail Generation

```typescript
/**
 * Intelligent thumbnail generation
 */
export class ThumbnailGenerator {
  private static readonly PRESET_SIZES = {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 600, height: 600 },
    xlarge: { width: 1200, height: 1200 }
  };

  /**
   * Generate thumbnail with smart cropping
   */
  static async generate(
    input: Buffer,
    width: number,
    height: number,
    options: ThumbnailOptions = {}
  ): Promise<Buffer> {
    const {
      fit = 'cover',
      position = 'attention', // Smart crop using attention algorithm
      format = 'jpeg',
      quality = 85,
      background = { r: 255, g: 255, b: 255, alpha: 1 }
    } = options;

    try {
      let thumbnail = sharp(input)
        .resize(width, height, {
          fit,
          position,
          background
        });

      // Apply format-specific optimization
      if (format === 'jpeg') {
        thumbnail = thumbnail.jpeg({ quality, progressive: true });
      } else if (format === 'webp') {
        thumbnail = thumbnail.webp({ quality });
      } else if (format === 'png') {
        thumbnail = thumbnail.png({ compressionLevel: 9 });
      }

      return await thumbnail.toBuffer();
    } catch (error) {
      throw new ThumbnailGenerationError(
        `Failed to generate thumbnail: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate preset thumbnails
   */
  static async generatePresets(
    input: Buffer,
    presets: ThumbnailPreset[] = ['small', 'medium', 'large']
  ): Promise<Map<ThumbnailPreset, Buffer>> {
    const thumbnails = new Map<ThumbnailPreset, Buffer>();

    await Promise.all(
      presets.map(async (preset) => {
        const size = this.PRESET_SIZES[preset];
        const thumbnail = await this.generate(
          input,
          size.width,
          size.height
        );
        thumbnails.set(preset, thumbnail);
      })
    );

    return thumbnails;
  }

  /**
   * Generate srcset for responsive images
   */
  static async generateSrcSet(
    input: Buffer,
    widths: number[]
  ): Promise<SrcSetEntry[]> {
    const entries: SrcSetEntry[] = [];

    const metadata = await ImageUtil.getMetadata(input);
    const aspectRatio = metadata.width / metadata.height;

    for (const width of widths) {
      const height = Math.round(width / aspectRatio);
      const buffer = await this.generate(input, width, height);

      entries.push({
        width,
        buffer,
        descriptor: `${width}w`
      });
    }

    return entries;
  }

  /**
   * Generate sprite sheet from multiple images
   */
  static async generateSpriteSheet(
    images: Buffer[],
    options: SpriteSheetOptions
  ): Promise<SpriteSheet> {
    const { columns = 4, padding = 0 } = options;

    // Get first image metadata to determine dimensions
    const firstMeta = await sharp(images[0]).metadata();
    const tileWidth = firstMeta.width!;
    const tileHeight = firstMeta.height!;

    const rows = Math.ceil(images.length / columns);
    const spriteWidth = (tileWidth + padding) * columns - padding;
    const spriteHeight = (tileHeight + padding) * rows - padding;

    // Create composite operations
    const compositeOps = images.map((img, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      return {
        input: img,
        top: row * (tileHeight + padding),
        left: col * (tileWidth + padding)
      };
    });

    // Generate sprite sheet
    const sprite = await sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(compositeOps)
      .png()
      .toBuffer();

    return {
      buffer: sprite,
      width: spriteWidth,
      height: spriteHeight,
      tileWidth,
      tileHeight,
      columns,
      rows,
      tiles: images.length
    };
  }
}
```

---

## 4. Video Processing Architecture

### 4.1 Video Utilities

```typescript
/**
 * Video processing utilities using FFmpeg
 */
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

// Set FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

export class VideoUtil {
  /**
   * Extract comprehensive video metadata
   */
  static async getMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new VideoProcessingError(
            `Failed to get video metadata: ${err.message}`,
            err
          ));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new VideoProcessingError('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFPS(videoStream.r_frame_rate || '0/0'),
          codec: videoStream.codec_name || '',
          bitrate: parseInt(metadata.format.bit_rate || '0'),
          size: parseInt(metadata.format.size || '0'),
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          audioBitrate: audioStream?.bit_rate,
          format: metadata.format.format_name || ''
        });
      });
    });
  }

  /**
   * Parse FPS from fraction string
   */
  private static parseFPS(fpsString: string): number {
    const [num, den] = fpsString.split('/').map(Number);
    return den ? num / den : 0;
  }

  /**
   * Extract frame at specific timestamp
   */
  static async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string,
    options: FrameExtractionOptions = {}
  ): Promise<void> {
    const { width, height, quality = 85 } = options;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath)
        });

      if (width && height) {
        command = command.size(`${width}x${height}`);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(
          new VideoProcessingError(
            `Failed to extract frame: ${err.message}`,
            err
          )
        ));
    });
  }

  /**
   * Generate thumbnail from video
   */
  static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    options: VideoThumbnailOptions = {}
  ): Promise<void> {
    const { timestamp, width = 640, height = 360 } = options;

    // If no timestamp specified, use middle of video
    let time = timestamp;
    if (time === undefined) {
      const metadata = await this.getMetadata(videoPath);
      time = metadata.duration / 2;
    }

    await this.extractFrame(videoPath, time, outputPath, { width, height });
  }

  /**
   * Convert video format
   */
  static async convert(
    inputPath: string,
    outputPath: string,
    options: VideoConversionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Video codec
      if (options.videoCodec) {
        command = command.videoCodec(options.videoCodec);
      }

      // Video bitrate
      if (options.videoBitrate) {
        command = command.videoBitrate(options.videoBitrate);
      }

      // Dimensions
      if (options.width && options.height) {
        command = command.size(`${options.width}x${options.height}`);
      }

      // FPS
      if (options.fps) {
        command = command.fps(options.fps);
      }

      // Audio codec
      if (options.audioCodec) {
        command = command.audioCodec(options.audioCodec);
      }

      // Audio bitrate
      if (options.audioBitrate) {
        command = command.audioBitrate(options.audioBitrate);
      }

      // Additional options
      if (options.additionalOptions) {
        command = command.outputOptions(options.additionalOptions);
      }

      command
        .output(outputPath)
        .on('progress', (progress) => {
          // Emit progress events if needed
          if (options.onProgress) {
            options.onProgress(progress.percent || 0);
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(
          new VideoProcessingError(
            `Failed to convert video: ${err.message}`,
            err
          )
        ))
        .run();
    });
  }

  /**
   * Compress video with quality presets
   */
  static async compress(
    inputPath: string,
    outputPath: string,
    quality: VideoQuality = 'medium'
  ): Promise<void> {
    const presets = {
      low: { crf: 28, preset: 'fast' },
      medium: { crf: 23, preset: 'medium' },
      high: { crf: 18, preset: 'slow' }
    };

    const { crf, preset } = presets[quality];

    return this.convert(inputPath, outputPath, {
      videoCodec: 'libx264',
      additionalOptions: [
        `-crf ${crf}`,
        `-preset ${preset}`,
        '-movflags +faststart'
      ]
    });
  }

  /**
   * Generate 360° turntable video from image sequence
   */
  static async generate360Video(
    imagePattern: string,
    outputPath: string,
    options: Turntable360Options
  ): Promise<void> {
    const { fps = 24, quality = 'high', duration = 5 } = options;

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(imagePattern)
        .inputFPS(1 / duration) // Duration per image
        .outputFPS(fps)
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-preset slow',
          `-crf ${quality === 'high' ? 18 : 23}`,
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(
          new VideoProcessingError(
            `Failed to generate 360° video: ${err.message}`,
            err
          )
        ))
        .run();
    });
  }

  /**
   * Trim video
   */
  static async trim(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(
          new VideoProcessingError(
            `Failed to trim video: ${err.message}`,
            err
          )
        ))
        .run();
    });
  }

  /**
   * Add watermark to video
   */
  static async addWatermark(
    videoPath: string,
    watermarkPath: string,
    outputPath: string,
    position: WatermarkPosition = 'bottom-right'
  ): Promise<void> {
    const positions = {
      'top-left': 'overlay=10:10',
      'top-right': 'overlay=main_w-overlay_w-10:10',
      'bottom-left': 'overlay=10:main_h-overlay_h-10',
      'bottom-right': 'overlay=main_w-overlay_w-10:main_h-overlay_h-10',
      'center': 'overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2'
    };

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .input(watermarkPath)
        .complexFilter([positions[position]])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(
          new VideoProcessingError(
            `Failed to add watermark: ${err.message}`,
            err
          )
        ))
        .run();
    });
  }
}
```

---

## 5. 3D Model Processing Architecture

### 5.1 Model Utilities

```typescript
/**
 * 3D Model processing utilities
 */
import * as gltfPipeline from 'gltf-pipeline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class Model3DUtil {
  /**
   * Validate 3D model file
   */
  static async validate(
    filePath: string,
    options: Model3DValidationOptions = {}
  ): Promise<ValidationResult> {
    const {
      allowedFormats = ['gltf', 'glb', 'obj', 'fbx'],
      maxSize = 100 * 1024 * 1024, // 100MB
      maxVertices = 1000000,
      maxTextures = 20
    } = options;

    // Check file extension
    const ext = path.extname(filePath).slice(1).toLowerCase();
    if (!allowedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Invalid format: ${ext}. Allowed: ${allowedFormats.join(', ')}`
      };
    }

    // Check file size
    const stats = await fs.promises.stat(filePath);
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File size ${stats.size} exceeds maximum ${maxSize} bytes`
      };
    }

    // For GLTF/GLB, validate structure
    if (ext === 'gltf' || ext === 'glb') {
      try {
        const metadata = await this.getMetadata(filePath);

        if (maxVertices && metadata.vertexCount > maxVertices) {
          return {
            valid: false,
            error: `Vertex count ${metadata.vertexCount} exceeds maximum ${maxVertices}`
          };
        }

        if (maxTextures && metadata.textureCount > maxTextures) {
          return {
            valid: false,
            error: `Texture count ${metadata.textureCount} exceeds maximum ${maxTextures}`
          };
        }
      } catch (error) {
        return {
          valid: false,
          error: `Failed to validate model: ${error.message}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get 3D model metadata
   */
  static async getMetadata(filePath: string): Promise<Model3DMetadata> {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    if (ext === 'gltf' || ext === 'glb') {
      const buffer = await fs.promises.readFile(filePath);
      const gltf = await gltfPipeline.processGltf(buffer, {
        resourceDirectory: path.dirname(filePath)
      });

      return {
        format: ext,
        vertexCount: this.countVertices(gltf.gltf),
        faceCount: this.countFaces(gltf.gltf),
        meshCount: gltf.gltf.meshes?.length || 0,
        textureCount: gltf.gltf.textures?.length || 0,
        materialCount: gltf.gltf.materials?.length || 0,
        animationCount: gltf.gltf.animations?.length || 0,
        fileSize: buffer.byteLength
      };
    }

    throw new Model3DProcessingError(
      `Metadata extraction not supported for format: ${ext}`
    );
  }

  /**
   * Count vertices in GLTF model
   */
  private static countVertices(gltf: any): number {
    let count = 0;

    if (gltf.meshes) {
      for (const mesh of gltf.meshes) {
        for (const primitive of mesh.primitives) {
          if (primitive.attributes?.POSITION !== undefined) {
            const accessor = gltf.accessors[primitive.attributes.POSITION];
            count += accessor.count || 0;
          }
        }
      }
    }

    return count;
  }

  /**
   * Count faces in GLTF model
   */
  private static countFaces(gltf: any): number {
    let count = 0;

    if (gltf.meshes) {
      for (const mesh of gltf.meshes) {
        for (const primitive of mesh.primitives) {
          if (primitive.indices !== undefined) {
            const accessor = gltf.accessors[primitive.indices];
            count += (accessor.count || 0) / 3; // Assuming triangles
          }
        }
      }
    }

    return count;
  }

  /**
   * Compress model using Draco
   */
  static async compressDraco(
    inputPath: string,
    outputPath: string,
    options: DracoCompressionOptions = {}
  ): Promise<CompressionResult> {
    const {
      compressionLevel = 7,
      quantizePosition = 14,
      quantizeNormal = 10,
      quantizeTexcoord = 12,
      quantizeColor = 8
    } = options;

    const inputSize = (await fs.promises.stat(inputPath)).size;

    try {
      const gltfOptions = {
        dracoOptions: {
          compressionLevel,
          quantizePositionBits: quantizePosition,
          quantizeNormalBits: quantizeNormal,
          quantizeTexcoordBits: quantizeTexcoord,
          quantizeColorBits: quantizeColor
        }
      };

      const buffer = await fs.promises.readFile(inputPath);
      const result = await gltfPipeline.processGltf(buffer, gltfOptions);

      await fs.promises.writeFile(outputPath, result.glb);

      const outputSize = result.glb.byteLength;

      return {
        inputSize,
        outputSize,
        compressionRatio: inputSize / outputSize,
        savings: ((inputSize - outputSize) / inputSize) * 100
      };
    } catch (error) {
      throw new Model3DProcessingError(
        `Draco compression failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate LOD (Level of Detail) models
   */
  static async generateLOD(
    inputPath: string,
    lodConfigs: LODConfig[]
  ): Promise<Map<number, LODResult>> {
    const results = new Map<number, LODResult>();

    for (const config of lodConfigs) {
      const outputPath = inputPath.replace(
        /\.(gltf|glb)$/,
        `-lod${config.level}.$1`
      );

      const result = await this.decimateMesh(
        inputPath,
        outputPath,
        config.targetReduction
      );

      results.set(config.level, {
        path: outputPath,
        level: config.level,
        ...result
      });
    }

    return results;
  }

  /**
   * Decimate mesh (reduce polygon count)
   */
  private static async decimateMesh(
    inputPath: string,
    outputPath: string,
    targetReduction: number
  ): Promise<DecimationResult> {
    // Use MeshLab server or similar tool
    // This is a simplified example
    const command = `meshlabserver -i ${inputPath} -o ${outputPath} -s decimate.mlx -om vn`;

    try {
      await execAsync(command);

      const inputMeta = await this.getMetadata(inputPath);
      const outputMeta = await this.getMetadata(outputPath);

      return {
        originalVertices: inputMeta.vertexCount,
        decimatedVertices: outputMeta.vertexCount,
        reduction: ((inputMeta.vertexCount - outputMeta.vertexCount) / inputMeta.vertexCount) * 100
      };
    } catch (error) {
      throw new Model3DProcessingError(
        `Mesh decimation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Optimize textures in 3D model
   */
  static async optimizeTextures(
    modelPath: string,
    options: TextureOptimizationOptions = {}
  ): Promise<void> {
    const {
      maxTextureSize = 2048,
      format = 'webp',
      quality = 85
    } = options;

    const ext = path.extname(modelPath).slice(1).toLowerCase();

    if (ext !== 'gltf' && ext !== 'glb') {
      throw new Model3DProcessingError(
        'Texture optimization only supported for GLTF/GLB'
      );
    }

    const buffer = await fs.promises.readFile(modelPath);
    const gltf = await gltfPipeline.processGltf(buffer, {
      resourceDirectory: path.dirname(modelPath)
    });

    // Optimize each texture
    if (gltf.gltf.images) {
      for (const image of gltf.gltf.images) {
        if (image.uri) {
          const imagePath = path.join(path.dirname(modelPath), image.uri);
          const imageBuffer = await fs.promises.readFile(imagePath);

          // Optimize using ImageOptimizer
          const optimized = await ImageOptimizer.optimizeForWeb(imageBuffer, {
            maxWidth: maxTextureSize,
            maxHeight: maxTextureSize,
            quality,
            format
          });

          await fs.promises.writeFile(imagePath, optimized.buffer);
        }
      }
    }
  }

  /**
   * Convert model format
   */
  static async convert(
    inputPath: string,
    outputFormat: '3d-format',
    outputPath: string
  ): Promise<void> {
    // Use assimp or similar conversion tool
    const command = `assimp export ${inputPath} ${outputPath}`;

    try {
      await execAsync(command);
    } catch (error) {
      throw new Model3DProcessingError(
        `Model conversion failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Calculate bounding box
   */
  static async getBoundingBox(modelPath: string): Promise<BoundingBox> {
    const metadata = await this.getMetadata(modelPath);

    // For GLTF, parse the model and calculate bounds
    // This is a simplified version
    const buffer = await fs.promises.readFile(modelPath);
    const gltf = await gltfPipeline.processGltf(buffer);

    // Calculate from accessors
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // Iterate through all position accessors
    // (Implementation details omitted for brevity)

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        z: (minZ + maxZ) / 2
      },
      size: {
        x: maxX - minX,
        y: maxY - minY,
        z: maxZ - minZ
      }
    };
  }
}
```

---

## 6. File Operations Architecture

### 6.1 File Utilities

```typescript
/**
 * Comprehensive file operation utilities
 */
export class FileUtil {
  /**
   * Validate file upload
   */
  static validateUpload(
    file: Express.Multer.File,
    options: FileValidationOptions
  ): ValidationResult {
    const errors: string[] = [];

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(
        `File size ${file.size} bytes exceeds maximum ${options.maxSize} bytes`
      );
    }

    // Check MIME type
    if (options.allowedMimeTypes) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        errors.push(`Invalid MIME type: ${file.mimetype}`);
      }
    }

    // Check file extension
    if (options.allowedExtensions) {
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        errors.push(`Invalid file extension: ${ext}`);
      }
    }

    // Check filename
    if (options.validateFilename) {
      const validation = this.validateFilename(file.originalname);
      if (!validation.valid) {
        errors.push(validation.error!);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        error: errors.join('; ')
      };
    }

    return { valid: true };
  }

  /**
   * Validate filename (security check)
   */
  static validateFilename(filename: string): ValidationResult {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return {
        valid: false,
        error: 'Filename contains invalid characters'
      };
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return {
        valid: false,
        error: 'Filename contains null bytes'
      };
    }

    // Check length
    if (filename.length > 255) {
      return {
        valid: false,
        error: 'Filename too long (max 255 characters)'
      };
    }

    return { valid: true };
  }

  /**
   * Generate safe, unique filename
   */
  static generateSafeFilename(
    originalName: string,
    options: FilenameOptions = {}
  ): string {
    const {
      prefix = '',
      suffix = '',
      preserveExtension = true,
      addTimestamp = true,
      addRandom = true
    } = options;

    let ext = '';
    let basename = originalName;

    if (preserveExtension) {
      ext = path.extname(originalName);
      basename = path.basename(originalName, ext);
    }

    // Sanitize basename
    basename = basename
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .substring(0, 50);

    // Build filename parts
    const parts = [prefix, basename];

    if (addTimestamp) {
      parts.push(Date.now().toString());
    }

    if (addRandom) {
      parts.push(crypto.randomBytes(4).toString('hex'));
    }

    if (suffix) {
      parts.push(suffix);
    }

    return parts.filter(Boolean).join('-') + ext;
  }

  /**
   * Get file hash for deduplication
   */
  static async getFileHash(
    filePath: string,
    algorithm: HashAlgorithm = 'sha256'
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash(algorithm);
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Stream file efficiently
   */
  static createReadStream(
    filePath: string,
    options?: fs.ReadStreamOptions
  ): fs.ReadStream {
    return fs.createReadStream(filePath, options);
  }

  /**
   * Create zip archive
   */
  static async createZipArchive(
    files: ArchiveFile[],
    outputPath: string,
    options: ArchiveOptions = {}
  ): Promise<ArchiveResult> {
    const { compressionLevel = 9, comment } = options;

    const archive = archiver('zip', {
      zlib: { level: compressionLevel }
    });

    const output = fs.createWriteStream(outputPath);

    archive.pipe(output);

    // Add files
    for (const file of files) {
      if (file.buffer) {
        archive.append(file.buffer, { name: file.name });
      } else if (file.path) {
        archive.file(file.path, { name: file.name });
      }
    }

    if (comment) {
      archive.comment(comment);
    }

    await archive.finalize();

    const stats = await fs.promises.stat(outputPath);

    return {
      path: outputPath,
      size: stats.size,
      fileCount: files.length
    };
  }

  /**
   * Extract zip archive
   */
  static async extractZipArchive(
    zipPath: string,
    outputDir: string
  ): Promise<ExtractResult> {
    const extractedFiles: string[] = [];

    await fs.promises.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', async (entry) => {
          const filePath = path.join(outputDir, entry.path);

          // Security: prevent path traversal
          if (!filePath.startsWith(outputDir)) {
            entry.autodrain();
            return;
          }

          // Create directory if needed
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });

          // Extract file
          entry.pipe(fs.createWriteStream(filePath));
          extractedFiles.push(filePath);
        })
        .on('close', () => resolve({
          files: extractedFiles,
          count: extractedFiles.length
        }))
        .on('error', reject);
    });
  }
}
```

### 6.2 Temporary File Management

```typescript
/**
 * Temporary file management utilities
 */
export class TempFileManager {
  private static readonly TEMP_DIR = path.join(os.tmpdir(), 'fashion-wallet');
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize temp file manager
   */
  static async initialize(): Promise<void> {
    // Create temp directory
    await fs.promises.mkdir(this.TEMP_DIR, { recursive: true });

    // Start cleanup interval
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(
        () => this.cleanupOldFiles(),
        60 * 60 * 1000 // Every hour
      );
    }
  }

  /**
   * Create temporary file
   */
  static async createTempFile(
    prefix: string = 'temp',
    extension: string = ''
  ): Promise<TempFile> {
    const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
    const filePath = path.join(this.TEMP_DIR, filename);

    return {
      path: filePath,
      cleanup: async () => {
        try {
          await fs.promises.unlink(filePath);
        } catch (error) {
          // File may already be deleted
        }
      }
    };
  }

  /**
   * Create temporary directory
   */
  static async createTempDir(prefix: string = 'temp'): Promise<TempDirectory> {
    const dirname = `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const dirPath = path.join(this.TEMP_DIR, dirname);

    await fs.promises.mkdir(dirPath, { recursive: true });

    return {
      path: dirPath,
      cleanup: async () => {
        try {
          await fs.promises.rm(dirPath, { recursive: true, force: true });
        } catch (error) {
          // Directory may already be deleted
        }
      }
    };
  }

  /**
   * Write data to temporary file
   */
  static async writeTempFile(
    data: Buffer | string,
    extension: string = ''
  ): Promise<TempFile> {
    const tempFile = await this.createTempFile('data', extension);
    await fs.promises.writeFile(tempFile.path, data);
    return tempFile;
  }

  /**
   * Clean up old temporary files
   */
  private static async cleanupOldFiles(
    maxAgeHours: number = 24
  ): Promise<number> {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    let cleanedCount = 0;

    try {
      const files = await fs.promises.readdir(this.TEMP_DIR);

      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          if (stats.isDirectory()) {
            await fs.promises.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(filePath);
          }
          cleanedCount++;
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }

    return cleanedCount;
  }

  /**
   * Shutdown and cleanup
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

---

## 7. Storage Integration Architecture

### 7.1 S3 Utilities

```typescript
/**
 * S3 storage utilities
 */
import AWS from 'aws-sdk';

export class S3Util {
  private s3: AWS.S3;
  private config: S3Configuration;

  constructor(config: S3Configuration) {
    this.config = config;
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      signatureVersion: 'v4'
    });
  }

  /**
   * Upload file to S3
   */
  async upload(
    filePath: string,
    key: string,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult> {
    const {
      bucket = this.config.defaultBucket,
      acl = 'private',
      metadata = {},
      cacheControl,
      contentType,
      encryption = true
    } = options;

    // Read file
    const fileContent = await fs.promises.readFile(filePath);

    // Detect content type if not provided
    const finalContentType = contentType || await FileUtil.getMimeType(filePath);

    // Prepare upload parameters
    const params: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: finalContentType,
      ACL: acl,
      Metadata: metadata
    };

    if (cacheControl) {
      params.CacheControl = cacheControl;
    }

    if (encryption) {
      params.ServerSideEncryption = 'AES256';
    }

    try {
      const result = await this.s3.upload(params).promise();

      return {
        location: result.Location,
        etag: result.ETag!,
        bucket: result.Bucket,
        key: result.Key,
        versionId: result.VersionId
      };
    } catch (error) {
      throw new S3Error(
        `Failed to upload to S3: ${error.message}`,
        error
      );
    }
  }

  /**
   * Upload buffer to S3
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult> {
    const {
      bucket = this.config.defaultBucket,
      acl = 'private',
      metadata = {},
      cacheControl,
      contentType = 'application/octet-stream',
      encryption = true
    } = options;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: acl,
      Metadata: metadata
    };

    if (cacheControl) {
      params.CacheControl = cacheControl;
    }

    if (encryption) {
      params.ServerSideEncryption = 'AES256';
    }

    try {
      const result = await this.s3.upload(params).promise();

      return {
        location: result.Location,
        etag: result.ETag!,
        bucket: result.Bucket,
        key: result.Key,
        versionId: result.VersionId
      };
    } catch (error) {
      throw new S3Error(
        `Failed to upload buffer to S3: ${error.message}`,
        error
      );
    }
  }

  /**
   * Generate signed URL for download
   */
  getSignedUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): string {
    const {
      bucket = this.config.defaultBucket,
      expiresIn = 3600,
      operation = 'getObject'
    } = options;

    return this.s3.getSignedUrl(operation, {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn
    });
  }

  /**
   * Generate signed URL for upload
   */
  getSignedUploadUrl(
    key: string,
    options: SignedUrlOptions = {}
  ): string {
    const {
      bucket = this.config.defaultBucket,
      expiresIn = 3600,
      contentType
    } = options;

    const params: any = {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn
    };

    if (contentType) {
      params.ContentType = contentType;
    }

    return this.s3.getSignedUrl('putObject', params);
  }

  /**
   * Batch upload files
   */
  async batchUpload(
    files: BatchUploadFile[],
    options: S3UploadOptions = {}
  ): Promise<S3UploadResult[]> {
    const {
      concurrency = 5
    } = options;

    const results: S3UploadResult[] = [];

    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(file =>
          this.upload(file.path, file.key, {
            ...options,
            bucket: file.bucket || options.bucket
          })
        )
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Delete file from S3
   */
  async delete(
    key: string,
    bucket: string = this.config.defaultBucket
  ): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: bucket,
        Key: key
      }).promise();
    } catch (error) {
      throw new S3Error(
        `Failed to delete from S3: ${error.message}`,
        error
      );
    }
  }

  /**
   * Copy file within S3
   */
  async copy(
    sourceKey: string,
    destKey: string,
    options: S3CopyOptions = {}
  ): Promise<void> {
    const {
      sourceBucket = this.config.defaultBucket,
      destBucket = this.config.defaultBucket
    } = options;

    try {
      await this.s3.copyObject({
        Bucket: destBucket,
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: destKey
      }).promise();
    } catch (error) {
      throw new S3Error(
        `Failed to copy in S3: ${error.message}`,
        error
      );
    }
  }

  /**
   * Stream file from S3
   */
  getReadStream(
    key: string,
    bucket: string = this.config.defaultBucket
  ): NodeJS.ReadableStream {
    return this.s3.getObject({
      Bucket: bucket,
      Key: key
    }).createReadStream();
  }

  /**
   * Check if file exists
   */
  async exists(
    key: string,
    bucket: string = this.config.defaultBucket
  ): Promise<boolean> {
    try {
      await this.s3.headObject({
        Bucket: bucket,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(
    key: string,
    bucket: string = this.config.defaultBucket
  ): Promise<S3Metadata> {
    try {
      const result = await this.s3.headObject({
        Bucket: bucket,
        Key: key
      }).promise();

      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        metadata: result.Metadata
      };
    } catch (error) {
      throw new S3Error(
        `Failed to get S3 metadata: ${error.message}`,
        error
      );
    }
  }
}
```

---

## 8. Error Handling

### 8.1 Custom Error Classes

```typescript
/**
 * Media processing error hierarchy
 */
export class MediaProcessingError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 500, 'MEDIA_PROCESSING_ERROR');
  }
}

export class ImageProcessingError extends MediaProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'IMAGE_PROCESSING_ERROR';
  }
}

export class VideoProcessingError extends MediaProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'VIDEO_PROCESSING_ERROR';
  }
}

export class Model3DProcessingError extends MediaProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'MODEL_3D_PROCESSING_ERROR';
  }
}

export class S3Error extends MediaProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'S3_ERROR';
  }
}

export class ImageConversionError extends ImageProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'IMAGE_CONVERSION_ERROR';
  }
}

export class ThumbnailGenerationError extends ImageProcessingError {
  constructor(message: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'THUMBNAIL_GENERATION_ERROR';
  }
}
```

---

## 9. Testing Support

### 9.1 Test Utilities

```typescript
/**
 * Media testing utilities
 */
export class MediaTestUtil {
  /**
   * Generate test image
   */
  static async generateTestImage(
    width: number,
    height: number,
    format: ImageFormat = 'png'
  ): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    })
      .toFormat(format)
      .toBuffer();
  }

  /**
   * Create mock video file
   */
  static async createMockVideo(
    outputPath: string,
    duration: number = 5
  ): Promise<void> {
    // Generate test video using FFmpeg
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`testsrc=duration=${duration}:size=640x360:rate=30`)
        .inputFormat('lavfi')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Compare images
   */
  static async compareImages(
    image1: Buffer,
    image2: Buffer
  ): Promise<boolean> {
    const hash1 = await ImageAnalyzer.getPerceptualHash(image1);
    const hash2 = await ImageAnalyzer.getPerceptualHash(image2);
    return hash1 === hash2;
  }
}
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-utils-01, arch-utils-00

---

**End of Media & File Processing Utilities Architecture Document**
