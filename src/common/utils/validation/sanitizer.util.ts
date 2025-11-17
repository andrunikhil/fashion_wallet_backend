import DOMPurify from 'isomorphic-dompurify';
import * as path from 'path';

/**
 * Sanitization utility class for cleaning and normalizing user input
 * Provides security-focused sanitization to prevent XSS, SQL injection, and path traversal
 */
export class SanitizationUtil {
  /**
   * Sanitizes HTML content to prevent XSS attacks
   * Removes dangerous tags and attributes
   * @param html HTML content to sanitize
   * @param allowedTags Optional array of allowed HTML tags
   * @returns Sanitized HTML string
   */
  static sanitizeHtml(html: string, allowedTags?: string[]): string {
    if (!html) return '';

    const config: any = {
      ALLOWED_TAGS: allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'title', 'target'],
      ALLOW_DATA_ATTR: false,
    };

    return DOMPurify.sanitize(html, config);
  }

  /**
   * Strips all HTML tags from a string
   * @param html HTML content to strip
   * @returns Plain text without HTML tags
   */
  static stripHtml(html: string): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  }

  /**
   * Sanitizes input to prevent SQL injection
   * Escapes dangerous SQL characters
   * @param input Input string to sanitize
   * @returns Sanitized string safe for SQL queries
   */
  static sanitizeSql(input: string): string {
    if (!input) return '';

    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comment start
      .replace(/\*\//g, ''); // Remove multi-line comment end
  }

  /**
   * Sanitizes filename to prevent path traversal attacks
   * Removes dangerous characters and path separators
   * @param filename Filename to sanitize
   * @returns Safe filename
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // Remove path components
    const basename = path.basename(filename);

    // Remove dangerous characters
    return basename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars
      .replace(/\.{2,}/g, '_') // Replace multiple dots
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitizes file path to prevent path traversal
   * @param filePath File path to sanitize
   * @param baseDir Base directory to restrict path to
   * @returns Sanitized path or null if path traversal detected
   */
  static sanitizePath(filePath: string, baseDir: string): string | null {
    if (!filePath) return null;

    // Resolve the path
    const resolvedPath = path.resolve(baseDir, filePath);
    const resolvedBase = path.resolve(baseDir);

    // Check if the resolved path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      return null; // Path traversal attempt detected
    }

    return resolvedPath;
  }

  /**
   * Normalizes email address
   * Converts to lowercase and trims whitespace
   * @param email Email address to normalize
   * @returns Normalized email
   */
  static normalizeEmail(email: string): string {
    if (!email) return '';

    return email.trim().toLowerCase();
  }

  /**
   * Sanitizes phone number to remove formatting
   * Keeps only digits and optional leading +
   * @param phone Phone number to sanitize
   * @returns Sanitized phone number
   */
  static sanitizePhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remove all non-digit characters except leading +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Ensure + only appears at the start
    if (cleaned.includes('+')) {
      const parts = cleaned.split('+');
      return '+' + parts.join('');
    }

    return cleaned;
  }

  /**
   * Sanitizes input for use in URLs
   * Removes dangerous characters
   * @param input Input string to sanitize
   * @returns URL-safe string
   */
  static sanitizeUrl(input: string): string {
    if (!input) return '';

    return encodeURIComponent(input);
  }

  /**
   * Sanitizes input to prevent XSS in attributes
   * @param input Input string to sanitize
   * @returns Sanitized string safe for HTML attributes
   */
  static sanitizeAttribute(input: string): string {
    if (!input) return '';

    return input
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Trims and normalizes whitespace in a string
   * @param input Input string to normalize
   * @returns String with normalized whitespace
   */
  static normalizeWhitespace(input: string): string {
    if (!input) return '';

    return input
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n'); // Replace multiple newlines with single newline
  }

  /**
   * Sanitizes input for safe JSON usage
   * @param input Input string to sanitize
   * @returns Sanitized string
   */
  static sanitizeJson(input: string): string {
    if (!input) return '';

    return input
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
  }

  /**
   * Removes null bytes from input
   * @param input Input string to clean
   * @returns String without null bytes
   */
  static removeNullBytes(input: string): string {
    if (!input) return '';

    return input.replace(/\0/g, '');
  }

  /**
   * Sanitizes input by removing control characters
   * @param input Input string to sanitize
   * @returns String without control characters
   */
  static removeControlCharacters(input: string): string {
    if (!input) return '';

    // Remove all control characters except newline, carriage return, and tab
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Sanitizes username
   * Allows only alphanumeric, underscore, and hyphen
   * @param username Username to sanitize
   * @returns Sanitized username
   */
  static sanitizeUsername(username: string): string {
    if (!username) return '';

    return username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 50); // Limit length
  }

  /**
   * Sanitizes search query
   * Removes dangerous characters that could be used in injection attacks
   * @param query Search query to sanitize
   * @returns Sanitized query
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';

    return query
      .trim()
      .replace(/[<>'"%;()&+]/g, '') // Remove dangerous characters
      .substring(0, 200); // Limit length
  }

  /**
   * Comprehensive input sanitization
   * Applies multiple sanitization steps
   * @param input Input to sanitize
   * @returns Sanitized input
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';

    let sanitized = input;
    sanitized = this.removeNullBytes(sanitized);
    sanitized = this.removeControlCharacters(sanitized);
    sanitized = this.normalizeWhitespace(sanitized);

    return sanitized;
  }
}
