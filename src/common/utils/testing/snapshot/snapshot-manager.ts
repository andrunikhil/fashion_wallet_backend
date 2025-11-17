/**
 * Sanitization options for snapshot data
 */
export interface SanitizeOptions {
  uuids?: boolean;
  dates?: boolean;
  tokens?: boolean;
  customSanitizers?: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
}

/**
 * Snapshot manager for sanitizing and testing snapshot data
 *
 * Provides utilities to sanitize dynamic data (UUIDs, dates, tokens)
 * before creating snapshots, making tests more stable and deterministic
 *
 * @example
 * ```typescript
 * // Sanitize data before snapshot
 * const sanitized = SnapshotManager.sanitize(apiResponse, {
 *   uuids: true,
 *   dates: true,
 *   tokens: true
 * });
 * expect(sanitized).toMatchSnapshot();
 *
 * // Assert with automatic sanitization
 * SnapshotManager.assertMatchesSnapshot(
 *   apiResponse,
 *   'user-create-response'
 * );
 * ```
 */
export class SnapshotManager {
  /**
   * Sanitize data for snapshot testing
   *
   * Replaces dynamic values with placeholders to make snapshots stable
   *
   * @param data Data to sanitize
   * @param options Sanitization options
   * @returns Sanitized data
   */
  static sanitize(data: any, options: SanitizeOptions = {}): any {
    const {
      uuids = true,
      dates = true,
      tokens = true,
      customSanitizers = []
    } = options;

    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(data));

    const traverse = (obj: any, path: string = ''): void => {
      if (obj === null || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Sanitize UUIDs
        if (uuids && typeof value === 'string' && this.isUUID(value)) {
          obj[key] = '<UUID>';
        }
        // Sanitize dates
        else if (dates && this.isDate(value)) {
          obj[key] = '<DATE>';
        }
        // Sanitize tokens and sensitive fields
        else if (tokens && typeof value === 'string' && this.isSensitive(key)) {
          obj[key] = '<REDACTED>';
        }
        // Apply custom sanitizers
        else if (typeof value === 'string') {
          for (const sanitizer of customSanitizers) {
            if (sanitizer.pattern.test(value)) {
              obj[key] = sanitizer.replacement;
              break;
            }
          }
        }

        // Recurse for nested objects
        if (typeof value === 'object' && value !== null) {
          traverse(value, currentPath);
        }
      }
    };

    traverse(sanitized);
    return sanitized;
  }

  /**
   * Check if value is a UUID
   */
  private static isUUID(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Check if value is a date
   */
  private static isDate(value: any): boolean {
    if (value instanceof Date) {
      return true;
    }
    if (typeof value === 'string') {
      // Check common date formats
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
        /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}/ // MM/DD/YYYY
      ];
      return datePatterns.some(pattern => pattern.test(value));
    }
    return false;
  }

  /**
   * Check if field name indicates sensitive data
   */
  private static isSensitive(key: string): boolean {
    const sensitivePatterns = [
      /token/i,
      /secret/i,
      /password/i,
      /apikey/i,
      /api_key/i,
      /auth/i,
      /credential/i,
      /private/i
    ];
    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Assert that data matches snapshot with automatic sanitization
   *
   * @param actual Actual data
   * @param snapshotName Snapshot name
   * @param options Sanitization options
   */
  static assertMatchesSnapshot(
    actual: any,
    snapshotName: string,
    options?: SanitizeOptions
  ): void {
    const sanitized = this.sanitize(actual, options);
    expect(sanitized).toMatchSnapshot(snapshotName);
  }

  /**
   * Sanitize array of objects while preserving array structure
   *
   * @param data Array to sanitize
   * @param options Sanitization options
   * @returns Sanitized array
   */
  static sanitizeArray(data: any[], options?: SanitizeOptions): any[] {
    return data.map(item => this.sanitize(item, options));
  }

  /**
   * Create a sanitizer for specific field patterns
   *
   * @param pattern RegExp pattern to match field names
   * @param replacement Replacement value
   * @returns Sanitize options with custom sanitizer
   */
  static createFieldSanitizer(
    pattern: RegExp,
    replacement: string = '<SANITIZED>'
  ): SanitizeOptions {
    return {
      customSanitizers: [{ pattern, replacement }]
    };
  }

  /**
   * Merge multiple sanitization options
   *
   * @param options Array of sanitization options to merge
   * @returns Merged sanitization options
   */
  static mergeOptions(...options: SanitizeOptions[]): SanitizeOptions {
    const merged: SanitizeOptions = {
      uuids: false,
      dates: false,
      tokens: false,
      customSanitizers: []
    };

    for (const opt of options) {
      if (opt.uuids) merged.uuids = true;
      if (opt.dates) merged.dates = true;
      if (opt.tokens) merged.tokens = true;
      if (opt.customSanitizers) {
        merged.customSanitizers = [
          ...(merged.customSanitizers || []),
          ...opt.customSanitizers
        ];
      }
    }

    return merged;
  }

  /**
   * Sort object keys recursively for consistent snapshots
   *
   * @param data Data to sort
   * @returns Data with sorted keys
   */
  static sortKeys(data: any): any {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sortKeys(item));
    }

    const sorted: any = {};
    const keys = Object.keys(data).sort();

    for (const key of keys) {
      sorted[key] = this.sortKeys(data[key]);
    }

    return sorted;
  }

  /**
   * Sanitize and sort for maximum snapshot stability
   *
   * @param data Data to prepare for snapshot
   * @param options Sanitization options
   * @returns Sanitized and sorted data
   */
  static prepareForSnapshot(data: any, options?: SanitizeOptions): any {
    const sanitized = this.sanitize(data, options);
    return this.sortKeys(sanitized);
  }
}
