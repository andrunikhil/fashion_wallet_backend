/**
 * ImageUtil Unit Tests
 */

import { ImageUtil } from '../media/image/image.util';
import { FlipDirection, ImageFormat } from '../../types/media.types';
import { TestHelpers } from './test-helpers';

describe('ImageUtil', () => {
  let testImage: Buffer;

  beforeAll(async () => {
    testImage = await TestHelpers.createTestImage(800, 600);
  });

  describe('resize', () => {
    it('should resize image to specified dimensions', async () => {
      const resized = await ImageUtil.resize(testImage, {
        width: 400,
        height: 300,
      });

      const metadata = await ImageUtil.getMetadata(resized);
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(300);
    });

    it('should maintain aspect ratio with fit: inside', async () => {
      const resized = await ImageUtil.resize(testImage, {
        width: 400,
        fit: 'inside',
      });

      const metadata = await ImageUtil.getMetadata(resized);
      expect(metadata.width).toBeLessThanOrEqual(400);
      expect(metadata.height).toBeLessThanOrEqual(300);
    });

    it('should not enlarge if withoutEnlargement is true', async () => {
      const small = await TestHelpers.createTestImage(50, 50);
      const resized = await ImageUtil.resize(small, {
        width: 200,
        height: 200,
        withoutEnlargement: true,
      });

      const metadata = await ImageUtil.getMetadata(resized);
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it('should throw error for invalid input', async () => {
      await expect(
        ImageUtil.resize(Buffer.from('invalid'), { width: 100 }),
      ).rejects.toThrow();
    });
  });

  describe('crop', () => {
    it('should crop image to specified region', async () => {
      const cropped = await ImageUtil.crop(testImage, {
        left: 100,
        top: 100,
        width: 200,
        height: 150,
      });

      const metadata = await ImageUtil.getMetadata(cropped);
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
    });

    it('should throw error for invalid crop region', async () => {
      await expect(
        ImageUtil.crop(testImage, {
          left: 0,
          top: 0,
          width: 10000,
          height: 10000,
        }),
      ).rejects.toThrow();
    });
  });

  describe('rotate', () => {
    it('should rotate image by 90 degrees', async () => {
      const rotated = await ImageUtil.rotate(testImage, 90);
      const metadata = await ImageUtil.getMetadata(rotated);

      // After 90 degree rotation, width and height should swap
      const originalMetadata = await ImageUtil.getMetadata(testImage);
      expect(metadata.width).toBe(originalMetadata.height);
      expect(metadata.height).toBe(originalMetadata.width);
    });

    it('should rotate image by 180 degrees', async () => {
      const rotated = await ImageUtil.rotate(testImage, 180);
      expect(rotated).toBeInstanceOf(Buffer);
    });

    it('should throw error for invalid angle', async () => {
      await expect(ImageUtil.rotate(testImage, 45)).rejects.toThrow(
        'Angle must be',
      );
    });
  });

  describe('flip', () => {
    it('should flip image horizontally', async () => {
      const flipped = await ImageUtil.flip(testImage, FlipDirection.HORIZONTAL);
      expect(flipped).toBeInstanceOf(Buffer);
      expect(flipped.length).toBeGreaterThan(0);
    });

    it('should flip image vertically', async () => {
      const flipped = await ImageUtil.flip(testImage, FlipDirection.VERTICAL);
      expect(flipped).toBeInstanceOf(Buffer);
    });

    it('should flip image both ways', async () => {
      const flipped = await ImageUtil.flip(testImage, FlipDirection.BOTH);
      expect(flipped).toBeInstanceOf(Buffer);
    });
  });

  describe('getMetadata', () => {
    it('should return correct metadata', async () => {
      const metadata = await ImageUtil.getMetadata(testImage);

      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.format).toBe('png');
      expect(metadata.channels).toBe(3);
      expect(metadata.size).toBeGreaterThan(0);
    });

    it('should handle JPEG metadata', async () => {
      const jpeg = await TestHelpers.createTestJPEG();
      const metadata = await ImageUtil.getMetadata(jpeg);

      expect(metadata.format).toBe('jpeg');
    });

    it('should throw error for invalid input', async () => {
      await expect(
        ImageUtil.getMetadata(Buffer.from('not an image')),
      ).rejects.toThrow();
    });
  });

  describe('validate', () => {
    it('should validate correct image', async () => {
      const result = await ImageUtil.validate(testImage);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toBeDefined();
    });

    it('should reject image exceeding max width', async () => {
      const result = await ImageUtil.validate(testImage, {
        maxWidth: 500,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Width'));
    });

    it('should reject image exceeding max height', async () => {
      const result = await ImageUtil.validate(testImage, {
        maxHeight: 400,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Height'));
    });

    it('should reject image below minimum dimensions', async () => {
      const result = await ImageUtil.validate(testImage, {
        minWidth: 1000,
        minHeight: 800,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid format', async () => {
      const result = await ImageUtil.validate(testImage, {
        allowedFormats: [ImageFormat.JPEG],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid format'));
    });

    it('should reject image exceeding max size', async () => {
      const result = await ImageUtil.validate(testImage, {
        maxSize: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('File size'));
    });
  });

  describe('grayscale', () => {
    it('should convert image to grayscale', async () => {
      const grayscale = await ImageUtil.grayscale(testImage);
      const metadata = await ImageUtil.getMetadata(grayscale);

      expect(metadata.channels).toBe(1);
    });
  });

  describe('blur', () => {
    it('should blur image', async () => {
      const blurred = await ImageUtil.blur(testImage, 5);
      expect(blurred).toBeInstanceOf(Buffer);
    });

    it('should use default sigma if not provided', async () => {
      const blurred = await ImageUtil.blur(testImage);
      expect(blurred).toBeInstanceOf(Buffer);
    });
  });

  describe('sharpen', () => {
    it('should sharpen image', async () => {
      const sharpened = await ImageUtil.sharpen(testImage);
      expect(sharpened).toBeInstanceOf(Buffer);
    });
  });

  describe('normalize', () => {
    it('should normalize image contrast', async () => {
      const normalized = await ImageUtil.normalize(testImage);
      expect(normalized).toBeInstanceOf(Buffer);
    });
  });

  describe('composite', () => {
    it('should composite multiple images', async () => {
      const overlay = await TestHelpers.createTestImage(50, 50, '#00FF00');

      const composited = await ImageUtil.composite(testImage, [
        { input: overlay, left: 100, top: 100 },
      ]);

      expect(composited).toBeInstanceOf(Buffer);
    });

    it('should handle multiple overlays', async () => {
      const overlay1 = await TestHelpers.createTestImage(50, 50, '#00FF00');
      const overlay2 = await TestHelpers.createTestImage(50, 50, '#0000FF');

      const composited = await ImageUtil.composite(testImage, [
        { input: overlay1, left: 100, top: 100 },
        { input: overlay2, left: 200, top: 200 },
      ]);

      expect(composited).toBeInstanceOf(Buffer);
    });
  });

  describe('createInstance', () => {
    it('should create Sharp instance', () => {
      const instance = ImageUtil.createInstance(testImage);
      expect(instance).toBeDefined();
      expect(typeof instance.resize).toBe('function');
    });
  });
});
