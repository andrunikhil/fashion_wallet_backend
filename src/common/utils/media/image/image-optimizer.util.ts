/**
 * Image Optimizer Utility
 * Image optimization for web delivery
 */

import sharp from 'sharp';
import {
  OptimizationOptions,
  ImageFormat,
  ImageMetadata,
} from '../../../types/media.types';
import { ImageUtil } from './image.util';
import { ImageConverter } from './image-converter.util';

export class ImageOptimizer {
  /**
   * Optimize image for web
   * @param input - Image buffer
   * @param options - Optimization options
   * @returns Optimized image buffer
   */
  static async optimize(
    input: Buffer,
    options: OptimizationOptions = {},
  ): Promise<Buffer> {
    try {
      let processedBuffer = input;
      const metadata = await ImageUtil.getMetadata(input);

      // Resize if maxWidth or maxHeight is specified
      if (options.maxWidth || options.maxHeight) {
        const resizeOpts: any = {};
        if (options.maxWidth) resizeOpts.width = options.maxWidth;
        if (options.maxHeight) resizeOpts.height = options.maxHeight;
        resizeOpts.fit = 'inside';
        resizeOpts.withoutEnlargement = true;

        processedBuffer = await ImageUtil.resize(processedBuffer, resizeOpts);
      }

      // Apply format-specific optimization
      const formatString = metadata.format?.toLowerCase() || 'jpeg';
      const quality = options.quality ?? 80;
      const progressive = options.progressive ?? true;
      const stripMetadata = options.stripMetadata ?? true;

      let optimizedBuffer: Buffer;

      if (formatString === 'jpeg' || formatString === 'jpg') {
        optimizedBuffer = await sharp(processedBuffer)
          .jpeg({
            quality,
            progressive,
            mozjpeg: true,
          })
          .toBuffer();
      } else if (formatString === 'png') {
        optimizedBuffer = await sharp(processedBuffer)
          .png({
            compressionLevel: 9,
            progressive,
          })
          .toBuffer();
      } else if (formatString === 'webp') {
        optimizedBuffer = await sharp(processedBuffer)
          .webp({
            quality,
            effort: 6,
          })
          .toBuffer();
      } else if (formatString === 'avif') {
        optimizedBuffer = await sharp(processedBuffer)
          .avif({
            quality,
            effort: 9,
          })
          .toBuffer();
      } else {
        // Default to JPEG for unknown formats
        optimizedBuffer = await sharp(processedBuffer)
          .jpeg({
            quality,
            progressive,
            mozjpeg: true,
          })
          .toBuffer();
      }

      // Strip metadata if requested
      if (stripMetadata) {
        optimizedBuffer = await sharp(optimizedBuffer)
          .withMetadata({
            // Remove all metadata except orientation
            orientation: metadata.orientation,
          })
          .toBuffer();
      }

      // If target size is specified, iteratively reduce quality
      if (options.targetSizeKB) {
        const targetSize = options.targetSizeKB * 1024;
        optimizedBuffer = await this.optimizeToTargetSize(
          optimizedBuffer,
          targetSize,
          formatString,
        );
      }

      return optimizedBuffer;
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * Optimize to target file size
   * @param input - Image buffer
   * @param targetSize - Target size in bytes
   * @param format - Image format
   * @returns Optimized buffer
   */
  static async optimizeToTargetSize(
    input: Buffer,
    targetSize: number,
    format: ImageFormat | string,
  ): Promise<Buffer> {
    let quality = 90;
    let optimizedBuffer = input;
    const formatString = typeof format === 'string' ? format.toLowerCase() : format;

    // Iteratively reduce quality until target size is reached
    while (optimizedBuffer.length > targetSize && quality > 10) {
      if (formatString === 'jpeg' || formatString === 'jpg') {
        optimizedBuffer = await sharp(input)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      } else if (formatString === 'webp') {
        optimizedBuffer = await sharp(input).webp({ quality }).toBuffer();
      } else if (formatString === 'avif') {
        optimizedBuffer = await sharp(input).avif({ quality }).toBuffer();
      } else if (formatString === 'png') {
        // PNG doesn't have quality, so reduce dimensions instead
        const metadata = await sharp(input).metadata();
        const scale = Math.sqrt(targetSize / optimizedBuffer.length);
        optimizedBuffer = await sharp(input)
          .resize({
            width: Math.floor((metadata.width || 0) * scale),
            height: Math.floor((metadata.height || 0) * scale),
            fit: 'inside',
          })
          .png({ compressionLevel: 9 })
          .toBuffer();
        break;
      }

      quality -= 5;
    }

    return optimizedBuffer;
  }

  /**
   * Generate responsive image variants
   * @param input - Image buffer
   * @param sizes - Array of widths to generate
   * @param format - Target format
   * @param quality - Image quality
   * @returns Map of size to buffer
   */
  static async generateResponsiveVariants(
    input: Buffer,
    sizes: number[] = [320, 640, 768, 1024, 1280, 1920],
    format?: ImageFormat,
    quality: number = 80,
  ): Promise<Map<number, Buffer>> {
    const variants = new Map<number, Buffer>();
    const metadata = await ImageUtil.getMetadata(input);
    const targetFormat = format || (metadata.format as ImageFormat);

    for (const size of sizes) {
      try {
        // Skip if size is larger than original
        if (metadata.width && size > metadata.width) {
          continue;
        }

        let resized = await ImageUtil.resize(input, {
          width: size,
          fit: 'inside',
          withoutEnlargement: true,
        });

        // Convert to target format if specified
        if (format) {
          resized = await ImageConverter.convert(resized, {
            format,
            quality,
            progressive: true,
          });
        }

        variants.set(size, resized);
      } catch (error) {
        console.error(`Failed to generate ${size}px variant:`, error.message);
      }
    }

    return variants;
  }

  /**
   * Generate srcset string for responsive images
   * @param baseUrl - Base URL for images
   * @param variants - Map of size to filename
   * @returns srcset string
   */
  static generateSrcSet(
    baseUrl: string,
    variants: Map<number, string>,
  ): string {
    const srcsetParts: string[] = [];

    for (const [width, filename] of variants.entries()) {
      const url = `${baseUrl}/${filename}`;
      srcsetParts.push(`${url} ${width}w`);
    }

    return srcsetParts.join(', ');
  }

  /**
   * Optimize for progressive JPEG
   * @param input - Image buffer
   * @param quality - JPEG quality
   * @returns Progressive JPEG buffer
   */
  static async optimizeProgressive(
    input: Buffer,
    quality: number = 80,
  ): Promise<Buffer> {
    try {
      return await sharp(input)
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to create progressive JPEG: ${error.message}`,
      );
    }
  }

  /**
   * Strip all metadata from image
   * @param input - Image buffer
   * @returns Image buffer without metadata
   */
  static async stripMetadata(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input).withMetadata({}).toBuffer();
    } catch (error) {
      throw new Error(`Failed to strip metadata: ${error.message}`);
    }
  }

  /**
   * Get optimization statistics
   * @param original - Original image buffer
   * @param optimized - Optimized image buffer
   * @returns Optimization statistics
   */
  static async getOptimizationStats(
    original: Buffer,
    optimized: Buffer,
  ): Promise<{
    originalSize: number;
    optimizedSize: number;
    savings: number;
    savingsPercentage: number;
  }> {
    const originalSize = original.length;
    const optimizedSize = optimized.length;
    const savings = originalSize - optimizedSize;
    const savingsPercentage = (savings / originalSize) * 100;

    return {
      originalSize,
      optimizedSize,
      savings,
      savingsPercentage,
    };
  }
}
