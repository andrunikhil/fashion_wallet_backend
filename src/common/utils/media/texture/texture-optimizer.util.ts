import sharp from 'sharp';

/**
 * Texture optimization options
 */
export interface TextureOptimizeOptions {
  maxSize?: number; // Maximum texture dimension
  format?: 'png' | 'jpg' | 'webp' | 'ktx2' | 'basis';
  quality?: number;
  powerOfTwo?: boolean; // Resize to nearest power of 2
  mipMaps?: boolean; // Generate mipmaps
  compression?: 'etc' | 'astc' | 'dxt' | 'none';
}

/**
 * Mipmap level
 */
export interface MipmapLevel {
  level: number;
  width: number;
  height: number;
  buffer: Buffer;
}

/**
 * Texture Optimizer Utility
 * Optimizes textures for 3D models and web delivery
 */
export class TextureOptimizer {
  /**
   * Optimize texture for 3D model use
   * @param textureBuffer - Texture image buffer
   * @param options - Optimization options
   * @returns Optimized texture buffer
   */
  static async optimize(
    textureBuffer: Buffer,
    options: TextureOptimizeOptions = {},
  ): Promise<Buffer> {
    try {
      const {
        maxSize = 2048,
        format = 'jpg',
        quality = 90,
        powerOfTwo = true,
      } = options;

      let pipeline = sharp(textureBuffer);
      const metadata = await pipeline.metadata();

      // Resize to max size if needed
      let width = metadata.width || maxSize;
      let height = metadata.height || maxSize;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      // Resize to power of 2 if requested
      if (powerOfTwo) {
        width = this.nearestPowerOfTwo(width);
        height = this.nearestPowerOfTwo(height);
      }

      // Resize if dimensions changed
      if (width !== metadata.width || height !== metadata.height) {
        pipeline = pipeline.resize(width, height, {
          fit: 'fill',
          kernel: 'lanczos3',
        });
      }

      // Convert to target format
      switch (format) {
        case 'jpg':
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          pipeline = pipeline.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality });
          break;
        default:
          // Keep original format
          break;
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to optimize texture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Resize texture to power of 2 dimensions
   * @param textureBuffer - Texture buffer
   * @param upscale - Allow upscaling (default: false)
   * @returns Resized texture buffer
   */
  static async resizeToPowerOfTwo(
    textureBuffer: Buffer,
    upscale: boolean = false,
  ): Promise<Buffer> {
    try {
      const metadata = await sharp(textureBuffer).metadata();
      const width = metadata.width || 512;
      const height = metadata.height || 512;

      const newWidth = this.nearestPowerOfTwo(width, upscale);
      const newHeight = this.nearestPowerOfTwo(height, upscale);

      if (newWidth === width && newHeight === height) {
        return textureBuffer; // Already power of 2
      }

      return await sharp(textureBuffer)
        .resize(newWidth, newHeight, {
          fit: 'fill',
          kernel: 'lanczos3',
        })
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to resize to power of 2: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate mipmaps for texture
   * @param textureBuffer - Texture buffer
   * @param levels - Number of mipmap levels (0 = auto)
   * @returns Array of mipmap levels
   */
  static async generateMipmaps(
    textureBuffer: Buffer,
    levels: number = 0,
  ): Promise<MipmapLevel[]> {
    try {
      const metadata = await sharp(textureBuffer).metadata();
      let width = metadata.width || 512;
      let height = metadata.height || 512;

      // Calculate max levels if not specified
      if (levels === 0) {
        levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
      }

      const mipmaps: MipmapLevel[] = [];

      // Level 0 is the original texture
      mipmaps.push({
        level: 0,
        width,
        height,
        buffer: textureBuffer,
      });

      // Generate each mipmap level
      for (let level = 1; level < levels; level++) {
        width = Math.max(1, Math.floor(width / 2));
        height = Math.max(1, Math.floor(height / 2));

        const mipmap = await sharp(textureBuffer)
          .resize(width, height, {
            kernel: 'lanczos3',
          })
          .toBuffer();

        mipmaps.push({
          level,
          width,
          height,
          buffer: mipmap,
        });

        // Stop if we reached 1x1
        if (width === 1 && height === 1) {
          break;
        }
      }

      return mipmaps;
    } catch (error) {
      throw new Error(
        `Failed to generate mipmaps: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Compress texture using GPU-friendly format
   * @param textureBuffer - Texture buffer
   * @param format - Compression format
   * @returns Compressed texture buffer
   */
  static async compress(
    textureBuffer: Buffer,
    format: 'etc' | 'astc' | 'dxt' = 'etc',
  ): Promise<Buffer> {
    try {
      // TODO: Implement GPU texture compression
      // This requires specialized tools:
      // - ETC: etcpack, PVRTexTool
      // - ASTC: astcenc
      // - DXT: nvcompress, texconv
      // - Basis Universal: basisu

      // For now, return optimized but uncompressed texture
      return this.optimize(textureBuffer, { quality: 95 });
    } catch (error) {
      throw new Error(
        `Failed to compress texture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Convert texture to Basis Universal format
   * @param textureBuffer - Texture buffer
   * @returns Basis texture buffer
   */
  static async convertToBasis(textureBuffer: Buffer): Promise<Buffer> {
    try {
      // TODO: Implement Basis Universal conversion
      // This requires basisu CLI tool or library

      return textureBuffer;
    } catch (error) {
      throw new Error(
        `Failed to convert to Basis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Optimize texture atlas
   * @param textures - Array of texture buffers
   * @param maxSize - Maximum atlas size
   * @returns Combined atlas buffer and UV mapping data
   */
  static async createAtlas(
    textures: Buffer[],
    maxSize: number = 4096,
  ): Promise<{ atlas: Buffer; uvMappings: Array<{ x: number; y: number; width: number; height: number }> }> {
    try {
      // TODO: Implement texture atlas packing
      // This should:
      // 1. Calculate optimal packing layout
      // 2. Composite textures into single atlas
      // 3. Return atlas and UV mapping coordinates

      return {
        atlas: Buffer.alloc(0),
        uvMappings: [],
      };
    } catch (error) {
      throw new Error(
        `Failed to create atlas: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get nearest power of 2 for a number
   * @param value - Input value
   * @param upscale - Allow upscaling (default: false, rounds down)
   * @returns Nearest power of 2
   */
  private static nearestPowerOfTwo(value: number, upscale: boolean = false): number {
    if (upscale) {
      return Math.pow(2, Math.ceil(Math.log2(value)));
    } else {
      return Math.pow(2, Math.floor(Math.log2(value)));
    }
  }

  /**
   * Check if number is power of 2
   * @param value - Value to check
   * @returns True if power of 2
   */
  static isPowerOfTwo(value: number): boolean {
    return value > 0 && (value & (value - 1)) === 0;
  }

  /**
   * Batch optimize multiple textures
   * @param textures - Array of texture buffers
   * @param options - Optimization options
   * @returns Array of optimized textures
   */
  static async batchOptimize(
    textures: Buffer[],
    options: TextureOptimizeOptions = {},
  ): Promise<Buffer[]> {
    try {
      return await Promise.all(
        textures.map((texture) => this.optimize(texture, options)),
      );
    } catch (error) {
      throw new Error(
        `Failed to batch optimize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
