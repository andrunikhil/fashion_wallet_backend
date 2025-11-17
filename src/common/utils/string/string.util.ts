/**
 * String utility class for string manipulation and formatting
 * Provides comprehensive string operations including slugification, case conversion, and text formatting
 */
export class StringUtil {
  /**
   * Converts a string to a URL-friendly slug
   * @param text Text to convert
   * @param separator Separator character (default: '-')
   * @returns URL-safe slug
   */
  static slugify(text: string, separator: string = '-'): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, separator) // Replace spaces with separator
      .replace(/[^\w\-]+/g, '') // Remove non-word chars except separator
      .replace(/\-\-+/g, separator) // Replace multiple separators with single
      .replace(/^-+/, '') // Trim separator from start
      .replace(/-+$/, ''); // Trim separator from end
  }

  /**
   * Truncates a string to a maximum length
   * @param text Text to truncate
   * @param maxLength Maximum length
   * @param suffix Suffix to append (default: '...')
   * @param preserveWords Whether to preserve whole words (default: true)
   * @returns Truncated string
   */
  static truncate(
    text: string,
    maxLength: number,
    suffix: string = '...',
    preserveWords: boolean = true,
  ): string {
    if (text.length <= maxLength) {
      return text;
    }

    const truncated = text.substring(0, maxLength - suffix.length);

    if (preserveWords) {
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        return truncated.substring(0, lastSpace) + suffix;
      }
    }

    return truncated + suffix;
  }

  /**
   * Capitalizes the first letter of a string
   * @param text Text to capitalize
   * @returns Capitalized string
   */
  static capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalizes the first letter of each word
   * @param text Text to capitalize
   * @returns Title case string
   */
  static titleCase(text: string): string {
    return text
      .toLowerCase()
      .split(' ')
      .map((word) => this.capitalize(word))
      .join(' ');
  }

  /**
   * Converts string to camelCase
   * @param text Text to convert
   * @returns camelCase string
   */
  static camelCase(text: string): string {
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Converts string to PascalCase
   * @param text Text to convert
   * @returns PascalCase string
   */
  static pascalCase(text: string): string {
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Converts string to snake_case
   * @param text Text to convert
   * @returns snake_case string
   */
  static snakeCase(text: string): string {
    return text
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/^_+/, '')
      .replace(/_+/g, '_');
  }

  /**
   * Converts string to kebab-case
   * @param text Text to convert
   * @returns kebab-case string
   */
  static kebabCase(text: string): string {
    return text
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+/, '')
      .replace(/-+/g, '-');
  }

  /**
   * Converts string to CONSTANT_CASE
   * @param text Text to convert
   * @returns CONSTANT_CASE string
   */
  static constantCase(text: string): string {
    return this.snakeCase(text).toUpperCase();
  }

  /**
   * Generates a random string
   * @param length String length
   * @param charset Character set (default: alphanumeric)
   * @returns Random string
   */
  static random(
    length: number,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  ): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Masks a string, revealing only specified characters
   * @param text Text to mask
   * @param visibleStart Number of chars to show at start (default: 4)
   * @param visibleEnd Number of chars to show at end (default: 4)
   * @param maskChar Character to use for masking (default: '*')
   * @returns Masked string
   */
  static mask(
    text: string,
    visibleStart: number = 4,
    visibleEnd: number = 4,
    maskChar: string = '*',
  ): string {
    if (text.length <= visibleStart + visibleEnd) {
      return maskChar.repeat(text.length);
    }

    const start = text.substring(0, visibleStart);
    const end = text.substring(text.length - visibleEnd);
    const middle = maskChar.repeat(text.length - visibleStart - visibleEnd);

    return start + middle + end;
  }

  /**
   * Masks an email address
   * @param email Email to mask
   * @returns Masked email
   */
  static maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    const maskedLocal = this.mask(localPart, 2, 0);
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Masks a phone number
   * @param phone Phone number to mask
   * @returns Masked phone number
   */
  static maskPhone(phone: string): string {
    return this.mask(phone, 3, 2);
  }

  /**
   * Replaces template variables in a string
   * @param template Template string with {{variable}} placeholders
   * @param variables Object with variable values
   * @returns String with variables replaced
   */
  static template(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Pads a string to a specified length
   * @param text Text to pad
   * @param length Target length
   * @param char Padding character (default: ' ')
   * @param direction Padding direction (default: 'end')
   * @returns Padded string
   */
  static pad(
    text: string,
    length: number,
    char: string = ' ',
    direction: 'start' | 'end' | 'both' = 'end',
  ): string {
    if (text.length >= length) return text;

    const padLength = length - text.length;

    if (direction === 'start') {
      return char.repeat(padLength) + text;
    } else if (direction === 'end') {
      return text + char.repeat(padLength);
    } else {
      const leftPad = Math.floor(padLength / 2);
      const rightPad = padLength - leftPad;
      return char.repeat(leftPad) + text + char.repeat(rightPad);
    }
  }

  /**
   * Reverses a string
   * @param text Text to reverse
   * @returns Reversed string
   */
  static reverse(text: string): string {
    return text.split('').reverse().join('');
  }

  /**
   * Counts occurrences of a substring
   * @param text Text to search in
   * @param search Substring to search for
   * @param caseSensitive Whether search is case sensitive (default: true)
   * @returns Number of occurrences
   */
  static count(text: string, search: string, caseSensitive: boolean = true): number {
    if (!caseSensitive) {
      text = text.toLowerCase();
      search = search.toLowerCase();
    }

    let count = 0;
    let position = 0;

    while ((position = text.indexOf(search, position)) !== -1) {
      count++;
      position += search.length;
    }

    return count;
  }

  /**
   * Removes all whitespace from a string
   * @param text Text to process
   * @returns String without whitespace
   */
  static removeWhitespace(text: string): string {
    return text.replace(/\s+/g, '');
  }

  /**
   * Normalizes whitespace (multiple spaces to single space)
   * @param text Text to normalize
   * @returns Normalized string
   */
  static normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Escapes HTML special characters
   * @param text Text to escape
   * @returns Escaped string
   */
  static escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };

    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
  }

  /**
   * Unescapes HTML special characters
   * @param text Text to unescape
   * @returns Unescaped string
   */
  static unescapeHtml(text: string): string {
    const htmlUnescapes: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
    };

    return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (entity) => htmlUnescapes[entity]);
  }

  /**
   * Extracts all numbers from a string
   * @param text Text to extract from
   * @returns Array of numbers
   */
  static extractNumbers(text: string): number[] {
    const matches = text.match(/-?\d+\.?\d*/g);
    return matches ? matches.map(Number) : [];
  }

  /**
   * Extracts all emails from a string
   * @param text Text to extract from
   * @returns Array of email addresses
   */
  static extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(emailRegex) || [];
  }

  /**
   * Extracts all URLs from a string
   * @param text Text to extract from
   * @returns Array of URLs
   */
  static extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Checks if a string is empty or contains only whitespace
   * @param text Text to check
   * @returns true if blank
   */
  static isBlank(text: string): boolean {
    return !text || text.trim().length === 0;
  }

  /**
   * Abbreviates a name (e.g., "John Doe" -> "JD")
   * @param name Name to abbreviate
   * @returns Abbreviated name
   */
  static abbreviate(name: string): string {
    return name
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  /**
   * Pluralizes a word (simple English rules)
   * @param word Word to pluralize
   * @param count Count to determine plural
   * @returns Pluralized word
   */
  static pluralize(word: string, count: number): string {
    if (count === 1) return word;

    // Simple pluralization rules
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    }

    return word + 's';
  }

  /**
   * Wraps text to a specified width
   * @param text Text to wrap
   * @param width Maximum line width
   * @returns Wrapped text
   */
  static wordWrap(text: string, width: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }
}
