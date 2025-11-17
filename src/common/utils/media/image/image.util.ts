/**
 * Image Utility
 * Core image processing operations using Sharp library
 */

import sharp, { Sharp } from 'sharp';
import {
  ResizeOptions,
  CropOptions,
  FlipDirection,
  ImageMetadata,
  ValidationOptions,
  ValidationResult,
  ImageFormat,
} from '../../../types/media.types';

export class ImageUtil {
  /**
   * Resize an image
   * @param input - Image buffer
   * @param options - Resize options
   * @returns Resized image buffer
   */
  static async resize(
    input: Buffer,
    options: ResizeOptions,
  ): Promise<Buffer> {
    try {
      const image = sharp(input);

      const resizeOpts: any = {};
      if (options.width) resizeOpts.width = options.width;
      if (options.height) resizeOpts.height = options.height;
      if (options.fit) resizeOpts.fit = options.fit;
      if (options.position) resizeOpts.position = options.position;
      if (options.background) resizeOpts.background = options.background;
      if (options.withoutEnlargement !== undefined) {
        resizeOpts.withoutEnlargement = options.withoutEnlargement;
      }

      return await image.resize(resizeOpts).toBuffer();
    } catch (error) {
      throw new Error(`Failed to resize image: ${error.message}`);
    }
  }

  /**
   * Crop an image
   * @param input - Image buffer
   * @param options - Crop options
   * @returns Cropped image buffer
   */
  static async crop(input: Buffer, options: CropOptions): Promise<Buffer> {
    try {
      return await sharp(input)
        .extract({
          left: options.left,
          top: options.top,
          width: options.width,
          height: options.height,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(`Failed to crop image: ${error.message}`);
    }
  }

  /**
   * Rotate an image
   * @param input - Image buffer
   * @param angle - Rotation angle (0, 90, 180, 270)
   * @returns Rotated image buffer
   */
  static async rotate(input: Buffer, angle: number): Promise<Buffer> {
    try {
      if (![0, 90, 180, 270, -90, -180, -270].includes(angle)) {
        throw new Error('Angle must be 0, 90, 180, 270, or their negatives');
      }

      return await sharp(input).rotate(angle).toBuffer();
    } catch (error) {
      throw new Error(`Failed to rotate image: ${error.message}`);
    }
  }

  /**
   * Flip an image
   * @param input - Image buffer
   * @param direction - Flip direction
   * @returns Flipped image buffer
   */
  static async flip(
    input: Buffer,
    direction: FlipDirection,
  ): Promise<Buffer> {
    try {
      let image = sharp(input);

      switch (direction) {
        case FlipDirection.HORIZONTAL:
          image = image.flop();
          break;
        case FlipDirection.VERTICAL:
          image = image.flip();
          break;
        case FlipDirection.BOTH:
          image = image.flip().flop();
          break;
        default:
          throw new Error(`Invalid flip direction: ${direction}`);
      }

      return await image.toBuffer();
    } catch (error) {
      throw new Error(`Failed to flip image: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   * @param input - Image buffer
   * @returns Image metadata
   */
  static async getMetadata(input: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(input).metadata();

      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: input.length,
        exif: metadata.exif,
        icc: metadata.icc,
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Validate an image
   * @param input - Image buffer
   * @param options - Validation options
   * @returns Validation result
   */
  static async validate(
    input: Buffer,
    options: ValidationOptions = {},
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const metadata = await this.getMetadata(input);

      // Check format
      if (
        options.allowedFormats &&
        options.allowedFormats.length > 0 &&
        metadata.format
      ) {
        if (!options.allowedFormats.includes(metadata.format as ImageFormat)) {
          errors.push(
            `Invalid format: ${metadata.format}. Allowed: ${options.allowedFormats.join(', ')}`,
          );
        }
      }

      // Check dimensions
      if (options.maxWidth && metadata.width && metadata.width > options.maxWidth) {
        errors.push(
          `Width ${metadata.width}px exceeds maximum ${options.maxWidth}px`,
        );
      }

      if (options.maxHeight && metadata.height && metadata.height > options.maxHeight) {
        errors.push(
          `Height ${metadata.height}px exceeds maximum ${options.maxHeight}px`,
        );
      }

      if (options.minWidth && metadata.width && metadata.width < options.minWidth) {
        errors.push(
          `Width ${metadata.width}px is below minimum ${options.minWidth}px`,
        );
      }

      if (options.minHeight && metadata.height && metadata.height < options.minHeight) {
        errors.push(
          `Height ${metadata.height}px is below minimum ${options.minHeight}px`,
        );
      }

      // Check file size
      if (options.maxSize && metadata.size && metadata.size > options.maxSize) {
        errors.push(
          `File size ${metadata.size} bytes exceeds maximum ${options.maxSize} bytes`,
        );
      }

      return {
        valid: errors.length === 0,
        errors,
        metadata,
      };
    } catch (error) {
      errors.push(`Failed to validate image: ${error.message}`);
      return {
        valid: false,
        errors,
      };
    }
  }

  /**
   * Convert image to grayscale
   * @param input - Image buffer
   * @returns Grayscale image buffer
   */
  static async grayscale(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input).grayscale().toBuffer();
    } catch (error) {
      throw new Error(`Failed to convert to grayscale: ${error.message}`);
    }
  }

  /**
   * Blur an image
   * @param input - Image buffer
   * @param sigma - Blur amount (0.3 - 1000)
   * @returns Blurred image buffer
   */
  static async blur(input: Buffer, sigma: number = 5): Promise<Buffer> {
    try {
      return await sharp(input).blur(sigma).toBuffer();
    } catch (error) {
      throw new Error(`Failed to blur image: ${error.message}`);
    }
  }

  /**
   * Sharpen an image
   * @param input - Image buffer
   * @param sigma - Sharpening amount
   * @returns Sharpened image buffer
   */
  static async sharpen(input: Buffer, sigma?: number): Promise<Buffer> {
    try {
      return await sharp(input).sharpen(sigma).toBuffer();
    } catch (error) {
      throw new Error(`Failed to sharpen image: ${error.message}`);
    }
  }

  /**
   * Normalize image (enhance contrast)
   * @param input - Image buffer
   * @returns Normalized image buffer
   */
  static async normalize(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input).normalize().toBuffer();
    } catch (error) {
      throw new Error(`Failed to normalize image: ${error.message}`);
    }
  }

  /**
   * Composite multiple images
   * @param base - Base image buffer
   * @param overlays - Array of overlay images with positions
   * @returns Composited image buffer
   */
  static async composite(
    base: Buffer,
    overlays: Array<{ input: Buffer; left: number; top: number }>,
  ): Promise<Buffer> {
    try {
      const compositeInputs = overlays.map((overlay) => ({
        input: overlay.input,
        left: overlay.left,
        top: overlay.top,
      }));

      return await sharp(base).composite(compositeInputs).toBuffer();
    } catch (error) {
      throw new Error(`Failed to composite images: ${error.message}`);
    }
  }

  /**
   * Create a Sharp instance for custom processing
   * @param input - Image buffer
   * @returns Sharp instance
   */
  static createInstance(input: Buffer): Sharp {
    return sharp(input);
  }
}
