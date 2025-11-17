# Utilities Specification: Media & File Processing Utilities

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Utilities Specification
**Status**: Draft
**Spec ID**: spec-utils-01
**Related Arch**: arch-utils-01

---

## 1. Executive Summary

This specification defines the media and file processing utility modules for the Fashion Wallet backend. These utilities provide comprehensive functionality for handling images, videos, 3D models, file operations, and media transformations. Given the application's heavy reliance on visual content (avatar photos, 3D models, fabric textures, design renders), these utilities are critical for performance and user experience.

---

## 2. Utility Categories

```yaml
Categories:
  Image Processing:
    - Image manipulation
    - Format conversion
    - Optimization
    - Thumbnail generation
    - Metadata extraction
    - Image validation

  Video Processing:
    - Video encoding
    - Thumbnail extraction
    - Format conversion
    - Video compression
    - Stream processing

  3D Model Processing:
    - Model validation
    - Format conversion
    - Compression (Draco)
    - LOD generation
    - Texture optimization
    - Model metadata

  File Operations:
    - File upload/download
    - File validation
    - MIME type detection
    - File streaming
    - Temporary file management
    - Archive operations

  Media Storage:
    - S3 integration
    - CDN integration
    - Signed URLs
    - Batch operations
    - Storage optimization

  Media Analysis:
    - Dimension extraction
    - Color analysis
    - Quality assessment
    - Format detection
    - Content validation
```

---

## 3. Image Processing Utilities

### 3.1 Image Manipulation

```typescript
/**
 * Comprehensive image processing utilities
 */
export class ImageUtil {
  /**
   * Resize image with various strategies
   */
  static async resize(
    input: Buffer | string,
    options: ResizeOptions
  ): Promise<Buffer> {
    const {
      width,
      height,
      fit = 'cover', // cover, contain, fill, inside, outside
      position = 'center',
      background = { r: 255, g: 255, b: 255, alpha: 1 }
    } = options;

    return sharp(input)
      .resize(width, height, {
        fit,
        position,
        background
      })
      .toBuffer();
  }

  /**
   * Generate multiple image sizes (responsive images)
   */
  static async generateSizes(
    input: Buffer,
    sizes: ImageSize[]
  ): Promise<Map<string, Buffer>> {
    const results = new Map<string, Buffer>();

    for (const size of sizes) {
      const resized = await this.resize(input, size);
      results.set(size.name, resized);
    }

    return results;
  }

  /**
   * Crop image
   */
  static async crop(
    input: Buffer,
    options: CropOptions
  ): Promise<Buffer> {
    const { x, y, width, height } = options;

    return sharp(input)
      .extract({ left: x, top: y, width, height })
      .toBuffer();
  }

  /**
   * Smart crop (focus on subject)
   */
  static async smartCrop(
    input: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    return sharp(input)
      .resize(width, height, {
        fit: 'cover',
        position: 'attention' // Use attention-based cropping
      })
      .toBuffer();
  }

  /**
   * Rotate image
   */
  static async rotate(
    input: Buffer,
    angle: number
  ): Promise<Buffer> {
    return sharp(input)
      .rotate(angle)
      .toBuffer();
  }

  /**
   * Flip/mirror image
   */
  static async flip(
    input: Buffer,
    direction: 'horizontal' | 'vertical'
  ): Promise<Buffer> {
    if (direction === 'horizontal') {
      return sharp(input).flop().toBuffer();
    } else {
      return sharp(input).flip().toBuffer();
    }
  }

  /**
   * Apply filters
   */
  static async applyFilter(
    input: Buffer,
    filter: ImageFilter
  ): Promise<Buffer> {
    let image = sharp(input);

    switch (filter) {
      case 'grayscale':
        image = image.grayscale();
        break;
      case 'blur':
        image = image.blur(10);
        break;
      case 'sharpen':
        image = image.sharpen();
        break;
      case 'sepia':
        image = image.tint({ r: 112, g: 66, b: 20 });
        break;
    }

    return image.toBuffer();
  }

  /**
   * Composite images (overlay)
   */
  static async composite(
    background: Buffer,
    overlay: Buffer,
    options: CompositeOptions
  ): Promise<Buffer> {
    return sharp(background)
      .composite([
        {
          input: overlay,
          top: options.y || 0,
          left: options.x || 0,
          blend: options.blend || 'over'
        }
      ])
      .toBuffer();
  }

  /**
   * Add watermark
   */
  static async watermark(
    input: Buffer,
    watermark: Buffer,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  ): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    const watermarkMeta = await sharp(watermark).metadata();

    const positions = {
      'top-left': { top: 10, left: 10 },
      'top-right': { top: 10, left: metadata.width! - watermarkMeta.width! - 10 },
      'bottom-left': { top: metadata.height! - watermarkMeta.height! - 10, left: 10 },
      'bottom-right': {
        top: metadata.height! - watermarkMeta.height! - 10,
        left: metadata.width! - watermarkMeta.width! - 10
      },
      'center': {
        top: Math.floor((metadata.height! - watermarkMeta.height!) / 2),
        left: Math.floor((metadata.width! - watermarkMeta.width!) / 2)
      }
    };

    const pos = positions[position];

    return sharp(input)
      .composite([
        {
          input: watermark,
          ...pos
        }
      ])
      .toBuffer();
  }
}
```

