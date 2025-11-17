import sharp from 'sharp';

/**
 * Optimize options
 */
export interface OptimizeOptions {
  quality?: number;
  progressive?: boolean;
  lossless?: boolean;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  maxWidth?: number;
  maxHeight?: number;
  stripMetadata?: boolean;
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  buffer: Buffer;
  originalSize: number;
  optimizedSize: number;
  savingsBytes: number;
  savingsPercentage: number;
  format: string;
}

/**
 * Image Optimizer Utility
 * Provides image compression and optimization
 */
export class ImageOptimizer {
  /**
   * Optimize an image with specified options
   * @param image - Image buffer
   * @param options - Optimization options
   * @returns Optimized image buffer
   */
  static async optimize(image: Buffer, options: OptimizeOptions = {}): Promise<Buffer> {
    try {
      const {
        quality = 85,
        progressive = true,
        lossless = false,
        format,
        maxWidth,
        maxHeight,
        stripMetadata = true,
      } = options;

      let pipeline = sharp(image);

      // Resize if max dimensions specified
      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Strip metadata if requested
      if (stripMetadata) {
        pipeline = pipeline.withMetadata({
          orientation: undefined,
          exif: {},
        });
      }

      // Apply format-specific optimization
      if (format) {
        switch (format) {
          case 'jpeg':
            pipeline = pipeline.jpeg({
              quality,
              progressive,
              mozjpeg: true,
            });
            break;
          case 'png':
            pipeline = pipeline.png({
              quality,
              progressive,
              compressionLevel: 9,
            });
            break;
          case 'webp':
            pipeline = pipeline.webp({
              quality,
              lossless,
            });
            break;
          case 'avif':
            pipeline = pipeline.avif({
              quality,
              lossless,
            });
            break;
        }
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Optimize image with detailed result
   * @param image - Image buffer
   * @param options - Optimization options
   * @returns Optimization result with statistics
   */
  static async optimizeWithStats(
    image: Buffer,
    options: OptimizeOptions = {},
  ): Promise<OptimizationResult> {
    try {
      const originalSize = image.length;
      const optimizedBuffer = await this.optimize(image, options);
      const optimizedSize = optimizedBuffer.length;

      const savingsBytes = originalSize - optimizedSize;
      const savingsPercentage = (savingsBytes / originalSize) * 100;

      const metadata = await sharp(optimizedBuffer).metadata();

      return {
        buffer: optimizedBuffer,
        originalSize,
        optimizedSize,
        savingsBytes,
        savingsPercentage,
        format: metadata.format || 'unknown',
      };
    } catch (error) {
      throw new Error(
        `Failed to optimize image with stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compress image with lossy compression
   * @param image - Image buffer
   * @param quality - Quality (1-100)
   * @returns Compressed image buffer
   */
  static async compressLossy(image: Buffer, quality: number = 80): Promise<Buffer> {
    try {
      const metadata = await sharp(image).metadata();
      const format = metadata.format || 'jpeg';

      return await this.optimize(image, {
        quality,
        lossless: false,
        format: format as any,
      });
    } catch (error) {
      throw new Error(
        `Failed to compress (lossy): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compress image with lossless compression
   * @param image - Image buffer
   * @returns Compressed image buffer
   */
  static async compressLossless(image: Buffer): Promise<Buffer> {
    try {
      return await this.optimize(image, {
        lossless: true,
        format: 'webp',
      });
    } catch (error) {
      throw new Error(
        `Failed to compress (lossless): ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert image to WebP format
   * @param image - Image buffer
   * @param quality - Quality (1-100, default: 85)
   * @param lossless - Use lossless compression (default: false)
   * @returns WebP image buffer
   */
  static async convertToWebP(
    image: Buffer,
    quality: number = 85,
    lossless: boolean = false,
  ): Promise<Buffer> {
    try {
      return await sharp(image)
        .webp({ quality, lossless })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to convert to WebP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert image to AVIF format (next-gen format)
   * @param image - Image buffer
   * @param quality - Quality (1-100, default: 80)
   * @param lossless - Use lossless compression (default: false)
   * @returns AVIF image buffer
   */
  static async convertToAVIF(
    image: Buffer,
    quality: number = 80,
    lossless: boolean = false,
  ): Promise<Buffer> {
    try {
      return await sharp(image)
        .avif({ quality, lossless })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to convert to AVIF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate progressive JPEG
   * @param image - Image buffer
   * @param quality - Quality (1-100, default: 85)
   * @returns Progressive JPEG buffer
   */
  static async generateProgressive(image: Buffer, quality: number = 85): Promise<Buffer> {
    try {
      return await sharp(image)
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate progressive JPEG: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate optimization savings
   * @param original - Original image buffer
   * @param optimized - Optimized image buffer
   * @returns Savings percentage
   */
  static async calculateSavings(original: Buffer, optimized: Buffer): Promise<number> {
    const originalSize = original.length;
    const optimizedSize = optimized.length;
    const savings = originalSize - optimizedSize;

    return (savings / originalSize) * 100;
  }

  /**
   * Optimize for web delivery with multiple formats
   * @param image - Image buffer
   * @returns Object with multiple format versions
   */
  static async optimizeForWeb(image: Buffer): Promise<{
    jpeg: Buffer;
    webp: Buffer;
    avif?: Buffer;
  }> {
    try {
      const [jpeg, webp] = await Promise.all([
        this.generateProgressive(image, 85),
        this.convertToWebP(image, 85),
      ]);

      // Try to generate AVIF (may not be available in all environments)
      let avif: Buffer | undefined;
      try {
        avif = await this.convertToAVIF(image, 80);
      } catch {
        // AVIF not supported, skip
      }

      return { jpeg, webp, avif };
    } catch (error) {
      throw new Error(
        `Failed to optimize for web: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Adaptive optimization based on image content
   * @param image - Image buffer
   * @returns Optimized image buffer with best format
   */
  static async adaptiveOptimize(image: Buffer): Promise<{
    buffer: Buffer;
    format: string;
    quality: number;
  }> {
    try {
      const metadata = await sharp(image).metadata();

      // Determine best format and quality based on image characteristics
      let format: 'jpeg' | 'png' | 'webp' = 'jpeg';
      let quality = 85;

      // Use PNG for images with transparency
      if (metadata.hasAlpha) {
        format = 'webp'; // WebP handles transparency better than PNG for photos
        quality = 90;
      }

      // Use higher quality for small images
      if (metadata.width && metadata.height && metadata.width * metadata.height < 500000) {
        quality = 90;
      }

      const optimized = await this.optimize(image, { format, quality });

      return {
        buffer: optimized,
        format,
        quality,
      };
    } catch (error) {
      throw new Error(
        `Failed to adaptive optimize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Batch optimize multiple images
   * @param images - Array of image buffers
   * @param options - Optimization options
   * @returns Array of optimized image buffers
   */
  static async batchOptimize(
    images: Buffer[],
    options: OptimizeOptions = {},
  ): Promise<Buffer[]> {
    try {
      return await Promise.all(
        images.map((image) => this.optimize(image, options)),
      );
    } catch (error) {
      throw new Error(
        `Failed to batch optimize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compress image to target file size
   * @param image - Image buffer
   * @param targetSizeKB - Target size in kilobytes
   * @param maxAttempts - Maximum optimization attempts (default: 5)
   * @returns Compressed image buffer
   */
  static async compressToSize(
    image: Buffer,
    targetSizeKB: number,
    maxAttempts: number = 5,
  ): Promise<Buffer> {
    try {
      const targetBytes = targetSizeKB * 1024;
      let quality = 90;
      let attempt = 0;
      let result = image;

      while (attempt < maxAttempts && result.length > targetBytes) {
        result = await this.compressLossy(image, quality);
        quality -= 10;
        attempt++;

        if (quality < 10) {
          break;
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to compress to size: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
