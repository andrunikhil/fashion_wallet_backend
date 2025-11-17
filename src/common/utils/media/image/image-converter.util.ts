/**
 * Image Converter Utility
 * Image format conversion operations
 */

import sharp from 'sharp';
import { ImageFormat, ConversionOptions } from '../../../types/media.types';

export class ImageConverter {
  /**
   * Convert image to specified format
   * @param input - Image buffer
   * @param options - Conversion options
   * @returns Converted image buffer
   */
  static async convert(
    input: Buffer,
    options: ConversionOptions,
  ): Promise<Buffer> {
    try {
      let image = sharp(input);

      switch (options.format) {
        case ImageFormat.JPEG:
          return await image
            .jpeg({
              quality: options.quality ?? 80,
              progressive: options.progressive ?? false,
            })
            .toBuffer();

        case ImageFormat.PNG:
          return await image
            .png({
              compressionLevel: options.compressionLevel ?? 6,
              progressive: options.progressive ?? false,
            })
            .toBuffer();

        case ImageFormat.WEBP:
          return await image
            .webp({
              quality: options.quality ?? 80,
              lossless: options.lossless ?? false,
              effort: options.effort ?? 4,
            })
            .toBuffer();

        case ImageFormat.AVIF:
          return await image
            .avif({
              quality: options.quality ?? 80,
              lossless: options.lossless ?? false,
              effort: options.effort ?? 4,
            })
            .toBuffer();

        case ImageFormat.TIFF:
          return await image
            .tiff({
              quality: options.quality ?? 80,
            })
            .toBuffer();

        case ImageFormat.GIF:
          return await image
            .gif()
            .toBuffer();

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    } catch (error) {
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  /**
   * Convert to JPEG
   * @param input - Image buffer
   * @param quality - Quality (1-100)
   * @param progressive - Enable progressive encoding
   * @returns JPEG buffer
   */
  static async toJPEG(
    input: Buffer,
    quality: number = 80,
    progressive: boolean = false,
  ): Promise<Buffer> {
    return this.convert(input, {
      format: ImageFormat.JPEG,
      quality,
      progressive,
    });
  }

  /**
   * Convert to PNG
   * @param input - Image buffer
   * @param compressionLevel - Compression level (0-9)
   * @param progressive - Enable progressive encoding
   * @returns PNG buffer
   */
  static async toPNG(
    input: Buffer,
    compressionLevel: number = 6,
    progressive: boolean = false,
  ): Promise<Buffer> {
    return this.convert(input, {
      format: ImageFormat.PNG,
      compressionLevel,
      progressive,
    });
  }

  /**
   * Convert to WebP
   * @param input - Image buffer
   * @param quality - Quality (1-100)
   * @param lossless - Use lossless compression
   * @param effort - Compression effort (0-6)
   * @returns WebP buffer
   */
  static async toWebP(
    input: Buffer,
    quality: number = 80,
    lossless: boolean = false,
    effort: number = 4,
  ): Promise<Buffer> {
    return this.convert(input, {
      format: ImageFormat.WEBP,
      quality,
      lossless,
      effort,
    });
  }

  /**
   * Convert to AVIF
   * @param input - Image buffer
   * @param quality - Quality (1-100)
   * @param lossless - Use lossless compression
   * @param effort - Compression effort (0-9)
   * @returns AVIF buffer
   */
  static async toAVIF(
    input: Buffer,
    quality: number = 80,
    lossless: boolean = false,
    effort: number = 4,
  ): Promise<Buffer> {
    return this.convert(input, {
      format: ImageFormat.AVIF,
      quality,
      lossless,
      effort,
    });
  }

  /**
   * Generate multiple formats from a single image
   * @param input - Image buffer
   * @param formats - Array of formats to generate
   * @param quality - Default quality for all formats
   * @returns Map of format to buffer
   */
  static async generateMultipleFormats(
    input: Buffer,
    formats: ImageFormat[],
    quality: number = 80,
  ): Promise<Map<ImageFormat, Buffer>> {
    const results = new Map<ImageFormat, Buffer>();

    for (const format of formats) {
      try {
        const converted = await this.convert(input, { format, quality });
        results.set(format, converted);
      } catch (error) {
        console.error(`Failed to convert to ${format}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Auto-select best format based on file size
   * @param input - Image buffer
   * @param targetFormats - Formats to consider
   * @param quality - Quality for conversions
   * @returns Best format and its buffer
   */
  static async selectBestFormat(
    input: Buffer,
    targetFormats: ImageFormat[] = [
      ImageFormat.JPEG,
      ImageFormat.WEBP,
      ImageFormat.AVIF,
    ],
    quality: number = 80,
  ): Promise<{ format: ImageFormat; buffer: Buffer; size: number }> {
    const conversions = await this.generateMultipleFormats(
      input,
      targetFormats,
      quality,
    );

    let bestFormat: ImageFormat | null = null;
    let bestBuffer: Buffer | null = null;
    let bestSize = Infinity;

    for (const [format, buffer] of conversions.entries()) {
      if (buffer.length < bestSize) {
        bestFormat = format;
        bestBuffer = buffer;
        bestSize = buffer.length;
      }
    }

    if (!bestFormat || !bestBuffer) {
      throw new Error('Failed to find best format');
    }

    return {
      format: bestFormat,
      buffer: bestBuffer,
      size: bestSize,
    };
  }

  /**
   * Convert and compare sizes
   * @param input - Image buffer
   * @param formats - Formats to compare
   * @param quality - Quality for conversions
   * @returns Size comparison results
   */
  static async compareSizes(
    input: Buffer,
    formats: ImageFormat[],
    quality: number = 80,
  ): Promise<
    Array<{ format: ImageFormat; size: number; savings: number }>
  > {
    const conversions = await this.generateMultipleFormats(
      input,
      formats,
      quality,
    );

    const originalSize = input.length;
    const results: Array<{
      format: ImageFormat;
      size: number;
      savings: number;
    }> = [];

    for (const [format, buffer] of conversions.entries()) {
      const size = buffer.length;
      const savings = ((originalSize - size) / originalSize) * 100;

      results.push({
        format,
        size,
        savings,
      });
    }

    return results.sort((a, b) => a.size - b.size);
  }
}