### 3.2 Image Format Conversion

```typescript
export class ImageConverter {
  /**
   * Convert image format
   */
  static async convert(
    input: Buffer,
    format: ImageFormat,
    options?: ConversionOptions
  ): Promise<Buffer> {
    const quality = options?.quality || 80;

    switch (format) {
      case 'jpeg':
        return sharp(input)
          .jpeg({ quality, progressive: true })
          .toBuffer();

      case 'png':
        return sharp(input)
          .png({ compressionLevel: 9 })
          .toBuffer();

      case 'webp':
        return sharp(input)
          .webp({ quality, effort: 6 })
          .toBuffer();

      case 'avif':
        return sharp(input)
          .avif({ quality })
          .toBuffer();

      case 'tiff':
        return sharp(input)
          .tiff({ compression: 'lzw' })
          .toBuffer();

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert to modern formats (WebP, AVIF)
   */
  static async convertToModern(
    input: Buffer
  ): Promise<{ webp: Buffer; avif: Buffer }> {
    const [webp, avif] = await Promise.all([
      this.convert(input, 'webp', { quality: 85 }),
      this.convert(input, 'avif', { quality: 80 })
    ]);

    return { webp, avif };
  }

  /**
   * Auto-detect and convert
   */
  static async autoConvert(
    input: Buffer,
    targetFormat?: ImageFormat
  ): Promise<Buffer> {
    const metadata = await sharp(input).metadata();
    const sourceFormat = metadata.format;

    if (!targetFormat) {
      // Auto-select best format
      targetFormat = 'webp'; // Default to WebP
    }

    if (sourceFormat === targetFormat) {
      return input; // No conversion needed
    }

    return this.convert(input, targetFormat);
  }
}
```

### 3.3 Image Optimization

```typescript
export class ImageOptimizer {
  /**
   * Optimize image for web
   */
  static async optimizeForWeb(
    input: Buffer,
    options?: OptimizationOptions
  ): Promise<Buffer> {
    const maxWidth = options?.maxWidth || 2048;
    const quality = options?.quality || 85;

    const metadata = await sharp(input).metadata();

    let image = sharp(input);

    // Resize if too large
    if (metadata.width! > maxWidth) {
      image = image.resize(maxWidth, null, {
        withoutEnlargement: true
      });
    }

    // Optimize based on format
    if (metadata.format === 'jpeg') {
      image = image.jpeg({
        quality,
        progressive: true,
        mozjpeg: true
      });
    } else if (metadata.format === 'png') {
      image = image.png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true
      });
    }

    return image.toBuffer();
  }

  /**
   * Generate progressive JPEG
   */
  static async generateProgressive(
    input: Buffer,
    quality: number = 85
  ): Promise<Buffer> {
    return sharp(input)
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
  }

  /**
   * Compress image aggressively
   */
  static async compress(
    input: Buffer,
    targetSizeKB: number
  ): Promise<Buffer> {
    let quality = 85;
    let result = await sharp(input)
      .jpeg({ quality })
      .toBuffer();

    // Binary search for optimal quality
    let minQuality = 10;
    let maxQuality = 100;

    while (result.byteLength > targetSizeKB * 1024 && minQuality < maxQuality) {
      quality = Math.floor((minQuality + maxQuality) / 2);

      result = await sharp(input)
        .jpeg({ quality })
        .toBuffer();

      if (result.byteLength > targetSizeKB * 1024) {
        maxQuality = quality - 1;
      } else {
        minQuality = quality + 1;
      }
    }

    return result;
  }

  /**
   * Strip metadata (reduce file size)
   */
  static async stripMetadata(input: Buffer): Promise<Buffer> {
    return sharp(input)
      .withMetadata({
        // Remove all EXIF data
        exif: {},
        icc: undefined,
        xmp: undefined,
        iptc: undefined
      })
      .toBuffer();
  }
}
```

