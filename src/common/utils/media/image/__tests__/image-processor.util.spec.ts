import { ImageProcessor } from '../image-processor.util';
import sharp from 'sharp';

describe('ImageProcessor', () => {
  let testImageBuffer: Buffer;

  beforeAll(async () => {
    // Create a test image buffer (100x100 red square)
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
  });

  describe('resize', () => {
    it('should resize image to specified dimensions', async () => {
      const resized = await ImageProcessor.resize(testImageBuffer, {
        width: 50,
        height: 50,
      });

      const metadata = await sharp(resized).metadata();
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });

    it('should maintain aspect ratio with fit inside', async () => {
      const resized = await ImageProcessor.resize(testImageBuffer, {
        width: 200,
        height: 100,
        fit: 'inside',
        withoutEnlargement: true,
      });

      const metadata = await sharp(resized).metadata();
      expect(metadata.width).toBeLessThanOrEqual(200);
      expect(metadata.height).toBeLessThanOrEqual(100);
    });
  });

  describe('crop', () => {
    it('should crop image to specified region', async () => {
      const cropped = await ImageProcessor.crop(testImageBuffer, {
        left: 10,
        top: 10,
        width: 50,
        height: 50,
      });

      const metadata = await sharp(cropped).metadata();
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });
  });

  describe('rotate', () => {
    it('should rotate image by specified degrees', async () => {
      const rotated = await ImageProcessor.rotate(testImageBuffer, 90);
      expect(rotated).toBeInstanceOf(Buffer);
      expect(rotated.length).toBeGreaterThan(0);
    });
  });

  describe('flipHorizontal', () => {
    it('should flip image horizontally', async () => {
      const flipped = await ImageProcessor.flipHorizontal(testImageBuffer);
      expect(flipped).toBeInstanceOf(Buffer);
      expect(flipped.length).toBeGreaterThan(0);
    });
  });

  describe('flipVertical', () => {
    it('should flip image vertically', async () => {
      const flipped = await ImageProcessor.flipVertical(testImageBuffer);
      expect(flipped).toBeInstanceOf(Buffer);
      expect(flipped.length).toBeGreaterThan(0);
    });
  });

  describe('convert', () => {
    it('should convert image to different format', async () => {
      const converted = await ImageProcessor.convert(testImageBuffer, 'jpeg', 85);
      const metadata = await sharp(converted).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    it('should convert to WebP format', async () => {
      const converted = await ImageProcessor.convert(testImageBuffer, 'webp', 85);
      const metadata = await sharp(converted).metadata();
      expect(metadata.format).toBe('webp');
    });
  });

  describe('getMetadata', () => {
    it('should extract image metadata', async () => {
      const metadata = await ImageProcessor.getMetadata(testImageBuffer);

      expect(metadata.width).toBe(100);
      expect(metadata.height).toBe(100);
      expect(metadata.format).toBe('png');
      expect(metadata.channels).toBe(3);
    });
  });

  describe('adjustQuality', () => {
    it('should adjust image quality', async () => {
      const adjusted = await ImageProcessor.adjustQuality(testImageBuffer, 50);
      expect(adjusted).toBeInstanceOf(Buffer);
      expect(adjusted.length).toBeGreaterThan(0);
    });
  });

  describe('blur', () => {
    it('should apply blur effect', async () => {
      const blurred = await ImageProcessor.blur(testImageBuffer, 5);
      expect(blurred).toBeInstanceOf(Buffer);
      expect(blurred.length).toBeGreaterThan(0);
    });
  });

  describe('sharpen', () => {
    it('should sharpen image', async () => {
      const sharpened = await ImageProcessor.sharpen(testImageBuffer, 1);
      expect(sharpened).toBeInstanceOf(Buffer);
      expect(sharpened.length).toBeGreaterThan(0);
    });
  });

  describe('grayscale', () => {
    it('should convert image to grayscale', async () => {
      const grayscale = await ImageProcessor.grayscale(testImageBuffer);
      const metadata = await sharp(grayscale).metadata();
      expect(metadata.channels).toBeLessThanOrEqual(2); // Grayscale has 1-2 channels
    });
  });

  describe('normalize', () => {
    it('should normalize image contrast', async () => {
      const normalized = await ImageProcessor.normalize(testImageBuffer);
      expect(normalized).toBeInstanceOf(Buffer);
      expect(normalized.length).toBeGreaterThan(0);
    });
  });

  describe('smartCrop', () => {
    it('should perform smart crop', async () => {
      const cropped = await ImageProcessor.smartCrop(testImageBuffer, 50, 50);
      const metadata = await sharp(cropped).metadata();
      expect(metadata.width).toBe(50);
      expect(metadata.height).toBe(50);
    });
  });

  describe('composite', () => {
    it('should composite two images', async () => {
      const overlay = await sharp({
        create: {
          width: 20,
          height: 20,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .png()
        .toBuffer();

      const composited = await ImageProcessor.composite(testImageBuffer, overlay, {
        left: 10,
        top: 10,
      });

      expect(composited).toBeInstanceOf(Buffer);
      expect(composited.length).toBeGreaterThan(0);
    });
  });
});
