import sharp from 'sharp';

/**
 * Normal map generation options
 */
export interface NormalMapOptions {
  strength?: number; // Height map strength (0-10, default: 1)
  level?: 'low' | 'medium' | 'high'; // Detail level
  invert?: boolean; // Invert height map
  blur?: number; // Pre-blur height map (0-10)
  wrap?: boolean; // Wrap edges for tileable textures
}

/**
 * Normal Map Generator Utility
 * Generates normal maps from height maps for PBR textures
 */
export class NormalMapGenerator {
  /**
   * Generate normal map from height map
   * @param heightMapBuffer - Height map image buffer (grayscale)
   * @param options - Generation options
   * @returns Normal map buffer (RGB)
   */
  static async generateFromHeightMap(
    heightMapBuffer: Buffer,
    options: NormalMapOptions = {},
  ): Promise<Buffer> {
    try {
      const {
        strength = 1.0,
        invert = false,
        blur = 0,
        wrap = false,
      } = options;

      // Convert to grayscale if not already
      let heightMap = await sharp(heightMapBuffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = heightMap;
      const width = info.width;
      const height = info.height;

      // Apply blur if requested
      if (blur > 0) {
        const blurred = await sharp(heightMapBuffer)
          .blur(blur)
          .grayscale()
          .raw()
          .toBuffer({ resolveWithObject: true });
        heightMap = blurred;
      }

      // Calculate normal map
      const normalData = Buffer.alloc(width * height * 3); // RGB

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Get surrounding pixels (with wrapping if enabled)
          const tl = this.getPixel(data, x - 1, y - 1, width, height, wrap);
          const t = this.getPixel(data, x, y - 1, width, height, wrap);
          const tr = this.getPixel(data, x + 1, y - 1, width, height, wrap);
          const l = this.getPixel(data, x - 1, y, width, height, wrap);
          const r = this.getPixel(data, x + 1, y, width, height, wrap);
          const bl = this.getPixel(data, x - 1, y + 1, width, height, wrap);
          const b = this.getPixel(data, x, y + 1, width, height, wrap);
          const br = this.getPixel(data, x + 1, y + 1, width, height, wrap);

          // Sobel operator for edge detection
          const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
          const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

          // Calculate normal
          let nX = -dX * strength;
          let nY = invert ? dY * strength : -dY * strength;
          const nZ = 255;

          // Normalize
          const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ);
          nX = ((nX / len) * 0.5 + 0.5) * 255;
          nY = ((nY / len) * 0.5 + 0.5) * 255;
          const normalizedZ = ((nZ / len) * 0.5 + 0.5) * 255;

          // Write to output buffer
          const idx = (y * width + x) * 3;
          normalData[idx] = Math.round(nX);
          normalData[idx + 1] = Math.round(nY);
          normalData[idx + 2] = Math.round(normalizedZ);
        }
      }

