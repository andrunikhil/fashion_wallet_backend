import sharp from 'sharp';

/**
 * Color interface
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  hex: string;
  count?: number;
  percentage?: number;
}

/**
 * Color palette interface
 */
export interface ColorPalette {
  colors: Color[];
  dominantColor: Color;
  averageColor: Color;
}

/**
 * Color histogram interface
 */
export interface ColorHistogram {
  red: number[];
  green: number[];
  blue: number[];
}

/**
 * Color Analyzer Utility
 * Analyzes colors in images
 */
export class ColorAnalyzer {
  /**
   * Extract dominant colors from image
   * @param image - Image buffer
   * @param count - Number of colors to extract (default: 5)
   * @returns Array of dominant colors
   */
  static async extractDominantColors(image: Buffer, count: number = 5): Promise<Color[]> {
    try {
      // Resize image for faster processing
      const resized = await sharp(image)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = resized;
      const pixels: Color[] = [];

      // Extract all pixels
      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        pixels.push({
          r,
          g,
          b,
          hex: this.rgbToHex(r, g, b),
        });
      }

      // Group similar colors and count occurrences
      const colorMap = new Map<string, { color: Color; count: number }>();

      for (const pixel of pixels) {
        // Round colors to reduce similar colors
        const roundedR = Math.round(pixel.r / 10) * 10;
        const roundedG = Math.round(pixel.g / 10) * 10;
        const roundedB = Math.round(pixel.b / 10) * 10;
        const key = `${roundedR},${roundedG},${roundedB}`;

        if (colorMap.has(key)) {
          colorMap.get(key)!.count++;
        } else {
          colorMap.set(key, {
            color: {
              r: roundedR,
              g: roundedG,
              b: roundedB,
              hex: this.rgbToHex(roundedR, roundedG, roundedB),
            },
            count: 1,
          });
        }
      }

      // Sort by count and take top N
      const sortedColors = Array.from(colorMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, count);

      const totalPixels = pixels.length;

      return sortedColors.map((item) => ({
        ...item.color,
        count: item.count,
        percentage: (item.count / totalPixels) * 100,
      }));
    } catch (error) {
      throw new Error(
        `Failed to extract dominant colors: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate color palette from image
   * @param image - Image buffer
   * @param colors - Number of colors in palette (default: 5)
   * @returns Color palette
   */
  static async generatePalette(image: Buffer, colors: number = 5): Promise<ColorPalette> {
    try {
      const dominantColors = await this.extractDominantColors(image, colors);
      const averageColor = await this.averageColor(image);

      return {
        colors: dominantColors,
        dominantColor: dominantColors[0],
        averageColor,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate palette: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get color histogram
   * @param image - Image buffer
   * @returns Color histogram
   */
  static async getHistogram(image: Buffer): Promise<ColorHistogram> {
    try {
      const { data } = await sharp(image)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const red = new Array(256).fill(0);
      const green = new Array(256).fill(0);
      const blue = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 3) {
        red[data[i]]++;
        green[data[i + 1]]++;
        blue[data[i + 2]]++;
      }

      return { red, green, blue };
    } catch (error) {
      throw new Error(
        `Failed to get histogram: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate color similarity (0-1, where 1 is identical)
   * @param color1 - First color
   * @param color2 - Second color
   * @returns Similarity score
   */
  static async calculateSimilarity(color1: Color, color2: Color): Promise<number> {
    try {
      // Use Euclidean distance in RGB space
      const distance = Math.sqrt(
        Math.pow(color1.r - color2.r, 2) +
          Math.pow(color1.g - color2.g, 2) +
          Math.pow(color1.b - color2.b, 2),
      );

      // Normalize to 0-1 range (max distance in RGB is sqrt(255^2 * 3))
      const maxDistance = Math.sqrt(255 * 255 * 3);
      return 1 - distance / maxDistance;
    } catch (error) {
      throw new Error(
        `Failed to calculate similarity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculate average color of image
   * @param image - Image buffer
   * @returns Average color
   */
  static async averageColor(image: Buffer): Promise<Color> {
    try {
      const { data, info } = await sharp(image)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      const pixelCount = data.length / info.channels;

      for (let i = 0; i < data.length; i += info.channels) {
        totalR += data[i];
        totalG += data[i + 1];
        totalB += data[i + 2];
      }

      const r = Math.round(totalR / pixelCount);
      const g = Math.round(totalG / pixelCount);
      const b = Math.round(totalB / pixelCount);

      return {
        r,
        g,
        b,
        hex: this.rgbToHex(r, g, b),
      };
    } catch (error) {
      throw new Error(
        `Failed to calculate average color: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Check if image is mostly a single color
   * @param image - Image buffer
   * @param threshold - Similarity threshold (default: 0.8)
   * @returns True if mostly single color
   */
  static async isMonochromatic(image: Buffer, threshold: number = 0.8): Promise<boolean> {
    try {
      const dominantColors = await this.extractDominantColors(image, 1);
      if (dominantColors.length === 0) {
        return false;
      }

      const dominantPercentage = dominantColors[0].percentage || 0;
      return dominantPercentage >= threshold * 100;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if image is grayscale
   * @param image - Image buffer
   * @returns True if grayscale
   */
  static async isGrayscale(image: Buffer): Promise<boolean> {
    try {
      const { data } = await sharp(image)
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Check if R, G, B values are approximately equal for most pixels
      let grayscalePixels = 0;
      const totalPixels = data.length / 3;

      for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Allow small variance (±5)
        if (Math.abs(r - g) <= 5 && Math.abs(g - b) <= 5 && Math.abs(r - b) <= 5) {
          grayscalePixels++;
        }
      }

      // If more than 90% of pixels are grayscale, consider it grayscale
      return grayscalePixels / totalPixels > 0.9;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert RGB to HEX
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   * @returns HEX color string
   */
  private static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * Convert HEX to RGB
   * @param hex - HEX color string
   * @returns RGB color
   */
  static hexToRgb(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      throw new Error('Invalid HEX color');
    }

    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);

    return { r, g, b, hex: this.rgbToHex(r, g, b) };
  }

  /**
   * Get brightness of a color (0-255)
   * @param color - Color
   * @returns Brightness value
   */
  static getBrightness(color: Color): number {
    // Use perceived brightness formula
    return (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  }

  /**
   * Check if color is dark
   * @param color - Color
   * @param threshold - Brightness threshold (default: 128)
   * @returns True if dark
   */
  static isDark(color: Color, threshold: number = 128): boolean {
    return this.getBrightness(color) < threshold;
  }

  /**
   * Check if color is light
   * @param color - Color
   * @param threshold - Brightness threshold (default: 128)
   * @returns True if light
   */
  static isLight(color: Color, threshold: number = 128): boolean {
    return !this.isDark(color, threshold);
  }
}
