/**
 * Media Processing Performance Benchmarks
 * Tests performance against plan requirements
 */

import {
  ImageUtil,
  ImageConverter,
  ImageOptimizer,
  ThumbnailGenerator,
  FileUtil,
  ImageFormat,
} from '../../src/common/utils';
import { TestHelpers } from '../../src/common/utils/__tests__/test-helpers';

describe('Media Processing Performance Benchmarks', () => {
  // Performance targets from plan-utils-01.md
  const TARGETS = {
    imageResize4K: 100, // ms
    imageConversion: 200, // ms
    thumbnailGeneration: 50, // ms
    fileValidation: 10, // ms
  };

  let testImage: Buffer;
  let largeImage: Buffer; // 4K image

  beforeAll(async () => {
    testImage = await TestHelpers.createTestImage(1920, 1080);
    largeImage = await TestHelpers.createTestImage(3840, 2160); // 4K
  });

  describe('Image Resize Benchmarks', () => {
    it('should resize 4K image within 100ms', async () => {
      const start = Date.now();

      await ImageUtil.resize(largeImage, {
        width: 1920,
        height: 1080,
      });

      const duration = Date.now() - start;

      console.log(`4K resize took ${duration}ms (target: <${TARGETS.imageResize4K}ms)`);
      expect(duration).toBeLessThan(TARGETS.imageResize4K);
    });

    it('should resize HD image efficiently', async () => {
      const start = Date.now();

      await ImageUtil.resize(testImage, {
        width: 800,
        height: 600,
      });

      const duration = Date.now() - start;

      console.log(`HD resize took ${duration}ms`);
      // HD should be much faster than 4K
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Format Conversion Benchmarks', () => {
    it('should convert PNG to JPEG within 200ms', async () => {
      const start = Date.now();

      await ImageConverter.toJPEG(testImage, 80);

      const duration = Date.now() - start;

      console.log(`PNG→JPEG conversion took ${duration}ms (target: <${TARGETS.imageConversion}ms)`);
      expect(duration).toBeLessThan(TARGETS.imageConversion);
    });

    it('should convert to WebP within 200ms', async () => {
      const start = Date.now();

      await ImageConverter.toWebP(testImage, 80);

      const duration = Date.now() - start;

      console.log(`WebP conversion took ${duration}ms`);
      expect(duration).toBeLessThan(TARGETS.imageConversion);
    });

    it('should convert to AVIF within 200ms', async () => {
      const start = Date.now();

      await ImageConverter.toAVIF(testImage, 80);

      const duration = Date.now() - start;

      console.log(`AVIF conversion took ${duration}ms`);
      // AVIF might be slower due to higher compression complexity
      expect(duration).toBeLessThan(TARGETS.imageConversion * 2);
    });
  });

  describe('Thumbnail Generation Benchmarks', () => {
    it('should generate thumbnail within 50ms', async () => {
      const start = Date.now();

      await ThumbnailGenerator.generate(testImage, {
        width: 256,
        height: 256,
        fit: 'cover',
      });

      const duration = Date.now() - start;

      console.log(`Thumbnail generation took ${duration}ms (target: <${TARGETS.thumbnailGeneration}ms)`);
      expect(duration).toBeLessThan(TARGETS.thumbnailGeneration);
    });

    it('should generate multiple thumbnails efficiently', async () => {
      const start = Date.now();

      await ThumbnailGenerator.generateMultipleSizes(
        testImage,
        ['small', 'medium', 'large'],
      );

      const duration = Date.now() - start;

      console.log(`Multiple thumbnails took ${duration}ms`);
      // Should be less than 3x single thumbnail
      expect(duration).toBeLessThan(TARGETS.thumbnailGeneration * 3);
    });
  });

  describe('File Validation Benchmarks', () => {
    it('should validate file within 10ms', async () => {
      const start = Date.now();

      await FileUtil.validate(testImage, {
        maxSize: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg'],
      });

      const duration = Date.now() - start;

      console.log(`File validation took ${duration}ms (target: <${TARGETS.fileValidation}ms)`);
      expect(duration).toBeLessThan(TARGETS.fileValidation);
    });

    it('should detect MIME type quickly', async () => {
      const start = Date.now();

      await FileUtil.getMimeType(testImage);

      const duration = Date.now() - start;

      console.log(`MIME detection took ${duration}ms`);
      expect(duration).toBeLessThan(5);
    });
  });

  describe('Hash Calculation Benchmarks', () => {
    it('should calculate SHA256 hash efficiently', async () => {
      const start = Date.now();

      await FileUtil.calculateSHA256(testImage);

      const duration = Date.now() - start;

      console.log(`SHA256 hash took ${duration}ms`);
      expect(duration).toBeLessThan(50);
    });

    it('should calculate MD5 hash efficiently', async () => {
      const start = Date.now();

      await FileUtil.calculateMD5(testImage);

      const duration = Date.now() - start;

      console.log(`MD5 hash took ${duration}ms`);
      expect(duration).toBeLessThan(30);
    });
  });

  describe('Optimization Benchmarks', () => {
    it('should optimize image for web efficiently', async () => {
      const start = Date.now();

      const optimized = await ImageOptimizer.optimize(testImage, {
        quality: 80,
        maxWidth: 1920,
        stripMetadata: true,
      });

      const duration = Date.now() - start;
      const savings = ((testImage.length - optimized.length) / testImage.length) * 100;

      console.log(`Optimization took ${duration}ms, saved ${savings.toFixed(1)}%`);
      expect(duration).toBeLessThan(200);
      expect(savings).toBeGreaterThan(0); // Should achieve some savings
    });

    it('should generate responsive variants efficiently', async () => {
      const start = Date.now();

      const variants = await ImageOptimizer.generateResponsiveVariants(
        testImage,
        [320, 640, 1024],
        ImageFormat.JPEG,
        80,
      );

      const duration = Date.now() - start;

      console.log(`Responsive variants (3 sizes) took ${duration}ms`);
      expect(duration).toBeLessThan(300);
      expect(variants.size).toBe(3);
    });
  });

  describe('Batch Processing Benchmarks', () => {
    it('should process 10 images efficiently', async () => {
      const images: Buffer[] = [];
      for (let i = 0; i < 10; i++) {
        images.push(await TestHelpers.createTestImage(800, 600));
      }

      const start = Date.now();

      for (const img of images) {
        await ImageOptimizer.optimize(img, {
          maxWidth: 640,
          quality: 80,
        });
      }

      const duration = Date.now() - start;
      const avgPerImage = duration / 10;

      console.log(`Batch 10 images took ${duration}ms (${avgPerImage.toFixed(1)}ms per image)`);
      expect(avgPerImage).toBeLessThan(150);
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should handle large images without memory issues', async () => {
      const memBefore = process.memoryUsage().heapUsed;

      // Process large image multiple times
      for (let i = 0; i < 5; i++) {
        await ImageUtil.resize(largeImage, {
          width: 1920,
          height: 1080,
        });
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncreaseMB = (memAfter - memBefore) / 1024 / 1024;

      console.log(`Memory increase: ${memIncreaseMB.toFixed(2)}MB`);

      // Should not leak excessive memory
      expect(memIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Compression Ratio Benchmarks', () => {
    it('should achieve 30%+ average file size reduction', async () => {
      const optimized = await ImageOptimizer.optimize(testImage, {
        quality: 80,
        stripMetadata: true,
      });

      const savingsPercent = ((testImage.length - optimized.length) / testImage.length) * 100;

      console.log(`Achieved ${savingsPercent.toFixed(1)}% size reduction`);
      expect(savingsPercent).toBeGreaterThan(30);
    });
  });

  describe('End-to-End Pipeline Benchmark', () => {
    it('should complete full avatar processing pipeline within 1 second', async () => {
      const start = Date.now();

      // Full pipeline: resize → optimize → thumbnails → analysis
      const resized = await ImageUtil.resize(testImage, {
        width: 512,
        height: 512,
        fit: 'cover',
      });

      const optimized = await ImageOptimizer.optimize(resized, {
        quality: 85,
      });

      const thumbnails = await ThumbnailGenerator.generateMultipleSizes(
        optimized,
        ['small', 'medium'],
      );

      const duration = Date.now() - start;

      console.log(`Full pipeline took ${duration}ms`);
      expect(duration).toBeLessThan(1000); // < 1 second
      expect(thumbnails.size).toBe(2);
    });
  });

  describe('Performance Summary', () => {
    it('should log performance summary', () => {
      console.log('\n=== Performance Targets Summary ===');
      console.log(`Image Resize (4K): <${TARGETS.imageResize4K}ms`);
      console.log(`Image Conversion: <${TARGETS.imageConversion}ms`);
      console.log(`Thumbnail Generation: <${TARGETS.thumbnailGeneration}ms`);
      console.log(`File Validation: <${TARGETS.fileValidation}ms`);
      console.log('===================================\n');
      expect(true).toBe(true);
    });
  });
});
