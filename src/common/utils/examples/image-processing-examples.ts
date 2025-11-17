/**
 * Image Processing Examples
 * Practical examples of using the image processing utilities
 */

import {
  ImageUtil,
  ImageConverter,
  ImageOptimizer,
  ThumbnailGenerator,
  ImageAnalyzer,
  ImageFormat,
} from '../index';

export class ImageProcessingExamples {
  /**
   * Example 1: Process user avatar
   * Resize, optimize, and generate thumbnails for a user avatar
   */
  static async processUserAvatar(imageBuffer: Buffer): Promise<{
    main: Buffer;
    thumbnails: Map<string, Buffer>;
    colors: any;
  }> {
    // Resize to square format with smart cropping
    const resized = await ImageUtil.resize(imageBuffer, {
      width: 512,
      height: 512,
      fit: 'cover',
      position: 'attention', // Smart cropping
    });

    // Optimize for web
    const optimized = await ImageOptimizer.optimize(resized, {
      quality: 85,
      progressive: true,
      stripMetadata: true,
    });

    // Generate thumbnails
    const thumbnails = await ThumbnailGenerator.generateMultipleSizes(
      optimized,
      ['tiny', 'small', 'medium'],
      ImageFormat.JPEG,
      80,
    );

    // Extract colors for UI theming
    const colors = await ImageAnalyzer.extractColors(optimized);

    return {
      main: optimized,
      thumbnails,
      colors,
    };
  }

  /**
   * Example 2: Optimize product catalog image
   * Generate multiple formats and sizes for responsive delivery
   */
  static async processProductImage(imageBuffer: Buffer): Promise<{
    formats: Map<ImageFormat, Buffer>;
    responsive: Map<number, Buffer>;
    preview: Buffer;
  }> {
    // Generate WebP and AVIF for modern browsers
    const formats = await ImageConverter.generateMultipleFormats(
      imageBuffer,
      [ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.AVIF],
      85,
    );

    // Generate responsive variants
    const responsive = await ImageOptimizer.generateResponsiveVariants(
      imageBuffer,
      [320, 640, 1024, 1920],
      ImageFormat.JPEG,
      80,
    );

    // Generate preview thumbnail
    const preview = await ThumbnailGenerator.generate(imageBuffer, {
      width: 400,
      height: 400,
      fit: 'cover',
      quality: 80,
      format: ImageFormat.JPEG,
    });

    return {
      formats,
      responsive,
      preview,
    };
  }

  /**
   * Example 3: Detect duplicate images
   * Use perceptual hashing to find similar images
   */
  static async findDuplicates(
    images: Buffer[],
    threshold: number = 0.9,
  ): Promise<Array<{ index: number; duplicates: number[] }>> {
    const hashes: string[] = [];
    const duplicates: Array<{ index: number; duplicates: number[] }> = [];

    // Calculate hashes for all images
    for (const img of images) {
      const hash = await ImageAnalyzer.calculateDHash(img);
      hashes.push(hash.hash);
    }

    // Find duplicates
    for (let i = 0; i < hashes.length; i++) {
      const dups: number[] = [];
      for (let j = i + 1; j < hashes.length; j++) {
        const similarity = ImageAnalyzer.compareHashes(hashes[i], hashes[j]);
        if (similarity.similarity >= threshold) {
          dups.push(j);
        }
      }
      if (dups.length > 0) {
        duplicates.push({ index: i, duplicates: dups });
      }
    }

    return duplicates;
  }

  /**
   * Example 4: Create image sprite sheet
   * Combine multiple images into a single sprite sheet
   */
  static async createIconSpriteSheet(
    icons: Buffer[],
    columns: number = 4,
  ): Promise<Buffer> {
    // Ensure all icons are same size
    const resizedIcons: Buffer[] = [];
    for (const icon of icons) {
      const resized = await ImageUtil.resize(icon, {
        width: 64,
        height: 64,
        fit: 'contain',
        background: 'transparent',
      });
      resizedIcons.push(resized);
    }

    // Create sprite sheet
    const spriteSheet = await ThumbnailGenerator.generateSpriteSheet({
      images: resizedIcons,
      columns,
      spacing: 2,
      background: 'transparent',
    });

    return spriteSheet;
  }

  /**
   * Example 5: Add watermark to image
   */
  static async addWatermark(
    image: Buffer,
    watermark: Buffer,
  ): Promise<Buffer> {
    // Resize watermark to 20% of image size
    const imageMeta = await ImageUtil.getMetadata(image);
    const watermarkSize = Math.floor((imageMeta.width || 0) * 0.2);

    const resizedWatermark = await ImageUtil.resize(watermark, {
      width: watermarkSize,
      fit: 'inside',
    });

    // Generate thumbnail with watermark
    const watermarked = await ThumbnailGenerator.generateWithWatermark(
      image,
      resizedWatermark,
      {
        width: imageMeta.width || 800,
        height: imageMeta.height || 600,
        fit: 'contain',
      },
      'bottom-right',
    );

    return watermarked;
  }

  /**
   * Example 6: Optimize for target file size
   */
  static async optimizeToSize(
    image: Buffer,
    targetKB: number,
  ): Promise<Buffer> {
    const optimized = await ImageOptimizer.optimize(image, {
      targetSizeKB: targetKB,
      quality: 85,
      stripMetadata: true,
    });

    return optimized;
  }

  /**
   * Example 7: Extract dominant color palette
   */
  static async extractBrandColors(image: Buffer): Promise<{
    primary: string;
    secondary: string;
    palette: string[];
  }> {
    const colors = await ImageAnalyzer.extractColors(image, 8);

    return {
      primary: colors.dominant,
      secondary: colors.vibrant || colors.palette[1],
      palette: colors.palette,
    };
  }

  /**
   * Example 8: Generate circular avatar
   */
  static async generateCircularAvatar(
    image: Buffer,
    size: number = 128,
  ): Promise<Buffer> {
    const circular = await ThumbnailGenerator.generateCircular(
      image,
      size,
      ImageFormat.PNG,
      90,
    );

    return circular;
  }

  /**
   * Example 9: Batch process images with progress
   */
  static async batchProcess(
    images: Buffer[],
    onProgress?: (current: number, total: number) => void,
  ): Promise<Buffer[]> {
    const results: Buffer[] = [];

    for (let i = 0; i < images.length; i++) {
      const optimized = await ImageOptimizer.optimize(images[i], {
        maxWidth: 1920,
        quality: 80,
      });
      results.push(optimized);

      if (onProgress) {
        onProgress(i + 1, images.length);
      }
    }

    return results;
  }

  /**
   * Example 10: Create responsive srcset
   */
  static async generateResponsiveSrcSet(
    image: Buffer,
    baseUrl: string,
    filenamePrefix: string,
  ): Promise<{
    variants: Map<number, Buffer>;
    srcset: string;
  }> {
    // Generate variants
    const variants = await ImageOptimizer.generateResponsiveVariants(
      image,
      [320, 640, 1024, 1920],
      ImageFormat.JPEG,
      80,
    );

    // Generate srcset string
    const filenameMap = new Map<number, string>();
    for (const [width] of variants) {
      filenameMap.set(width, `${filenamePrefix}-${width}w.jpg`);
    }

    const srcset = ImageOptimizer.generateSrcSet(baseUrl, filenameMap);

    return {
      variants,
      srcset,
    };
  }
}
