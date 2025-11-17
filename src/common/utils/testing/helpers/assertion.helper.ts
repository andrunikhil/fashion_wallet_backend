/**
 * Assertion helper for common test assertions
 * Provides reusable assertion patterns for testing
 *
 * @example
 * ```typescript
 * // Assert validation error
 * AssertionHelper.assertValidationError(error, 'email', 'Invalid email');
 *
 * // Assert database record matches expected values
 * AssertionHelper.assertDatabaseRecord(user, { email: 'test@example.com' });
 *
 * // Assert array contains partial match
 * AssertionHelper.assertArrayContains(users, { role: 'admin' });
 * ```
 */
export class AssertionHelper {
  /**
   * Assert that an error is a validation error with specific field
   *
   * @param error The error to check
   * @param field Field name that should have validation error
   * @param message Optional expected error message
   */
  static assertValidationError(
    error: any,
    field: string,
    message?: string
  ): void {
    expect(error).toBeDefined();
    expect(error.message).toBeDefined();

    // Check if it's a NestJS validation error structure
    if (error.response?.message) {
      const messages = Array.isArray(error.response.message)
        ? error.response.message
        : [error.response.message];

      const fieldError = messages.find((msg: string) =>
        msg.toLowerCase().includes(field.toLowerCase())
      );

      expect(fieldError).toBeDefined();

      if (message) {
        expect(fieldError).toContain(message);
      }
    } else if (error.errors || error.fields) {
      // Check for custom validation error structure
      const errors = error.errors || error.fields;
      expect(errors).toHaveProperty(field);

      if (message) {
        const fieldErrors = Array.isArray(errors[field])
          ? errors[field]
          : [errors[field]];
        expect(fieldErrors.some((err: string) => err.includes(message))).toBe(
          true
        );
      }
    } else {
      throw new Error(
        'Error does not match expected validation error structure'
      );
    }
  }

  /**
   * Assert that a database record matches expected partial values
   * Excludes timestamp fields by default
   *
   * @param actual Actual record from database
   * @param expected Expected partial values
   * @param excludeFields Fields to exclude from comparison (default: ['createdAt', 'updatedAt'])
   */
  static assertDatabaseRecord<T>(
    actual: T,
    expected: Partial<T>,
    excludeFields: string[] = ['createdAt', 'updatedAt']
  ): void {
    const actualFiltered = Object.entries(actual as any)
      .filter(([key]) => !excludeFields.includes(key))
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    expect(actualFiltered).toMatchObject(expected);
  }

  /**
   * Assert that an array contains an object matching partial criteria
   *
   * @param array Array to search
   * @param partial Partial object to match
   */
  static assertArrayContains<T>(array: T[], partial: Partial<T>): void {
    const found = array.some(item =>
      Object.entries(partial).every(
        ([key, value]) => (item as any)[key] === value
      )
    );

    expect(found).toBe(true);

    if (!found) {
      throw new Error(
        `Array does not contain object matching ${JSON.stringify(partial)}`
      );
    }
  }

  /**
   * Assert that an array does not contain an object matching partial criteria
   *
   * @param array Array to search
   * @param partial Partial object to match
   */
  static assertArrayNotContains<T>(array: T[], partial: Partial<T>): void {
    const found = array.some(item =>
      Object.entries(partial).every(
        ([key, value]) => (item as any)[key] === value
      )
    );

    expect(found).toBe(false);

    if (found) {
      throw new Error(
        `Array contains object matching ${JSON.stringify(partial)}`
      );
    }
  }

  /**
   * Assert that two arrays have the same elements (order-independent)
   *
   * @param actual Actual array
   * @param expected Expected array
   */
  static assertArraysEqual<T>(actual: T[], expected: T[]): void {
    expect(actual).toHaveLength(expected.length);

    const actualSorted = [...actual].sort();
    const expectedSorted = [...expected].sort();

    expect(actualSorted).toEqual(expectedSorted);
  }

  /**
   * Assert that an object matches a schema definition
   *
   * @param obj Object to validate
   * @param schema Schema definition with field types
   */
  static assertSchema(
    obj: any,
    schema: Record<string, string | ((value: any) => boolean)>
  ): void {
    for (const [key, validator] of Object.entries(schema)) {
      expect(obj).toHaveProperty(key);

      if (typeof validator === 'function') {
        expect(validator(obj[key])).toBe(true);
      } else {
        const value = obj[key];

        switch (validator) {
          case 'string':
            expect(typeof value).toBe('string');
            break;
          case 'number':
            expect(typeof value).toBe('number');
            break;
          case 'boolean':
            expect(typeof value).toBe('boolean');
            break;
          case 'uuid':
            expect(typeof value).toBe('string');
            expect(value).toMatch(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
            break;
          case 'date':
            expect(
              value instanceof Date || !isNaN(Date.parse(value))
            ).toBe(true);
            break;
          case 'array':
            expect(Array.isArray(value)).toBe(true);
            break;
          case 'object':
            expect(typeof value).toBe('object');
            expect(value).not.toBeNull();
            break;
          default:
            throw new Error(`Unknown schema validator: ${validator}`);
        }
      }
    }
  }

  /**
   * Assert that a date is recent (within last N seconds)
   *
   * @param date Date to check
   * @param seconds Number of seconds to consider "recent" (default: 60)
   */
  static assertRecentDate(date: Date | string, seconds: number = 60): void {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();

    expect(diff).toBeLessThan(seconds * 1000);
    expect(diff).toBeGreaterThanOrEqual(0);
  }

  /**
   * Assert that two dates are approximately equal (within tolerance)
   *
   * @param actual Actual date
   * @param expected Expected date
   * @param toleranceMs Tolerance in milliseconds (default: 1000)
   */
  static assertDatesEqual(
    actual: Date | string,
    expected: Date | string,
    toleranceMs: number = 1000
  ): void {
    const actualDate = actual instanceof Date ? actual : new Date(actual);
    const expectedDate =
      expected instanceof Date ? expected : new Date(expected);

    const diff = Math.abs(actualDate.getTime() - expectedDate.getTime());

    expect(diff).toBeLessThanOrEqual(toleranceMs);
  }

  /**
   * Assert that a value is within a numeric range
   *
   * @param value Value to check
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   */
  static assertInRange(value: number, min: number, max: number): void {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  }

  /**
   * Assert that an error has a specific error code
   *
   * @param error Error object
   * @param code Expected error code
   */
  static assertErrorCode(error: any, code: string): void {
    expect(error).toBeDefined();
    expect(error.code || error.statusCode || error.status).toBe(code);
  }
}