### 3.4 Thumbnail Generation

```typescript
export class ThumbnailGenerator {
  /**
   * Generate single thumbnail
   */
  static async generate(
    input: Buffer,
    width: number,
    height: number,
    options?: ThumbnailOptions
  ): Promise<Buffer> {
    const fit = options?.fit || 'cover';
    const position = options?.position || 'center';
    const format = options?.format || 'jpeg';
    const quality = options?.quality || 80;

    return sharp(input)
      .resize(width, height, { fit, position })
      .toFormat(format, { quality })
      .toBuffer();
  }

  /**
   * Generate multiple thumbnail sizes
   */
  static async generateMultiple(
    input: Buffer,
    sizes: ThumbnailSize[]
  ): Promise<Map<string, Buffer>> {
    const thumbnails = new Map<string, Buffer>();

    await Promise.all(
      sizes.map(async (size) => {
        const thumbnail = await this.generate(
          input,
          size.width,
          size.height,
          size.options
        );
        thumbnails.set(size.name, thumbnail);
      })
    );

    return thumbnails;
  }

  /**
   * Generate smart thumbnail (AI-based cropping)
   */
  static async generateSmart(
    input: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    // Use attention-based cropping
    return sharp(input)
      .resize(width, height, {
        fit: 'cover',
        position: 'attention'
      })
      .jpeg({ quality: 85 })
      .toBuffer();
  }

  /**
   * Generate sprite sheet from multiple images
   */
  static async generateSpriteSheet(
    images: Buffer[],
    columns: number
  ): Promise<Buffer> {
    // Calculate dimensions
    const firstImage = await sharp(images[0]).metadata();
    const imageWidth = firstImage.width!;
    const imageHeight = firstImage.height!;

    const rows = Math.ceil(images.length / columns);
    const spriteWidth = imageWidth * columns;
    const spriteHeight = imageHeight * rows;

    // Create composite
    const compositeImages = images.map((img, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      return {
        input: img,
        top: row * imageHeight,
        left: col * imageWidth
      };
    });

    return sharp({
      create: {
        width: spriteWidth,
        height: spriteHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(compositeImages)
      .png()
      .toBuffer();
  }
}
```

---

## 4. Video Processing Utilities

### 4.1 Video Manipulation

```typescript
import ffmpeg from 'fluent-ffmpeg';

export class VideoUtil {
  /**
   * Get video metadata
   */
  static async getMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) reject(err);
        else {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          resolve({
            duration: metadata.format.duration || 0,
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: eval(videoStream?.r_frame_rate || '0'),
            codec: videoStream?.codec_name || '',
            bitrate: metadata.format.bit_rate || 0,
            size: metadata.format.size || 0
          });
        }
      });
    });
  }

  /**
   * Extract frame from video
   */
  static async extractFrame(
    videoPath: string,
    timestamp: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: outputPath,
          size: '1920x1080'
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }

  /**
   * Generate video thumbnail
   */
  static async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timestamp?: number
  ): Promise<void> {
    const metadata = await this.getMetadata(videoPath);
    const time = timestamp || metadata.duration / 2;

    return this.extractFrame(videoPath, time, outputPath);
  }

  /**
   * Convert video format
   */
  static async convert(
    inputPath: string,
    outputPath: string,
    options: VideoConvertOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (options.codec) {
        command = command.videoCodec(options.codec);
      }

      if (options.bitrate) {
        command = command.videoBitrate(options.bitrate);
      }

      if (options.width && options.height) {
        command = command.size(`${options.width}x${options.height}`);
      }

      if (options.fps) {
        command = command.fps(options.fps);
      }

      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Compress video
   */
  static async compress(
    inputPath: string,
    outputPath: string,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const crf = {
      low: 28,
      medium: 23,
      high: 18
    };

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .outputOptions([
          `-crf ${crf[quality]}`,
          '-preset medium',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Create video from images (slideshow)
   */
  static async createFromImages(
    imagePaths: string[],
    outputPath: string,
    fps: number = 30,
    duration: number = 5
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const inputPattern = imagePaths[0].replace(/\d+/, '%d');

      ffmpeg()
        .input(inputPattern)
        .inputFPS(1 / duration)
        .outputFPS(fps)
        .videoCodec('libx264')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
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
        .on('error', reject)
        .run();
    });
  }

  /**
   * Generate 360° turntable video from frames
   */
  static async generate360Video(
    framesPath: string,
    outputPath: string,
    fps: number = 24
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(framesPath)
        .inputFPS(fps)
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-preset slow',
          '-crf 18',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }
}
```

