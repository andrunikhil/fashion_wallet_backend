import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize string input to prevent XSS attacks
 * Strips all HTML tags by default
 */
export function Sanitize(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Strip all HTML tags and potentially dangerous content
    return sanitizeHtml(value, {
      allowedTags: [], // No HTML tags allowed
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape',
    }).trim();
  });
}

/**
 * Sanitize string but allow safe HTML tags
 * Useful for rich text content like descriptions
 */
export function SanitizeHtml(allowedTags?: string[]): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    return sanitizeHtml(value, {
      allowedTags: allowedTags || ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape',
    }).trim();
  });
}

/**
 * Trim whitespace from string input
 */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Convert to lowercase
 */
export function ToLowerCase(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    return value;
  });
}

/**
 * Escape SQL-like characters to prevent injection
 * This is a basic protection - parameterized queries are still required
 */
export function EscapeSql(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Replace dangerous SQL characters
    return value
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove multi-line comment start
      .replace(/\*\//g, ''); // Remove multi-line comment end
  });
}

/**
 * Remove path traversal attempts
 */
export function SanitizePath(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove path traversal patterns
    return value
      .replace(/\.\./g, '')
      .replace(/\\/g, '')
      .replace(/\//g, '')
      .trim();
  });
}

/**
 * Validate and sanitize URL
 */
export function SanitizeUrl(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();

    // Block javascript: and data: URLs
    if (
      trimmed.toLowerCase().startsWith('javascript:') ||
      trimmed.toLowerCase().startsWith('data:') ||
      trimmed.toLowerCase().startsWith('vbscript:')
    ) {
      return '';
    }

    return trimmed;
  });
}
