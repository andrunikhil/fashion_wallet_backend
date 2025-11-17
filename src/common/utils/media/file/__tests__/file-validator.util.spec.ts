import { FileValidator } from '../file-validator.util';

describe('FileValidator', () => {
  describe('validate', () => {
    it('should validate a valid file', async () => {
      const buffer = Buffer.from('test file content');
      const result = await FileValidator.validate(buffer, {
        minSize: 1,
        maxSize: 1024,
      });

      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
    });

    it('should reject file exceeding max size', async () => {
      const buffer = Buffer.alloc(1024 * 1024); // 1MB
      const result = await FileValidator.validate(buffer, {
        maxSize: 100,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid file size'));
    });

    it('should reject file below min size', async () => {
      const buffer = Buffer.from('small');
      const result = await FileValidator.validate(buffer, {
        minSize: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid file size'));
    });
  });

  describe('validateSize', () => {
    it('should validate size within range', () => {
      expect(FileValidator.validateSize(500, 100, 1000)).toBe(true);
    });

    it('should reject size below minimum', () => {
      expect(FileValidator.validateSize(50, 100, 1000)).toBe(false);
    });

    it('should reject size above maximum', () => {
      expect(FileValidator.validateSize(1500, 100, 1000)).toBe(false);
    });

    it('should validate with only minimum', () => {
      expect(FileValidator.validateSize(500, 100)).toBe(true);
      expect(FileValidator.validateSize(50, 100)).toBe(false);
    });

    it('should validate with only maximum', () => {
      expect(FileValidator.validateSize(500, undefined, 1000)).toBe(true);
      expect(FileValidator.validateSize(1500, undefined, 1000)).toBe(false);
    });
  });

  describe('validateExtension', () => {
    it('should validate allowed extension', () => {
      expect(FileValidator.validateExtension('test.jpg', ['jpg', 'png'])).toBe(true);
      expect(FileValidator.validateExtension('test.png', ['jpg', 'png'])).toBe(true);
    });

    it('should reject disallowed extension', () => {
      expect(FileValidator.validateExtension('test.gif', ['jpg', 'png'])).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(FileValidator.validateExtension('test.JPG', ['jpg', 'png'])).toBe(true);
      expect(FileValidator.validateExtension('test.PNG', ['jpg', 'png'])).toBe(true);
    });

    it('should handle extensions with dot', () => {
      expect(FileValidator.validateExtension('test.jpg', ['.jpg', '.png'])).toBe(true);
    });
  });

  describe('validateMimeType', () => {
    it('should validate exact MIME type match', () => {
      const buffer = Buffer.from('test');
      expect(FileValidator.validateMimeType(buffer, ['image/jpeg'], 'image/jpeg')).toBe(true);
    });

    it('should validate wildcard MIME type', () => {
      const buffer = Buffer.from('test');
      expect(FileValidator.validateMimeType(buffer, ['image/*'], 'image/jpeg')).toBe(true);
      expect(FileValidator.validateMimeType(buffer, ['image/*'], 'image/png')).toBe(true);
    });

    it('should reject non-matching MIME type', () => {
      const buffer = Buffer.from('test');
      expect(FileValidator.validateMimeType(buffer, ['image/jpeg'], 'video/mp4')).toBe(false);
    });
  });

  describe('scanForMalware', () => {
    it('should pass clean file', async () => {
      const buffer = Buffer.from('clean file content');
      const result = await FileValidator.scanForMalware(buffer);
      expect(result).toBe(true);
    });

    it('should detect suspicious script patterns', async () => {
      const buffer = Buffer.from('<script>alert("xss")</script>');
      const result = await FileValidator.scanForMalware(buffer);
      expect(result).toBe(false);
    });

    it('should detect javascript: protocol', async () => {
      const buffer = Buffer.from('javascript:void(0)');
      const result = await FileValidator.scanForMalware(buffer);
      expect(result).toBe(false);
    });
  });

  describe('validateImage', () => {
    it('should validate image with default options', async () => {
      const buffer = Buffer.from('fake image data');
      const result = await FileValidator.validateImage(buffer);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });

  describe('validateModel', () => {
    it('should validate 3D model with default options', async () => {
      const buffer = Buffer.from('fake model data');
      const result = await FileValidator.validateModel(buffer);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });

  describe('validateVideo', () => {
    it('should validate video with default options', async () => {
      const buffer = Buffer.from('fake video data');
      const result = await FileValidator.validateVideo(buffer);

      expect(result).toBeDefined();
      expect(result.valid).toBeDefined();
    });
  });
});