---

## 5. 3D Model Processing Utilities

### 5.1 Model Operations

```typescript
export class Model3DUtil {
  /**
   * Validate 3D model format
   */
  static async validate(
    filePath: string,
    allowedFormats: string[] = ['gltf', 'glb', 'obj', 'fbx']
  ): Promise<ValidationResult> {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    if (!allowedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported format: ${ext}. Allowed: ${allowedFormats.join(', ')}`
      };
    }

    // Check file size
    const stats = await fs.promises.stat(filePath);
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File too large: ${stats.size} bytes. Max: ${maxSize} bytes`
      };
    }

    return { valid: true };
  }

  /**
   * Get model metadata
   */
  static async getMetadata(filePath: string): Promise<Model3DMetadata> {
    const ext = path.extname(filePath).slice(1).toLowerCase();

    // For GLTF/GLB files
    if (ext === 'gltf' || ext === 'glb') {
      const gltf = await this.loadGLTF(filePath);

      return {
        format: ext,
        vertexCount: this.countVertices(gltf),
        faceCount: this.countFaces(gltf),
        meshCount: gltf.meshes?.length || 0,
        textureCount: gltf.textures?.length || 0,
        materialCount: gltf.materials?.length || 0,
        animations: gltf.animations?.length || 0,
        fileSize: (await fs.promises.stat(filePath)).size
      };
    }

    throw new Error(`Metadata extraction not supported for ${ext}`);
  }

  /**
   * Compress model using Draco
   */
  static async compressDraco(
    inputPath: string,
    outputPath: string,
    compressionLevel: number = 7
  ): Promise<void> {
    // Use gltf-pipeline for Draco compression
    const command = `gltf-pipeline -i ${inputPath} -o ${outputPath} -d -c ${compressionLevel}`;

    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * Generate LOD (Level of Detail) models
   */
  static async generateLOD(
    inputPath: string,
    lodLevels: LODLevel[]
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const level of lodLevels) {
      const outputPath = inputPath.replace(
        /\.(gltf|glb)$/,
        `-lod${level.index}.$1`
      );

      await this.decimateMesh(
        inputPath,
        outputPath,
        level.decimationRatio
      );

      results.set(`lod${level.index}`, outputPath);
    }

    return results;
  }

  /**
   * Optimize textures for 3D model
   */
  static async optimizeTextures(
    modelPath: string,
    maxTextureSize: number = 2048
  ): Promise<void> {
    const gltf = await this.loadGLTF(modelPath);

    if (!gltf.images) return;

    for (const image of gltf.images) {
      if (image.uri) {
        const imagePath = path.join(path.dirname(modelPath), image.uri);
        const buffer = await fs.promises.readFile(imagePath);

        // Resize if too large
        const optimized = await ImageUtil.resize(buffer, {
          width: maxTextureSize,
          height: maxTextureSize,
          fit: 'inside'
        });

        await fs.promises.writeFile(imagePath, optimized);
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
    // Use assimp or similar tool for conversion
    const command = `assimp export ${inputPath} ${outputPath} -f ${outputFormat}`;

    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  /**
   * Merge multiple 3D models
   */
  static async merge(
    modelPaths: string[],
    outputPath: string
  ): Promise<void> {
    // Load all models
    const models = await Promise.all(
      modelPaths.map(p => this.loadGLTF(p))
    );

    // Merge geometries
    const merged = this.mergeGLTF(models);

    // Save merged model
    await fs.promises.writeFile(
      outputPath,
      JSON.stringify(merged)
    );
  }

  /**
   * Calculate model bounding box
   */
  static async getBoundingBox(
    modelPath: string
  ): Promise<BoundingBox> {
    const metadata = await this.getMetadata(modelPath);

    // Calculate from vertices
    // This is a simplified version
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 100, y: 100, z: 100 },
      center: { x: 50, y: 50, z: 50 },
      size: { x: 100, y: 100, z: 100 }
    };
  }
}
```

