import { SanitizationUtil } from '../sanitizer.util';

describe('SanitizationUtil', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      const html = '<script>alert("xss")</script><p>Safe content</p>';
      const result = SanitizationUtil.sanitizeHtml(html);

      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should allow safe HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = SanitizationUtil.sanitizeHtml(html);

      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should return empty string for empty input', () => {
      expect(SanitizationUtil.sanitizeHtml('')).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = SanitizationUtil.stripHtml(html);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters from filename', () => {
      const filename = '../../../etc/passwd';
      const result = SanitizationUtil.sanitizeFilename(filename);

      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
    });

    it('should keep safe characters', () => {
      const filename = 'my-file_123.txt';
      const result = SanitizationUtil.sanitizeFilename(filename);

      expect(result).toBe('my-file_123.txt');
    });

    it('should limit filename length', () => {
      const filename = 'a'.repeat(300) + '.txt';
      const result = SanitizationUtil.sanitizeFilename(filename);

      expect(result.length).toBeLessThanOrEqual(255);
    });
  });

  describe('normalizeEmail', () => {
    it('should convert email to lowercase', () => {
      const email = 'Test@EXAMPLE.COM';
      const result = SanitizationUtil.normalizeEmail(email);

      expect(result).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const email = '  test@example.com  ';
      const result = SanitizationUtil.normalizeEmail(email);

      expect(result).toBe('test@example.com');
    });
  });

  describe('sanitizePhoneNumber', () => {
    it('should remove formatting from phone number', () => {
      const phone = '+1 (555) 123-4567';
      const result = SanitizationUtil.sanitizePhoneNumber(phone);

      expect(result).toBe('+15551234567');
    });

    it('should keep leading +', () => {
      const phone = '+12345678901';
      const result = SanitizationUtil.sanitizePhoneNumber(phone);

      expect(result).toBe('+12345678901');
    });
  });

  describe('sanitizeUrl', () => {
    it('should encode URL components', () => {
      const input = 'hello world';
      const result = SanitizationUtil.sanitizeUrl(input);

      expect(result).toBe('hello%20world');
    });

    it('should encode special characters', () => {
      const input = 'test&value=123';
      const result = SanitizationUtil.sanitizeUrl(input);

      expect(result).toContain('%26');
    });
  });

  describe('sanitizeUsername', () => {
    it('should remove invalid characters', () => {
      const username = 'user@name!123';
      const result = SanitizationUtil.sanitizeUsername(username);

      expect(result).toBe('username123');
    });

    it('should convert to lowercase', () => {
      const username = 'UserName';
      const result = SanitizationUtil.sanitizeUsername(username);

      expect(result).toBe('username');
    });

    it('should limit length', () => {
      const username = 'a'.repeat(100);
      const result = SanitizationUtil.sanitizeUsername(username);

      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('removeNullBytes', () => {
    it('should remove null bytes from string', () => {
      const input = 'hello\x00world';
      const result = SanitizationUtil.removeNullBytes(input);

      expect(result).toBe('helloworld');
      expect(result).not.toContain('\x00');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize multiple spaces', () => {
      const input = 'hello    world';
      const result = SanitizationUtil.normalizeWhitespace(input);

      expect(result).toBe('hello world');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  hello world  ';
      const result = SanitizationUtil.normalizeWhitespace(input);

      expect(result).toBe('hello world');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should remove dangerous characters', () => {
      const query = 'search<script>alert("xss")</script>';
      const result = SanitizationUtil.sanitizeSearchQuery(query);

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should limit query length', () => {
      const query = 'a'.repeat(300);
      const result = SanitizationUtil.sanitizeSearchQuery(query);

      expect(result.length).toBeLessThanOrEqual(200);
    });
  });
});
