/**
 * Image Analyzer Utility
 * Image analysis including color extraction and perceptual hashing
 */

import sharp from 'sharp';
import {
  ColorInfo,
  PerceptualHash,
  SimilarityResult,
} from '../../../types/media.types';

export class ImageAnalyzer {
  /**
   * Extract dominant colors from an image
   * @param input - Image buffer
   * @param numColors - Number of dominant colors to extract
   * @returns Color information
   */
  static async extractColors(
    input: Buffer,
    numColors: number = 5,
  ): Promise<ColorInfo> {
    try {
      // Resize image to small size for faster processing
      const small = await sharp(input)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = small;
      const pixels: Array<{ r: number; g: number; b: number; count: number }> = [];

      // Sample pixels
      for (let i = 0; i < data.length; i += info.channels * 10) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skip near-white and near-black pixels
        if ((r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
          continue;
        }

        pixels.push({ r, g, b, count: 1 });
      }

      // Simple color clustering
      const clusteredColors = this.clusterColors(pixels, numColors);

      // Convert to hex
      const palette = clusteredColors.map((color) =>
        this.rgbToHex(color.r, color.g, color.b),
      );

      // Find vibrant colors
      const vibrant = this.findVibrantColor(clusteredColors);
      const darkVibrant = this.findDarkVibrantColor(clusteredColors);
      const lightVibrant = this.findLightVibrantColor(clusteredColors);

      return {
        dominant: palette[0] || '#000000',
        palette,
        vibrant: vibrant ? this.rgbToHex(vibrant.r, vibrant.g, vibrant.b) : undefined,
        darkVibrant: darkVibrant ? this.rgbToHex(darkVibrant.r, darkVibrant.g, darkVibrant.b) : undefined,
        lightVibrant: lightVibrant ? this.rgbToHex(lightVibrant.r, lightVibrant.g, lightVibrant.b) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to extract colors: ${error.message}`);
    }
  }

  /**
   * Calculate perceptual hash (difference hash)
   * @param input - Image buffer
   * @returns Perceptual hash
   */
  static async calculateDHash(input: Buffer): Promise<PerceptualHash> {
    try {
      // Resize to 9x8 for dHash (8x8 hash)
      const { data } = await sharp(input)
        .resize(9, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let hash = '';

      // Compare adjacent pixels
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const left = data[row * 9 + col];
          const right = data[row * 9 + col + 1];
          hash += left < right ? '1' : '0';
        }
      }

      // Convert binary to hex
      const hexHash = this.binaryToHex(hash);

      return {
        hash: hexHash,
        algorithm: 'dhash',
      };
    } catch (error) {
      throw new Error(`Failed to calculate dHash: ${error.message}`);
    }
  }

  /**
   * Calculate average hash (aHash)
   * @param input - Image buffer
   * @returns Perceptual hash
   */
  static async calculateAHash(input: Buffer): Promise<PerceptualHash> {
    try {
      // Resize to 8x8
      const { data } = await sharp(input)
        .resize(8, 8, { fit: 'fill' })
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate average
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      const avg = sum / data.length;

      // Build hash
      let hash = '';
      for (let i = 0; i < data.length; i++) {
        hash += data[i] >= avg ? '1' : '0';
      }

      // Convert binary to hex
      const hexHash = this.binaryToHex(hash);

      return {
        hash: hexHash,
        algorithm: 'ahash',
      };
    } catch (error) {
      throw new Error(`Failed to calculate aHash: ${error.message}`);
    }
  }

  /**
   * Compare two perceptual hashes
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Similarity result
   */
  static compareHashes(hash1: string, hash2: string): SimilarityResult {
    if (hash1.length !== hash2.length) {
      throw new Error('Hashes must be of equal length');
    }

    // Convert hex to binary
    const binary1 = this.hexToBinary(hash1);
    const binary2 = this.hexToBinary(hash2);

    // Calculate Hamming distance
    let distance = 0;
    for (let i = 0; i < binary1.length; i++) {
      if (binary1[i] !== binary2[i]) {
        distance++;
      }
    }

    // Calculate similarity (0-1)
    const similarity = 1 - distance / binary1.length;

    return {
      similarity,
      distance,
    };
  }

  /**
   * Check if two images are similar
   * @param input1 - First image buffer
   * @param input2 - Second image buffer
   * @param threshold - Similarity threshold (0-1)
   * @returns True if images are similar
   */
  static async areSimilar(
    input1: Buffer,
    input2: Buffer,
    threshold: number = 0.9,
  ): Promise<boolean> {
    const hash1 = await this.calculateDHash(input1);
    const hash2 = await this.calculateDHash(input2);

    const result = this.compareHashes(hash1.hash, hash2.hash);

    return result.similarity >= threshold;
  }

  /**
   * Calculate image quality score
   * @param input - Image buffer
   * @returns Quality score (0-100)
   */
  static async calculateQualityScore(input: Buffer): Promise<number> {
    try {
      const { data, info } = await sharp(input)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calculate sharpness using Laplacian variance
      let variance = 0;
      const width = info.width;
      const height = info.height;
      const channels = info.channels;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * channels;
          const center = data[idx];
          const top = data[((y - 1) * width + x) * channels];
          const bottom = data[((y + 1) * width + x) * channels];
          const left = data[(y * width + (x - 1)) * channels];
          const right = data[(y * width + (x + 1)) * channels];

          const laplacian = Math.abs(4 * center - top - bottom - left - right);
          variance += laplacian * laplacian;
        }
      }

      variance /= (width - 2) * (height - 2);

      // Normalize to 0-100 (empirical scaling)
      const score = Math.min(100, Math.sqrt(variance) / 10);

      return Math.round(score);
    } catch (error) {
      throw new Error(`Failed to calculate quality score: ${error.message}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static clusterColors(
    pixels: Array<{ r: number; g: number; b: number; count: number }>,
    numClusters: number,
  ): Array<{ r: number; g: number; b: number }> {
    if (pixels.length === 0) return [];
    if (pixels.length <= numClusters) {
      return pixels.map(({ r, g, b }) => ({ r, g, b }));
    }

    // Simple k-means clustering
    const clusters: Array<{ r: number; g: number; b: number; count: number }> = [];

    // Initialize clusters with random pixels
    for (let i = 0; i < numClusters; i++) {
      const idx = Math.floor((i * pixels.length) / numClusters);
      clusters.push({ ...pixels[idx] });
    }

    // Iterate to converge
    for (let iter = 0; iter < 10; iter++) {
      const assignments: number[] = new Array(pixels.length);

      // Assign pixels to nearest cluster
      for (let i = 0; i < pixels.length; i++) {
        let minDist = Infinity;
        let minIdx = 0;

        for (let j = 0; j < clusters.length; j++) {
          const dist = this.colorDistance(pixels[i], clusters[j]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = j;
          }
        }

        assignments[i] = minIdx;
      }

      // Update cluster centers
      for (let j = 0; j < clusters.length; j++) {
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let i = 0; i < pixels.length; i++) {
          if (assignments[i] === j) {
            r += pixels[i].r;
            g += pixels[i].g;
            b += pixels[i].b;
            count++;
          }
        }

        if (count > 0) {
          clusters[j] = {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
            count,
          };
        }
      }
    }

    // Sort by count (most common first)
    return clusters
      .sort((a, b) => b.count - a.count)
      .map(({ r, g, b }) => ({ r, g, b }));
  }

  private static colorDistance(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
  ): number {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2),
    );
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  private static binaryToHex(binary: string): string {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      const chunk = binary.substr(i, 4);
      hex += parseInt(chunk, 2).toString(16);
    }
    return hex;
  }