---

## 6. File Operation Utilities

### 6.1 File Management

```typescript
export class FileUtil {
  /**
   * Validate file upload
   */
  static validateUpload(
    file: Express.Multer.File,
    options: FileValidationOptions
  ): ValidationResult {
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      return {
        valid: false,
        error: `File too large: ${file.size} bytes. Max: ${options.maxSize} bytes`
      };
    }

    // Check file type
    if (options.allowedMimeTypes) {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        return {
          valid: false,
          error: `Invalid file type: ${file.mimetype}`
        };
      }
    }

    // Check file extension
    if (options.allowedExtensions) {
      const ext = path.extname(file.originalname).slice(1).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        return {
          valid: false,
          error: `Invalid file extension: ${ext}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get MIME type from file
   */
  static async getMimeType(filePath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    const result = await fileTypeFromBuffer(buffer);
    return result?.mime || 'application/octet-stream';
  }

  /**
   * Detect file type from buffer
   */
  static async detectFileType(buffer: Buffer): Promise<FileType | null> {
    return fileTypeFromBuffer(buffer);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(
    originalName: string,
    prefix?: string
  ): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);

    return `${prefix || ''}${name}-${timestamp}-${random}${ext}`;
  }

  /**
   * Get file hash (for deduplication)
   */
  static async getFileHash(
    filePath: string,
    algorithm: 'md5' | 'sha256' = 'sha256'
  ): Promise<string> {
    const buffer = await fs.promises.readFile(filePath);
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }

  /**
   * Stream file to destination
   */
  static async streamFile(
    source: string,
    destination: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(source);
      const writeStream = fs.createWriteStream(destination);

      readStream.pipe(writeStream);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  }

  /**
   * Create zip archive
   */
  static async createZip(
    files: { path: string; name: string }[],
    outputPath: string
  ): Promise<void> {
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const output = fs.createWriteStream(outputPath);

    archive.pipe(output);

    for (const file of files) {
      archive.file(file.path, { name: file.name });
    }

    await archive.finalize();
  }

  /**
   * Extract zip archive
   */
  static async extractZip(
    zipPath: string,
    outputDir: string
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const files: string[] = [];

      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          const filePath = path.join(outputDir, entry.path);
          files.push(filePath);

          entry.pipe(fs.createWriteStream(filePath));
        })
        .on('close', () => resolve(files))
        .on('error', reject);
    });
  }

  /**
   * Clean temporary files
   */
  static async cleanTempFiles(
    directory: string,
    olderThanHours: number = 24
  ): Promise<number> {
    const files = await fs.promises.readdir(directory);
    const now = Date.now();
    const maxAge = olderThanHours * 60 * 60 * 1000;

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.promises.unlink(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
```

---

## 7. Storage Integration Utilities

### 7.1 S3 Operations

```typescript
export class S3Util {
  private s3: AWS.S3;

  constructor(config: S3Config) {
    this.s3 = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
  }

  /**
   * Upload file to S3
   */
  async upload(
    filePath: string,
    key: string,
    bucket: string,
    options?: S3UploadOptions
  ): Promise<S3UploadResult> {
    const fileContent = await fs.promises.readFile(filePath);
    const contentType = await FileUtil.getMimeType(filePath);

    const params: AWS.S3.PutObjectRequest = {
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      ACL: options?.acl || 'private',
      Metadata: options?.metadata,
      CacheControl: options?.cacheControl,
      ServerSideEncryption: 'AES256'
    };

    const result = await this.s3.upload(params).promise();

    return {
      location: result.Location,
      etag: result.ETag!,
      bucket: result.Bucket,
      key: result.Key
    };
  }

  /**
   * Generate signed URL
   */
  getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600
  ): string {
    return this.s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: expiresIn
    });
  }

  /**
   * Batch upload files
   */
  async batchUpload(
    files: { path: string; key: string }[],
    bucket: string
  ): Promise<S3UploadResult[]> {
    return Promise.all(
      files.map(file => this.upload(file.path, file.key, bucket))
    );
  }

  /**
   * Delete file from S3
   */
  async delete(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: bucket,
      Key: key
    }).promise();
  }

  /**
   * Copy file within S3
   */
  async copy(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    await this.s3.copyObject({
      Bucket: destBucket,
      CopySource: `${sourceBucket}/${sourceKey}`,
      Key: destKey
    }).promise();
  }

  /**
   * Stream file from S3
   */
  getStream(bucket: string, key: string): NodeJS.ReadableStream {
    return this.s3.getObject({
      Bucket: bucket,
      Key: key
    }).createReadStream();
  }
}
```

---

## 8. Media Analysis Utilities

### 8.1 Image Analysis

```typescript
export class ImageAnalyzer {
  /**
   * Extract dominant colors
   */
  static async extractColors(
    input: Buffer,
    count: number = 5
  ): Promise<Color[]> {
    const { data, info } = await sharp(input)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Use color quantization algorithm
    const colors = this.quantizeColors(data, count);

    return colors.map(c => ({
      r: c[0],
      g: c[1],
      b: c[2],
      hex: this.rgbToHex(c[0], c[1], c[2])
    }));
  }