      // Convert to PNG
      return await sharp(normalData, {
        raw: {
          width,
          height,
          channels: 3,
        },
      })
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to generate normal map: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate normal map from diffuse texture
   * @param diffuseBuffer - Diffuse texture buffer
   * @param options - Generation options
   * @returns Normal map buffer
   */
  static async generateFromDiffuse(
    diffuseBuffer: Buffer,
    options: NormalMapOptions = {},
  ): Promise<Buffer> {
    try {
      // Convert diffuse to grayscale to use as height map
      const heightMap = await sharp(diffuseBuffer)
        .grayscale()
        .toBuffer();

      return this.generateFromHeightMap(heightMap, options);
    } catch (error) {
      throw new Error(
        `Failed to generate from diffuse: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Invert normal map (flip Y channel)
   * @param normalMapBuffer - Normal map buffer
   * @returns Inverted normal map buffer
   */
  static async invert(normalMapBuffer: Buffer): Promise<Buffer> {
    try {
      const { data, info } = await sharp(normalMapBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const inverted = Buffer.alloc(data.length);

      for (let i = 0; i < data.length; i += info.channels) {
        inverted[i] = data[i]; // R unchanged
        inverted[i + 1] = 255 - data[i + 1]; // Invert G (Y)
        inverted[i + 2] = data[i + 2]; // B unchanged
        if (info.channels === 4) {
          inverted[i + 3] = data[i + 3]; // Alpha unchanged
        }
      }

      return await sharp(inverted, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to invert normal map: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Adjust normal map strength
   * @param normalMapBuffer - Normal map buffer
   * @param strength - Strength multiplier (0-2, where 1 is unchanged)
   * @returns Adjusted normal map buffer
   */
  static async adjustStrength(
    normalMapBuffer: Buffer,
    strength: number,
  ): Promise<Buffer> {
    try {
      const { data, info } = await sharp(normalMapBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const adjusted = Buffer.alloc(data.length);

      for (let i = 0; i < data.length; i += info.channels) {
        // Convert from [0, 255] to [-1, 1]
        let nX = (data[i] / 255) * 2 - 1;
        let nY = (data[i + 1] / 255) * 2 - 1;
        const nZ = (data[i + 2] / 255) * 2 - 1;

        // Apply strength
        nX *= strength;
        nY *= strength;

        // Normalize
        const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ);
        nX = ((nX / len) * 0.5 + 0.5) * 255;
        nY = ((nY / len) * 0.5 + 0.5) * 255;
        const normalizedZ = ((nZ / len) * 0.5 + 0.5) * 255;

        adjusted[i] = Math.round(nX);
        adjusted[i + 1] = Math.round(nY);
        adjusted[i + 2] = Math.round(normalizedZ);
        if (info.channels === 4) {
          adjusted[i + 3] = data[i + 3];
        }
      }

      return await sharp(adjusted, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to adjust strength: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Blend two normal maps
   * @param normalMap1 - First normal map
   * @param normalMap2 - Second normal map
   * @param weight - Blend weight (0-1, where 0 is all map1, 1 is all map2)
   * @returns Blended normal map
   */
  static async blend(
    normalMap1: Buffer,
    normalMap2: Buffer,
    weight: number = 0.5,
  ): Promise<Buffer> {
    try {
      // TODO: Implement proper normal map blending
      // This should use UDN (Unpack-Dot-Normalize) or RNM (Reoriented Normal Mapping)

      // Simple linear blend for now
      return await sharp(normalMap1)
        .composite([
          {
            input: normalMap2,
            blend: 'over',
            // Apply weight via opacity
          },
        ])
        .toBuffer();
    } catch (error) {
      throw new Error(
        `Failed to blend normal maps: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get pixel value with wrapping/clamping
   * @param data - Image data buffer
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param width - Image width
   * @param height - Image height
   * @param wrap - Enable wrapping
   * @returns Pixel value
   */
  private static getPixel(
    data: Buffer,
    x: number,
    y: number,
    width: number,
    height: number,
    wrap: boolean,
  ): number {
    if (wrap) {
      // Wrap coordinates
      x = ((x % width) + width) % width;
      y = ((y % height) + height) % height;
    } else {
      // Clamp coordinates
      x = Math.max(0, Math.min(width - 1, x));
      y = Math.max(0, Math.min(height - 1, y));
    }

    return data[y * width + x];
  }

  /**
   * Validate normal map (check if RGB values represent valid normals)
   * @param normalMapBuffer - Normal map buffer
   * @returns True if valid normal map
   */
  static async isValidNormalMap(normalMapBuffer: Buffer): Promise<boolean> {
    try {
      const { data, info } = await sharp(normalMapBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Sample some pixels and check if they represent valid unit vectors
      const sampleCount = Math.min(100, data.length / info.channels);
      let validCount = 0;

      for (let i = 0; i < sampleCount; i++) {
        const idx = Math.floor(Math.random() * (data.length / info.channels)) * info.channels;

        // Convert from [0, 255] to [-1, 1]
        const nX = (data[idx] / 255) * 2 - 1;
        const nY = (data[idx + 1] / 255) * 2 - 1;
        const nZ = (data[idx + 2] / 255) * 2 - 1;

        // Check if close to unit length
        const len = Math.sqrt(nX * nX + nY * nY + nZ * nZ);
        if (Math.abs(len - 1.0) < 0.1) {
          validCount++;
        }
      }

      // Consider valid if >80% of samples are unit vectors
      return validCount / sampleCount > 0.8;
    } catch (error) {
      return false;
    }
  }
}
