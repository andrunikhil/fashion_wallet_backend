import sharp from 'sharp';

/**
 * Thumbnail size preset
 */
export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
}

/**
 * Common thumbnail size presets
 */
export const THUMBNAIL_PRESETS = {
  SMALL: { name: 'small', width: 150, height: 150 },
  MEDIUM: { name: 'medium', width: 300, height: 300 },
  LARGE: { name: 'large', width: 600, height: 600 },
  SQUARE_SM: { name: 'square-sm', width: 200, height: 200 },
  SQUARE_MD: { name: 'square-md', width: 400, height: 400 },
  SQUARE_LG: { name: 'square-lg', width: 800, height: 800 },
  WIDE_SM: { name: 'wide-sm', width: 320, height: 180 },
  WIDE_MD: { name: 'wide-md', width: 640, height: 360 },
  WIDE_LG: { name: 'wide-lg', width: 1280, height: 720 },
};

/**
 * Thumbnail Generator Utility
 * Generates thumbnails in various sizes
 */
export class ThumbnailGenerator {
  /**
   * Generate multiple thumbnail sizes from an image
   * @param image - Image buffer
   * @param sizes - Array of thumbnail sizes
   * @returns Map of thumbnail name to buffer
   */
  static async generate(
    image: Buffer,
    sizes: ThumbnailSize[],
  ): Promise<Map<string, Buffer>> {
    try {
      const thumbnails = new Map<string, Buffer>();

      const promises = sizes.map(async (size) => {
        const thumbnail = await this.generateSingle(image, size.width, size.height);
        return { name: size.name, buffer: thumbnail };
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        thumbnails.set(result.name, result.buffer);
      }

      return thumbnails;
    } catch (error) {
      throw new Error(
        `Failed to generate thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate a single thumbnail
   * @param image - Image buffer
   * @param width - Thumbnail width
   * @param height - Thumbnail height
   * @param fit - How to fit the image (default: 'cover')
   * @returns Thumbnail buffer
   */
  static async generateSingle(
    image: Buffer,
    width: number,
    height: number,
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'cover',
  ): Promise<Buffer> {
    try {
      return await sharp(image)
        .resize(width, height, {
          fit,
          position: 'center',
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate thumbnail with smart cropping (attention-based)
   * @param image - Image buffer
   * @param size - Thumbnail size
   * @returns Thumbnail buffer
   */
  static async generateWithSmartCrop(
    image: Buffer,
    size: ThumbnailSize,
  ): Promise<Buffer> {
    try {
      return await sharp(image)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'attention', // Smart crop using entropy/edge detection
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate smart crop thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate a placeholder thumbnail (low quality, small size)
   * @param width - Placeholder width
   * @param height - Placeholder height
   * @param color - Background color (default: grey)
   * @returns Placeholder buffer
   */
  static async generatePlaceholder(
    width: number,
    height: number,
    color: string = '#cccccc',
  ): Promise<Buffer> {
    try {
      return await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: color,
        },
      })
        .jpeg({ quality: 20 })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate placeholder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate LQIP (Low Quality Image Placeholder)
   * @param image - Image buffer
   * @param width - LQIP width (default: 20)
   * @returns LQIP buffer
   */
  static async generateLQIP(image: Buffer, width: number = 20): Promise<Buffer> {
    try {
      return await sharp(image)
        .resize(width, null, {
          fit: 'inside',
        })
        .blur(1)
        .jpeg({ quality: 20 })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate LQIP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate thumbnails using preset sizes
   * @param image - Image buffer
   * @param presets - Array of preset names (e.g., ['SMALL', 'MEDIUM'])
   * @returns Map of preset name to buffer
   */
  static async generateFromPresets(
    image: Buffer,
    presets: Array<keyof typeof THUMBNAIL_PRESETS>,
  ): Promise<Map<string, Buffer>> {
    try {
      const sizes = presets.map((preset) => THUMBNAIL_PRESETS[preset]);
      return await this.generate(image, sizes);
    } catch (error) {
      throw new Error(
        `Failed to generate from presets: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate responsive image set
   * @param image - Image buffer
   * @param widths - Array of widths to generate
   * @returns Map of width to buffer
   */
  static async generateResponsiveSet(
    image: Buffer,
    widths: number[] = [320, 640, 1024, 1920],
  ): Promise<Map<number, Buffer>> {
    try {
      const set = new Map<number, Buffer>();

      const promises = widths.map(async (width) => {
        const resized = await sharp(image)
          .resize(width, null, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();
        return { width, buffer: resized };
      });

      const results = await Promise.all(promises);

      for (const result of results) {
        set.set(result.width, result.buffer);
      }

      return set;
    } catch (error) {
      throw new Error(
        `Failed to generate responsive set: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate square thumbnail (crop to square)
   * @param image - Image buffer
   * @param size - Square size
   * @returns Square thumbnail buffer
   */
  static async generateSquare(image: Buffer, size: number): Promise<Buffer> {
    try {
      return await sharp(image)
        .resize(size, size, {
          fit: 'cover',
          position: 'attention',
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate square thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate circular thumbnail
   * @param image - Image buffer
   * @param size - Circle diameter
   * @returns Circular thumbnail buffer (PNG with transparency)
   */
  static async generateCircular(image: Buffer, size: number): Promise<Buffer> {
    try {
      const roundedCorners = Buffer.from(
        `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
      );

      return await sharp(image)
        .resize(size, size, {
          fit: 'cover',
          position: 'attention',
        })
        .composite([
          {
            input: roundedCorners,
            blend: 'dest-in',
          },
        ])
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate circular thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Batch generate thumbnails for multiple images
   * @param images - Array of image buffers
   * @param sizes - Array of thumbnail sizes
   * @returns Array of thumbnail maps
   */
  static async batchGenerate(
    images: Buffer[],
    sizes: ThumbnailSize[],
  ): Promise<Map<string, Buffer>[]> {
    try {
      return await Promise.all(
        images.map((image) => this.generate(image, sizes)),
      );
    } catch (error) {
      throw new Error(
        `Failed to batch generate thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
