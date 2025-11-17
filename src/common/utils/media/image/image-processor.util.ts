import sharp, { Sharp, ResizeOptions as SharpResizeOptions, FormatEnum } from 'sharp';

/**
 * Image format enum
 */
export type ImageFormat = keyof FormatEnum;

/**
 * Resize options
 */
export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string | number;
  background?: string;
  withoutEnlargement?: boolean;
}

/**
 * Crop options
 */
export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Composite options for overlaying images
 */
export interface CompositeOptions {
  left?: number;
  top?: number;
  gravity?: 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest' | 'center';
  blend?: 'over' | 'in' | 'out' | 'atop' | 'dest' | 'dest-over' | 'dest-in' | 'dest-out' | 'dest-atop' | 'xor' | 'add' | 'saturate' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'colour-dodge' | 'colour-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion';
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  space: string;
  channels: number;
  depth: string;
  density?: number;
  hasAlpha: boolean;
  orientation?: number;
  size: number;
}

/**
 * Image Processor Utility
 * Provides core image processing operations using Sharp
 */
export class ImageProcessor {
  /**
   * Resize an image
   * @param image - Image buffer
   * @param options - Resize options
   * @returns Processed image buffer
   */
  static async resize(image: Buffer, options: ResizeOptions): Promise<Buffer> {
    try {
      const sharpResizeOptions: SharpResizeOptions = {
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position,
        background: options.background,
        withoutEnlargement: options.withoutEnlargement !== false,
      };

      return await sharp(image)
        .resize(sharpResizeOptions)
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to resize image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Crop an image
   * @param image - Image buffer
   * @param options - Crop options
   * @returns Cropped image buffer
   */
  static async crop(image: Buffer, options: CropOptions): Promise<Buffer> {
    try {
      return await sharp(image)
        .extract({
          left: options.left,
          top: options.top,
          width: options.width,
          height: options.height,
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to crop image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Smart crop - crop with attention to content
   * @param image - Image buffer
   * @param width - Target width
   * @param height - Target height
   * @returns Cropped image buffer
   */
  static async smartCrop(image: Buffer, width: number, height: number): Promise<Buffer> {
    try {
      return await sharp(image)
        .resize(width, height, {
          fit: 'cover',
          position: 'attention',
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to smart crop image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Rotate an image
   * @param image - Image buffer
   * @param degrees - Rotation angle in degrees
   * @param background - Background color for empty areas (default: transparent)
   * @returns Rotated image buffer
   */
  static async rotate(image: Buffer, degrees: number, background?: string): Promise<Buffer> {
    try {
      return await sharp(image)
        .rotate(degrees, { background })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to rotate image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Flip an image horizontally
   * @param image - Image buffer
   * @returns Flipped image buffer
   */
  static async flipHorizontal(image: Buffer): Promise<Buffer> {
    try {
      return await sharp(image)
        .flop()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to flip image horizontally: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Flip an image vertically
   * @param image - Image buffer
   * @returns Flipped image buffer
   */
  static async flipVertical(image: Buffer): Promise<Buffer> {
    try {
      return await sharp(image)
        .flip()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to flip image vertically: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert image format
   * @param image - Image buffer
   * @param format - Target format
   * @param quality - Quality (1-100, default: 85)
   * @returns Converted image buffer
   */
  static async convert(image: Buffer, format: ImageFormat, quality: number = 85): Promise<Buffer> {
    try {
      return await sharp(image)
        .toFormat(format, { quality })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to convert image format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Composite/overlay images
   * @param background - Background image buffer
   * @param overlay - Overlay image buffer
   * @param options - Composite options
   * @returns Composited image buffer
   */
  static async composite(
    background: Buffer,
    overlay: Buffer,
    options: CompositeOptions = {},
  ): Promise<Buffer> {
    try {
      return await sharp(background)
        .composite([
          {
            input: overlay,
            left: options.left,
            top: options.top,
            gravity: options.gravity,
            blend: options.blend || 'over',
          },
        ])
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to composite images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get image metadata
   * @param image - Image buffer
   * @returns Image metadata
   */
  static async getMetadata(image: Buffer): Promise<ImageMetadata> {
    try {
      const metadata = await sharp(image).metadata();

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        space: metadata.space || 'unknown',
        channels: metadata.channels || 0,
        depth: metadata.depth || 'unknown',
        density: metadata.density,
        hasAlpha: metadata.hasAlpha || false,
        orientation: metadata.orientation,
        size: image.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Adjust image quality
   * @param image - Image buffer
   * @param quality - Quality (1-100)
   * @returns Processed image buffer
   */
  static async adjustQuality(image: Buffer, quality: number): Promise<Buffer> {
    try {
      const metadata = await sharp(image).metadata();
      const format = (metadata.format || 'jpeg') as ImageFormat;

      return await sharp(image)
        .toFormat(format, { quality })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to adjust quality: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Adjust brightness
   * @param image - Image buffer
   * @param brightness - Brightness multiplier (1.0 = no change)
   * @returns Processed image buffer
   */
  static async adjustBrightness(image: Buffer, brightness: number): Promise<Buffer> {
    try {
      return await sharp(image)
        .modulate({ brightness })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to adjust brightness: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Adjust saturation
   * @param image - Image buffer
   * @param saturation - Saturation multiplier (1.0 = no change)
   * @returns Processed image buffer
   */
  static async adjustSaturation(image: Buffer, saturation: number): Promise<Buffer> {
    try {
      return await sharp(image)
        .modulate({ saturation })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to adjust saturation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Apply blur effect
   * @param image - Image buffer
   * @param sigma - Blur strength (0.3 - 1000)
   * @returns Blurred image buffer
   */
  static async blur(image: Buffer, sigma: number = 5): Promise<Buffer> {
    try {
      return await sharp(image)
        .blur(sigma)
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to apply blur: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sharpen image
   * @param image - Image buffer
   * @param sigma - Sharpening strength
   * @returns Sharpened image buffer
   */
  static async sharpen(image: Buffer, sigma: number = 1): Promise<Buffer> {
    try {
      return await sharp(image)
        .sharpen({ sigma })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to sharpen image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert to grayscale
   * @param image - Image buffer
   * @returns Grayscale image buffer
   */
  static async grayscale(image: Buffer): Promise<Buffer> {
    try {
      return await sharp(image)
        .grayscale()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to convert to grayscale: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Normalize image (enhance contrast)
   * @param image - Image buffer
   * @returns Normalized image buffer
   */
  static async normalize(image: Buffer): Promise<Buffer> {
    try {
      return await sharp(image)
        .normalize()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to normalize image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process image with a pipeline of operations
   * @param image - Image buffer
   * @param operations - Array of operation functions
   * @returns Processed image buffer
   */
  static async pipeline(
    image: Buffer,
    operations: Array<(img: Sharp) => Sharp>,
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(image);

      for (const operation of operations) {
        pipeline = operation(pipeline);
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to process pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