  /**
   * Calculate image perceptual hash (for similarity detection)
   */
  static async getPerceptualHash(input: Buffer): Promise<string> {
    // Resize to 8x8
    const buffer = await sharp(input)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate average
    const avg = buffer.reduce((sum, val) => sum + val, 0) / buffer.length;

    // Generate hash
    let hash = '';
    for (const pixel of buffer) {
      hash += pixel > avg ? '1' : '0';
    }

    return hash;
  }

  /**
   * Compare image similarity
   */
  static async compareSimilarity(
    image1: Buffer,
    image2: Buffer
  ): Promise<number> {
    const hash1 = await this.getPerceptualHash(image1);
    const hash2 = await this.getPerceptualHash(image2);

    // Calculate Hamming distance
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }

    // Return similarity percentage
    return ((hash1.length - distance) / hash1.length) * 100;
  }

  /**
   * Analyze image quality
   */
  static async analyzeQuality(input: Buffer): Promise<QualityMetrics> {
    const metadata = await sharp(input).metadata();
    const stats = await sharp(input).stats();

    return {
      resolution: metadata.width! * metadata.height!,
      aspectRatio: metadata.width! / metadata.height!,
      sharpness: this.calculateSharpness(stats),
      brightness: stats.channels.reduce((sum, c) => sum + c.mean, 0) / stats.channels.length,
      contrast: stats.channels.reduce((sum, c) => sum + c.stdev, 0) / stats.channels.length
    };
  }

  /**
   * Detect faces in image
   */
  static async detectFaces(input: Buffer): Promise<FaceDetection[]> {
    // Integration with face detection library (e.g., face-api.js)
    // This is a placeholder
    return [];
  }
}
```

---

## 9. Testing Requirements

```yaml
Unit Tests (>90% coverage required):
  Image Processing:
    - Resize operations
    - Format conversions
    - Compression algorithms
    - Thumbnail generation
    - Watermarking

  Video Processing:
    - Metadata extraction
    - Frame extraction
    - Video conversion
    - Compression

  3D Model Processing:
    - Format validation
    - Metadata extraction
    - Compression
    - LOD generation

  File Operations:
    - Upload validation
    - MIME type detection
    - File streaming
    - Archive operations

Integration Tests:
  - S3 upload/download
  - Image pipeline end-to-end
  - Video processing pipeline
  - 3D model optimization flow

Performance Tests:
  - Image processing benchmarks
  - Video encoding speed
  - 3D model compression ratios
  - Concurrent upload handling
```

---

## 10. Success Criteria

```yaml
Acceptance Criteria:
  - All media operations are asynchronous
  - Support for multiple formats (images, videos, 3D)
  - Efficient memory usage (streaming where possible)
  - >90% test coverage
  - Zero memory leaks
  - Performance benchmarks met
  - Comprehensive error handling
  - Progress tracking for long operations

Performance Benchmarks:
  - Image resize: <100ms for 4K image
  - Thumbnail generation: <50ms
  - Video compression: real-time or faster
  - 3D model compression: >50% size reduction
  - S3 upload: >10MB/s
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Infrastructure Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: spec-utils-00

---

**End of Media & File Processing Utilities Specification**
