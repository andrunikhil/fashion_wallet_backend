/**
 * FileUtil Unit Tests
 */

import { FileUtil } from '../file/file.util';
import { TestHelpers } from './test-helpers';
import * as path from 'path';
import * as fs from 'fs';

describe('FileUtil', () => {
  const tempDir = path.join(__dirname, 'temp');
  let testBuffer: Buffer;

  beforeAll(async () => {
    testBuffer = await TestHelpers.createTestImage();
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validate', () => {
    it('should validate file within size limits', async () => {
      const result = await FileUtil.validate(testBuffer, {
        maxSize: 1024 * 1024, // 1MB
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file exceeding max size', async () => {
      const result = await FileUtil.validate(testBuffer, {
        maxSize: 10, // Very small
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum'));
    });

    it('should reject file below min size', async () => {
      const result = await FileUtil.validate(testBuffer, {
        minSize: 10 * 1024 * 1024, // 10MB
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('below minimum'));
    });

    it('should validate MIME type', async () => {
      const result = await FileUtil.validate(testBuffer, {
        allowedMimeTypes: ['image/png'],
      });

      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    it('should reject invalid MIME type', async () => {
      const result = await FileUtil.validate(testBuffer, {
        allowedMimeTypes: ['video/mp4'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid MIME type'));
    });
  });

  describe('getMimeType', () => {
    it('should detect PNG MIME type', async () => {
      const mimeType = await FileUtil.getMimeType(testBuffer);
      expect(mimeType).toBe('image/png');
    });

    it('should detect JPEG MIME type', async () => {
      const jpeg = await TestHelpers.createTestJPEG();
      const mimeType = await FileUtil.getMimeType(jpeg);
      expect(mimeType).toBe('image/jpeg');
    });

    it('should return undefined for unknown type', async () => {
      const unknown = Buffer.from('random text content');
      const mimeType = await FileUtil.getMimeType(unknown);
      expect(mimeType).toBeUndefined();
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should return jpg for image/jpeg', () => {
      expect(FileUtil.getExtensionFromMimeType('image/jpeg')).toBe('jpg');
    });

    it('should return png for image/png', () => {
      expect(FileUtil.getExtensionFromMimeType('image/png')).toBe('png');
    });

    it('should return webp for image/webp', () => {
      expect(FileUtil.getExtensionFromMimeType('image/webp')).toBe('webp');
    });

    it('should return bin for unknown MIME type', () => {
      expect(FileUtil.getExtensionFromMimeType('unknown/type')).toBe('bin');
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filename with extension', () => {
      const filename = FileUtil.generateUniqueFilename('test', 'jpg');
      expect(filename).toMatch(/^test_\d+_[a-f0-9]+\.jpg$/);
    });

    it('should generate unique filename without extension', () => {
      const filename = FileUtil.generateUniqueFilename('test');
      expect(filename).toMatch(/^test_\d+_[a-f0-9]+$/);
    });

    it('should generate different filenames on consecutive calls', () => {
      const filename1 = FileUtil.generateUniqueFilename('test');
      const filename2 = FileUtil.generateUniqueFilename('test');
      expect(filename1).not.toBe(filename2);
    });

    it('should use default prefix if not provided', () => {
      const filename = FileUtil.generateUniqueFilename();
      expect(filename).toMatch(/^file_\d+_[a-f0-9]+$/);
    });
  });

  describe('generateHashFilename', () => {
    it('should generate filename from SHA256 hash', async () => {
      const filename = await FileUtil.generateHashFilename(testBuffer, 'jpg');
      expect(filename).toMatch(/^[a-f0-9]{64}\.jpg$/);
    });

    it('should generate same filename for same content', async () => {
      const filename1 = await FileUtil.generateHashFilename(testBuffer);
      const filename2 = await FileUtil.generateHashFilename(testBuffer);
      expect(filename1).toBe(filename2);
    });

    it('should use MD5 algorithm if specified', async () => {
      const filename = await FileUtil.generateHashFilename(testBuffer, 'jpg', 'md5');
      expect(filename).toMatch(/^[a-f0-9]{32}\.jpg$/);
    });
  });

  describe('calculateHash', () => {
    it('should calculate SHA256 hash by default', async () => {
      const hash = await FileUtil.calculateHash(testBuffer);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should calculate MD5 hash', async () => {
      const hash = await FileUtil.calculateHash(testBuffer, { algorithm: 'md5' });
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should calculate SHA1 hash', async () => {
      const hash = await FileUtil.calculateHash(testBuffer, { algorithm: 'sha1' });
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });

    it('should return same hash for same content', async () => {
      const hash1 = await FileUtil.calculateHash(testBuffer);
      const hash2 = await FileUtil.calculateHash(testBuffer);
      expect(hash1).toBe(hash2);
    });
  });

  describe('calculateMD5', () => {
    it('should calculate MD5 hash', async () => {
      const hash = await FileUtil.calculateMD5(testBuffer);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('calculateSHA256', () => {
    it('should calculate SHA256 hash', async () => {
      const hash = await FileUtil.calculateSHA256(testBuffer);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('File I/O operations', () => {
    const testFilePath = path.join(tempDir, 'test-file.bin');

    describe('writeFile', () => {
      it('should write file to disk', async () => {
        await FileUtil.writeFile(testFilePath, testBuffer);
        expect(fs.existsSync(testFilePath)).toBe(true);
      });

      it('should create directory if it does not exist', async () => {
        const nestedPath = path.join(tempDir, 'nested', 'dir', 'file.bin');
        await FileUtil.writeFile(nestedPath, testBuffer);
        expect(fs.existsSync(nestedPath)).toBe(true);
      });
    });

    describe('readFile', () => {
      beforeEach(async () => {
        await FileUtil.writeFile(testFilePath, testBuffer);
      });

      it('should read file from disk', async () => {
        const content = await FileUtil.readFile(testFilePath);
        expect(content).toEqual(testBuffer);
      });

      it('should throw error for non-existent file', async () => {
        await expect(
          FileUtil.readFile('/non/existent/file.bin'),
        ).rejects.toThrow();
      });
    });

    describe('fileExists', () => {
      it('should return true for existing file', async () => {
        await FileUtil.writeFile(testFilePath, testBuffer);
        const exists = await FileUtil.fileExists(testFilePath);
        expect(exists).toBe(true);
      });

      it('should return false for non-existent file', async () => {
        const exists = await FileUtil.fileExists('/non/existent/file.bin');
        expect(exists).toBe(false);
      });
    });

    describe('getFileSize', () => {
      it('should return file size', async () => {
        await FileUtil.writeFile(testFilePath, testBuffer);
        const size = await FileUtil.getFileSize(testFilePath);
        expect(size).toBe(testBuffer.length);
      });

      it('should throw error for non-existent file', async () => {
        await expect(
          FileUtil.getFileSize('/non/existent/file.bin'),
        ).rejects.toThrow();
      });
    });

    describe('deleteFile', () => {
      it('should delete file from disk', async () => {
        await FileUtil.writeFile(testFilePath, testBuffer);
        await FileUtil.deleteFile(testFilePath);
        expect(fs.existsSync(testFilePath)).toBe(false);
      });

      it('should throw error for non-existent file', async () => {
        await expect(
          FileUtil.deleteFile('/non/existent/file.bin'),
        ).rejects.toThrow();
      });
    });

    describe('ensureDirectory', () => {
      it('should create directory', async () => {
        const dirPath = path.join(tempDir, 'new-dir');
        await FileUtil.ensureDirectory(dirPath);
        expect(fs.existsSync(dirPath)).toBe(true);
      });

      it('should create nested directories', async () => {
        const dirPath = path.join(tempDir, 'nested', 'deep', 'dir');
        await FileUtil.ensureDirectory(dirPath);
        expect(fs.existsSync(dirPath)).toBe(true);
      });

      it('should not fail if directory already exists', async () => {
        await FileUtil.ensureDirectory(tempDir);
        await expect(FileUtil.ensureDirectory(tempDir)).resolves.not.toThrow();
      });
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(FileUtil.formatFileSize(0)).toBe('0 Bytes');
      expect(FileUtil.formatFileSize(100)).toBe('100 Bytes');
      expect(FileUtil.formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format KB', () => {
      expect(FileUtil.formatFileSize(1024)).toBe('1 KB');
      expect(FileUtil.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format MB', () => {
      expect(FileUtil.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(FileUtil.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    it('should format GB', () => {
      expect(FileUtil.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should respect decimal places', () => {
      expect(FileUtil.formatFileSize(1536, 0)).toBe('2 KB');
      expect(FileUtil.formatFileSize(1536, 3)).toBe('1.500 KB');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove unsafe characters', () => {
      expect(FileUtil.sanitizeFilename('file@#$%name.jpg')).toBe('file_name.jpg');
    });

    it('should replace spaces with underscores', () => {
      expect(FileUtil.sanitizeFilename('my file name.jpg')).toBe('my_file_name.jpg');
    });

    it('should collapse multiple underscores', () => {
      expect(FileUtil.sanitizeFilename('file___name.jpg')).toBe('file_name.jpg');
    });

    it('should remove leading and trailing underscores', () => {
      expect(FileUtil.sanitizeFilename('_file_')).toBe('file');
    });

    it('should preserve safe characters', () => {
      expect(FileUtil.sanitizeFilename('file-name_123.jpg')).toBe('file-name_123.jpg');
    });
  });

  describe('getExtension', () => {
    it('should return file extension', () => {
      expect(FileUtil.getExtension('file.jpg')).toBe('jpg');
      expect(FileUtil.getExtension('file.tar.gz')).toBe('gz');
    });

    it('should return empty string for no extension', () => {
      expect(FileUtil.getExtension('file')).toBe('');
    });
  });

  describe('getBasename', () => {
    it('should return filename without extension', () => {
      expect(FileUtil.getBasename('file.jpg')).toBe('file');
      expect(FileUtil.getBasename('my.file.name.txt')).toBe('my.file.name');
    });

    it('should return filename if no extension', () => {
      expect(FileUtil.getBasename('file')).toBe('file');
    });
  });
});
