/**
 * Thumbnail Generator Utility
 * Generate thumbnails and sprite sheets
 */

import sharp from 'sharp';
import {
  ThumbnailOptions,
  SpriteSheetOptions,
  ImageFormat,
} from '../../../types/media.types';
import { ImageUtil } from './image.util';
import { ImageConverter } from './image-converter.util';

export class ThumbnailGenerator {
  // Preset thumbnail sizes
  static readonly PRESETS = {
    tiny: { width: 64, height: 64 },
    small: { width: 128, height: 128 },
    medium: { width: 256, height: 256 },
    large: { width: 512, height: 512 },
    xlarge: { width: 1024, height: 1024 },
  };

  /**
   * Generate thumbnail
   * @param input - Image buffer
   * @param options - Thumbnail options
   * @returns Thumbnail buffer
   */
  static async generate(
    input: Buffer,
    options: ThumbnailOptions,
  ): Promise<Buffer> {
    try {
      let thumbnail = await ImageUtil.resize(input, {
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center',
      });

      // Convert to specified format if provided
      if (options.format) {
        thumbnail = await ImageConverter.convert(thumbnail, {
          format: options.format,
          quality: options.quality || 80,
          progressive: true,
        });
      }

      return thumbnail;
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Generate multiple thumbnail sizes
   * @param input - Image buffer
   * @param presets - Array of preset names or custom sizes
   * @param format - Output format
   * @param quality - Image quality
   * @returns Map of size name to buffer
   */
  static async generateMultipleSizes(
    input: Buffer,
    presets: Array<keyof typeof ThumbnailGenerator.PRESETS | ThumbnailOptions> = [
      'small',
      'medium',
      'large',
    ],
    format?: ImageFormat,
    quality: number = 80,
  ): Promise<Map<string, Buffer>> {
    const thumbnails = new Map<string, Buffer>();

    for (const preset of presets) {
      try {
        let options: ThumbnailOptions;
        let key: string;

        if (typeof preset === 'string') {
          // Use preset
          options = {
            ...this.PRESETS[preset],
            format,
            quality,
          };
          key = preset;
        } else {
          // Use custom options
          options = { ...preset, format, quality };
          key = `${preset.width}x${preset.height}`;
        }

        const thumbnail = await this.generate(input, options);
        thumbnails.set(key, thumbnail);
      } catch (error) {
        console.error(`Failed to generate ${preset} thumbnail:`, error.message);
      }
    }

    return thumbnails;
  }

  /**
   * Generate smart thumbnail with attention-based cropping
   * Uses Sharp's attention strategy to focus on interesting areas
   * @param input - Image buffer
   * @param width - Thumbnail width
   * @param height - Thumbnail height
   * @param format - Output format
   * @param quality - Image quality
   * @returns Thumbnail buffer
   */
  static async generateSmart(
    input: Buffer,
    width: number,
    height: number,
    format?: ImageFormat,
    quality: number = 80,
  ): Promise<Buffer> {
    try {
      let thumbnail = await sharp(input)
        .resize({
          width,
          height,
          fit: 'cover',
          position: 'attention',
        })
        .toBuffer();

      // Convert to specified format if provided
      if (format) {
        thumbnail = await ImageConverter.convert(thumbnail, {
          format,
          quality,
          progressive: true,
        });
      }

      return thumbnail;
    } catch (error) {
      throw new Error(`Failed to generate smart thumbnail: ${error.message}`);
    }
  }

  /**
   * Generate square thumbnail
   * @param input - Image buffer
   * @param size - Square size
   * @param format - Output format
   * @param quality - Image quality
   * @returns Square thumbnail buffer
   */
  static async generateSquare(
    input: Buffer,
    size: number,
    format?: ImageFormat,
    quality: number = 80,
  ): Promise<Buffer> {
    return this.generate(input, {
      width: size,
      height: size,
      fit: 'cover',
      position: 'center',
      format,
      quality,
    });
  }

  /**
   * Generate sprite sheet from multiple images
   * @param options - Sprite sheet options
   * @returns Sprite sheet buffer
   */
  static async generateSpriteSheet(
    options: SpriteSheetOptions,
  ): Promise<Buffer> {
    try {
      if (options.images.length === 0) {
        throw new Error('No images provided for sprite sheet');
      }

      // Get metadata of first image to determine cell size
      const firstMeta = await sharp(options.images[0]).metadata();
      const cellWidth = firstMeta.width || 0;
      const cellHeight = firstMeta.height || 0;

      if (cellWidth === 0 || cellHeight === 0) {
        throw new Error('Invalid image dimensions');
      }

      const columns = options.columns;
      const rows = Math.ceil(options.images.length / columns);
      const spacing = options.spacing || 0;
      const background = options.background || 'transparent';

      const spriteWidth = columns * cellWidth + (columns - 1) * spacing;
      const spriteHeight = rows * cellHeight + (rows - 1) * spacing;

      // Create base sprite sheet
      const sprite = sharp({
        create: {
          width: spriteWidth,
          height: spriteHeight,
          channels: 4,
          background,
        },
      });

      // Prepare composite inputs
      const compositeInputs: Array<{
        input: Buffer;
        left: number;
        top: number;
      }> = [];

      for (let i = 0; i < options.images.length; i++) {
        const row = Math.floor(i / columns);
        const col = i % columns;

        const left = col * (cellWidth + spacing);
        const top = row * (cellHeight + spacing);

        compositeInputs.push({
          input: options.images[i],
          left,
          top,
        });
      }

      return await sprite.composite(compositeInputs).png().toBuffer();
    } catch (error) {
      throw new Error(`Failed to generate sprite sheet: ${error.message}`);
    }
  }

  /**
   * Generate thumbnail with watermark
   * @param input - Image buffer
   * @param watermark - Watermark image buffer
   * @param options - Thumbnail options
   * @param watermarkPosition - Position of watermark (e.g., 'bottom-right')
   * @returns Thumbnail with watermark
   */
  static async generateWithWatermark(
    input: Buffer,
    watermark: Buffer,
    options: ThumbnailOptions,
    watermarkPosition: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right',
  ): Promise<Buffer> {
    try {
      // Generate base thumbnail
      let thumbnail = await this.generate(input, options);

      // Get thumbnail dimensions
      const thumbMeta = await sharp(thumbnail).metadata();
      const thumbWidth = thumbMeta.width || 0;
      const thumbHeight = thumbMeta.height || 0;

      // Get watermark dimensions
      const watermarkMeta = await sharp(watermark).metadata();
      const watermarkWidth = watermarkMeta.width || 0;
      const watermarkHeight = watermarkMeta.height || 0;

      // Calculate watermark position
      let left = 0;
      let top = 0;
      const padding = 10;

      switch (watermarkPosition) {
        case 'center':
          left = Math.floor((thumbWidth - watermarkWidth) / 2);
          top = Math.floor((thumbHeight - watermarkHeight) / 2);
          break;
        case 'top-left':
          left = padding;
          top = padding;
          break;
        case 'top-right':
          left = thumbWidth - watermarkWidth - padding;
          top = padding;
          break;
        case 'bottom-left':
          left = padding;
          top = thumbHeight - watermarkHeight - padding;
          break;
        case 'bottom-right':
          left = thumbWidth - watermarkWidth - padding;
          top = thumbHeight - watermarkHeight - padding;
          break;
      }

      // Apply watermark
      thumbnail = await ImageUtil.composite(thumbnail, [
        { input: watermark, left, top },
      ]);

      return thumbnail;
    } catch (error) {
      throw new Error(
        `Failed to generate thumbnail with watermark: ${error.message}`,
      );
    }
  }

  /**
   * Generate circular thumbnail
   * @param input - Image buffer
   * @param size - Circle diameter
   * @param format - Output format (PNG recommended for transparency)
   * @param quality - Image quality
   * @returns Circular thumbnail buffer
   */
  static async generateCircular(
    input: Buffer,
    size: number,
    format: ImageFormat = ImageFormat.PNG,
    quality: number = 80,
  ): Promise<Buffer> {
    try {
      // Create a circular mask
      const circle = Buffer.from(
        `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`,
      );

      // Resize and apply mask
      const thumbnail = await sharp(input)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .composite([
          {
            input: circle,
            blend: 'dest-in',
          },
        ])
        .toBuffer();

      // Convert to specified format
      return await ImageConverter.convert(thumbnail, {
        format,
        quality,
      });
    } catch (error) {
      throw new Error(
        `Failed to generate circular thumbnail: ${error.message}`,
      );
    }
  }
}
