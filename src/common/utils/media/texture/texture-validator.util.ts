import sharp from 'sharp';

/**
 * Tiling result
 */
export interface TilingResult {
  isTileable: boolean;
  confidence: number;
  edgeSeams?: boolean;
}

/**
 * Texture Validator Utility
 * Validates texture files for 3D models
 */
export class TextureValidator {
  /**
   * Validate if texture is tileable
   * @param textureBuffer - Texture image buffer
   * @returns Tiling validation result
   */
  static async validateTiling(textureBuffer: Buffer): Promise<TilingResult> {
    try {
      // TODO: Implement proper tiling validation
      // This should check if edges of texture match for seamless tiling

      const metadata = await sharp(textureBuffer).metadata();

      // Basic check: textures should ideally be power of 2
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

      const widthValid = isPowerOfTwo(metadata.width || 0);
      const heightValid = isPowerOfTwo(metadata.height || 0);

      return {
        isTileable: widthValid && heightValid,
        confidence: widthValid && heightValid ? 0.8 : 0.3,
      };
    } catch (error) {
      throw new Error(
        `Failed to validate tiling: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate texture size
   * @param textureBuffer - Texture image buffer
   * @param maxSize - Maximum dimension size
   * @returns True if valid
   */
  static async validateSize(textureBuffer: Buffer, maxSize: number): Promise<boolean> {
    try {
      const metadata = await sharp(textureBuffer).metadata();

      return (
        (metadata.width || 0) <= maxSize && (metadata.height || 0) <= maxSize
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate texture format
   * @param textureBuffer - Texture image buffer
   * @param allowedFormats - Array of allowed formats
   * @returns True if valid
   */
  static async validateFormat(
    textureBuffer: Buffer,
    allowedFormats: string[],
  ): Promise<boolean> {
    try {
      const metadata = await sharp(textureBuffer).metadata();
      return allowedFormats.includes(metadata.format || '');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if texture dimensions are power of 2
   * @param textureBuffer - Texture image buffer
   * @returns True if power of 2
   */
  static async isPowerOfTwo(textureBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(textureBuffer).metadata();

      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

      return (
        isPowerOfTwo(metadata.width || 0) && isPowerOfTwo(metadata.height || 0)
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if texture is square
   * @param textureBuffer - Texture image buffer
   * @returns True if square
   */
  static async isSquare(textureBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(textureBuffer).metadata();
      return metadata.width === metadata.height;
    } catch (error) {
      return false;
    }
  }
}
