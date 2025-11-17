/**
 * Test Helpers
 * Utilities for creating test fixtures and mocks
 */

import sharp from 'sharp';

export class TestHelpers {
  /**
   * Create a test image buffer
   * @param width - Image width
   * @param height - Image height
   * @param color - Background color (hex or rgb)
   * @returns Image buffer
   */
  static async createTestImage(
    width: number = 100,
    height: number = 100,
    color: string = '#FF0000',
  ): Promise<Buffer> {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: color,
      },
    })
      .png()
      .toBuffer();
  }

  /**
   * Create a test JPEG buffer
   */
  static async createTestJPEG(
    width: number = 100,
    height: number = 100,
  ): Promise<Buffer> {
    return await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: '#0000FF',
      },
    })
      .jpeg()
      .toBuffer();
  }

  /**
   * Create a test PNG buffer with transparency
   */
  static async createTestPNG(
    width: number = 100,
    height: number = 100,
  ): Promise<Buffer> {
    return await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
  }

  /**
   * Create a test file buffer
   */
  static createTestFileBuffer(size: number = 1024): Buffer {
    return Buffer.alloc(size, 'test');
  }

  /**
   * Create a simple GLTF model JSON
   */
  static createTestGLTF(): string {
    const gltf = {
      asset: {
        version: '2.0',
      },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
              },
              indices: 1,
            },
          ],
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: 'VEC3',
          max: [1, 1, 0],
          min: [-1, -1, 0],
        },
        {
          bufferView: 1,
          componentType: 5123,
          count: 3,
          type: 'SCALAR',
        },
      ],
      bufferViews: [
        {
          buffer: 0,
          byteOffset: 0,
          byteLength: 36,
        },
        {
          buffer: 0,
          byteOffset: 36,
          byteLength: 6,
        },
      ],
      buffers: [
        {
          byteLength: 42,
        },
      ],
    };

    return JSON.stringify(gltf);
  }

  /**
   * Mock S3 client
   */
  static mockS3Client() {
    return {
      send: jest.fn(),
    };
  }

  /**
   * Wait for a specified time (for async tests)
   */
  static async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get random string
   */
  static randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }
}