  private static hexToBinary(hex: string): string {
    let binary = '';
    for (let i = 0; i < hex.length; i++) {
      const bin = parseInt(hex[i], 16).toString(2);
      binary += '0000'.substr(bin.length) + bin;
    }
    return binary;
  }

  private static findVibrantColor(
    colors: Array<{ r: number; g: number; b: number }>,
  ): { r: number; g: number; b: number } | null {
    // Find most saturated color
    let maxSat = 0;
    let vibrant: { r: number; g: number; b: number } | null = null;

    for (const color of colors) {
      const sat = this.getSaturation(color);
      if (sat > maxSat) {
        maxSat = sat;
        vibrant = color;
      }
    }

    return vibrant;
  }

  private static findDarkVibrantColor(
    colors: Array<{ r: number; g: number; b: number }>,
  ): { r: number; g: number; b: number } | null {
    let maxScore = 0;
    let darkVibrant: { r: number; g: number; b: number } | null = null;

    for (const color of colors) {
      const lightness = this.getLightness(color);
      const sat = this.getSaturation(color);
      if (lightness < 0.4 && sat > 0.3) {
        const score = sat * (0.4 - lightness);
        if (score > maxScore) {
          maxScore = score;
          darkVibrant = color;
        }
      }
    }

    return darkVibrant;
  }

  private static findLightVibrantColor(
    colors: Array<{ r: number; g: number; b: number }>,
  ): { r: number; g: number; b: number } | null {
    let maxScore = 0;
    let lightVibrant: { r: number; g: number; b: number } | null = null;

    for (const color of colors) {
      const lightness = this.getLightness(color);
      const sat = this.getSaturation(color);
      if (lightness > 0.6 && sat > 0.3) {
        const score = sat * (lightness - 0.6);
        if (score > maxScore) {
          maxScore = score;
          lightVibrant = color;
        }
      }
    }

    return lightVibrant;
  }

  private static getSaturation(color: { r: number; g: number; b: number }): number {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max === 0) return 0;

    return (max - min) / max;
  }

  private static getLightness(color: { r: number; g: number; b: number }): number {
    const r = color.r / 255;
    const g = color.g / 255;
    const b = color.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    return (max + min) / 2;
  }
}
