/**
 * Media Processing Integration Tests
 * Tests end-to-end media processing workflows
 */

import {
  ImageUtil,
  ImageConverter,
  ImageOptimizer,
  ThumbnailGenerator,
  ImageAnalyzer,
  FileUtil,
  ImageFormat,
} from '../../src/common/utils';
import { TestHelpers } from '../../src/common/utils/__tests__/test-helpers';
import * as path from 'path';

describe('Media Processing Integration Tests', () => {
  const tempDir = path.join(__dirname, 'temp-integration');
  let originalImage: Buffer;

  beforeAll(async () => {
    // Create a larger test image for realistic testing
    originalImage = await TestHelpers.createTestImage(2000, 1500);
    await FileUtil.ensureDirectory(tempDir);
  });

  afterAll(async () => {
    // Clean up
    try {
      const fs = await import('fs');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Avatar Photo Processing Pipeline', () => {
    it('should process avatar photo: resize → optimize → thumbnails → analyze colors', async () => {
      // Step 1: Validate input
      const validation = await ImageUtil.validate(originalImage, {
        maxWidth: 4000,
        maxHeight: 4000,
        maxSize: 10 * 1024 * 1024,
        allowedFormats: [ImageFormat.PNG, ImageFormat.JPEG],
      });
      expect(validation.valid).toBe(true);

      // Step 2: Resize to standard dimensions
      const resized = await ImageUtil.resize(originalImage, {
        width: 1024,
        height: 1024,
        fit: 'cover',
        position: 'attention', // Smart crop
      });

      const resizedMeta = await ImageUtil.getMetadata(resized);
      expect(resizedMeta.width).toBe(1024);
      expect(resizedMeta.height).toBe(1024);

      // Step 3: Optimize for web
      const optimized = await ImageOptimizer.optimize(resized, {
        quality: 85,
        progressive: true,
        stripMetadata: true,
      });

      expect(optimized.length).toBeLessThan(resized.length);

      // Step 4: Generate thumbnails
      const thumbnails = await ThumbnailGenerator.generateMultipleSizes(
        optimized,
        ['small', 'medium', 'large'],
        ImageFormat.JPEG,
        80,
      );

      expect(thumbnails.size).toBe(3);
      expect(thumbnails.has('small')).toBe(true);
      expect(thumbnails.has('medium')).toBe(true);
      expect(thumbnails.has('large')).toBe(true);

      // Step 5: Analyze colors for avatar theming
      const colors = await ImageAnalyzer.extractColors(optimized);
      expect(colors.dominant).toMatch(/^#[0-9a-f]{6}$/i);
      expect(colors.palette.length).toBeGreaterThan(0);

      // Step 6: Calculate perceptual hash for duplicate detection
      const hash = await ImageAnalyzer.calculateDHash(optimized);
      expect(hash.hash).toBeDefined();
      expect(hash.algorithm).toBe('dhash');

      // Success: Full pipeline completed
      expect(true).toBe(true);
    });
  });

  describe('Catalog Item Processing Pipeline', () => {
    it('should process catalog item: convert formats → responsive variants → optimize', async () => {
      // Step 1: Convert to multiple formats
      const formats = await ImageConverter.generateMultipleFormats(
        originalImage,
        [ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.AVIF],
        80,
      );

      expect(formats.size).toBe(3);
      expect(formats.has(ImageFormat.JPEG)).toBe(true);
      expect(formats.has(ImageFormat.WEBP)).toBe(true);
      expect(formats.has(ImageFormat.AVIF)).toBe(true);

      // Step 2: Generate responsive variants for each format
      const jpegBuffer = formats.get(ImageFormat.JPEG)!;
      const responsiveVariants = await ImageOptimizer.generateResponsiveVariants(
        jpegBuffer,
        [320, 640, 1024, 1920],
        ImageFormat.JPEG,
        80,
      );

      expect(responsiveVariants.size).toBeGreaterThan(0);

      // Step 3: Compare format sizes to choose best
      const comparison = await ImageConverter.compareSizes(
        originalImage,
        [ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.AVIF],
        80,
      );

      expect(comparison.length).toBe(3);
      expect(comparison[0].size).toBeLessThanOrEqual(comparison[comparison.length - 1].size);

      // Step 4: Get best format automatically
      const bestFormat = await ImageConverter.selectBestFormat(
        originalImage,
        [ImageFormat.JPEG, ImageFormat.WEBP, ImageFormat.AVIF],
        80,
      );

      expect(bestFormat.format).toBeDefined();
      expect(bestFormat.buffer).toBeInstanceOf(Buffer);
      expect(bestFormat.size).toBeGreaterThan(0);

      // Success
      expect(true).toBe(true);
    });
  });

  describe('Design Export Pipeline', () => {
    it('should export design: high quality → optimized web → thumbnails → analysis', async () => {
      // Step 1: High quality export for download
      const highQuality = await ImageConverter.toJPEG(originalImage, 95, true);
      expect(highQuality).toBeInstanceOf(Buffer);

      // Step 2: Web-optimized version
      const webOptimized = await ImageOptimizer.optimize(originalImage, {
        maxWidth: 1920,
        quality: 80,
        progressive: true,
        stripMetadata: true,
      });

      // Web version should be smaller
      expect(webOptimized.length).toBeLessThan(highQuality.length);

      // Step 3: Generate preview thumbnail
      const preview = await ThumbnailGenerator.generateSmart(
        originalImage,
        400,
        300,
        ImageFormat.JPEG,
        85,
      );

      const previewMeta = await ImageUtil.getMetadata(preview);
      expect(previewMeta.width).toBe(400);
      expect(previewMeta.height).toBe(300);

      // Step 4: Calculate hash for caching
      const cacheKey = await FileUtil.calculateSHA256(webOptimized);
      expect(cacheKey).toMatch(/^[a-f0-9]{64}$/);

      // Step 5: Generate unique filename
      const filename = FileUtil.generateUniqueFilename('design', 'jpg');
      expect(filename).toMatch(/^design_\d+_[a-f0-9]+\.jpg$/);

      // Success
      expect(true).toBe(true);
    });
  });

  describe('Image Similarity Detection', () => {
    it('should detect similar images using perceptual hashing', async () => {
      // Create two similar images
      const image1 = await TestHelpers.createTestImage(500, 500, '#FF0000');
      const image2 = await ImageUtil.resize(image1, {
        width: 480,
        height: 480,
      }); // Slightly different size

      // Calculate hashes
      const hash1 = await ImageAnalyzer.calculateDHash(image1);
      const hash2 = await ImageAnalyzer.calculateDHash(image2);

      // Compare hashes
      const similarity = ImageAnalyzer.compareHashes(hash1.hash, hash2.hash);
      expect(similarity.similarity).toBeGreaterThan(0.8); // Should be very similar

      // Use convenience method
      const areSimilar = await ImageAnalyzer.areSimilar(image1, image2, 0.8);
      expect(areSimilar).toBe(true);

      // Test with completely different image
      const differentImage = await TestHelpers.createTestImage(500, 500, '#0000FF');
      const areDifferent = await ImageAnalyzer.areSimilar(image1, differentImage, 0.9);
      expect(areDifferent).toBe(false);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple images efficiently', async () => {
      // Create multiple test images
      const images: Buffer[] = [];
      for (let i = 0; i < 5; i++) {
        images.push(await TestHelpers.createTestImage(800, 600));
      }

      // Batch resize
      const resized: Buffer[] = [];
      for (const img of images) {
        const r = await ImageUtil.resize(img, {
          width: 400,
          height: 300,
        });
        resized.push(r);
      }

      expect(resized.length).toBe(5);

      // Batch optimize
      const optimized: Buffer[] = [];
      for (const img of resized) {
        const o = await ImageOptimizer.optimize(img, {
          quality: 80,
        });
        optimized.push(o);
      }

      expect(optimized.length).toBe(5);

      // Verify all are smaller than originals
      for (let i = 0; i < images.length; i++) {
        expect(optimized[i].length).toBeLessThan(images[i].length);
      }
    });
  });

  describe('File Operations Integration', () => {
    it('should handle complete file lifecycle', async () => {
      // Step 1: Generate unique filename
      const filename = FileUtil.generateUniqueFilename('avatar', 'jpg');
      const filepath = path.join(tempDir, filename);

      // Step 2: Process image
      const processed = await ImageOptimizer.optimize(originalImage, {
        maxWidth: 800,
        quality: 80,
      });

      // Step 3: Save to disk
      await FileUtil.writeFile(filepath, processed);
      expect(await FileUtil.fileExists(filepath)).toBe(true);

      // Step 4: Read back
      const loaded = await FileUtil.readFile(filepath);
      expect(loaded.length).toBe(processed.length);

      // Step 5: Validate
      const validation = await FileUtil.validate(loaded, {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });
      expect(validation.valid).toBe(true);

      // Step 6: Calculate hash for integrity
      const originalHash = await FileUtil.calculateSHA256(processed);
      const loadedHash = await FileUtil.calculateSHA256(loaded);
      expect(originalHash).toBe(loadedHash);

      // Step 7: Clean up
      await FileUtil.deleteFile(filepath);
      expect(await FileUtil.fileExists(filepath)).toBe(false);
    });
  });

  describe('Progressive Optimization', () => {
    it('should progressively optimize to target file size', async () => {
      const targetSizeKB = 50; // Target 50KB

      const optimized = await ImageOptimizer.optimize(originalImage, {
        targetSizeKB,
        maxWidth: 800,
      });

      const actualSizeKB = optimized.length / 1024;

      // Should be close to target (within 20% margin)
      expect(actualSizeKB).toBeLessThanOrEqual(targetSizeKB * 1.2);
    });
  });

  describe('Quality vs Size Tradeoff', () => {
    it('should demonstrate quality vs size tradeoffs', async () => {
      const qualities = [50, 70, 90];
      const results: Array<{ quality: number; size: number }> = [];

      for (const quality of qualities) {
        const optimized = await ImageConverter.toJPEG(originalImage, quality);
        results.push({ quality, size: optimized.length });
      }

      // Higher quality should result in larger files
      expect(results[0].size).toBeLessThan(results[1].size);
      expect(results[1].size).toBeLessThan(results[2].size);
    });
  });

  describe('Format Comparison', () => {
    it('should compare different format efficiencies', async () => {
      const comparison = await ImageConverter.compareSizes(
        originalImage,
        [ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP],
        80,
      );

      expect(comparison.length).toBe(3);

      // Verify results are sorted by size
      for (let i = 0; i < comparison.length - 1; i++) {
        expect(comparison[i].size).toBeLessThanOrEqual(comparison[i + 1].size);
      }

      // Each result should have savings calculated
      comparison.forEach((result) => {
        expect(result.savings).toBeDefined();
        expect(typeof result.savings).toBe('number');
      });
    });
  });
});
