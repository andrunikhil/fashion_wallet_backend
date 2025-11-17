/**
 * Custom Jest matchers for Fashion Wallet testing
 *
 * @example
 * ```typescript
 * // In test/setup.ts
 * import { customMatchers } from './utils/matchers';
 * expect.extend(customMatchers);
 *
 * // In tests
 * expect(userId).toBeUUID();
 * expect(createdAt).toBeRecentDate();
 * expect(users).toContainObjectMatching({ role: 'admin' });
 * ```
 */

export const customMatchers = {
  /**
   * Check if a value is a valid UUID v4
   */
  toBeUUID(received: any) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`
    };
  },

  /**
   * Check if a date is recent (within last N seconds)
   */
  toBeRecentDate(received: any, seconds: number = 60) {
    const pass =
      received instanceof Date &&
      Date.now() - received.getTime() < seconds * 1000 &&
      Date.now() - received.getTime() >= 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within last ${seconds} seconds`
          : `expected ${received} to be within last ${seconds} seconds`
    };
  },

  /**
   * Check if array contains an object matching partial criteria
   */
  toContainObjectMatching(received: any[], expected: Record<string, any>) {
    const pass =
      Array.isArray(received) &&
      received.some(item =>
        Object.entries(expected).every(([key, value]) => item[key] === value)
      );

    return {
      pass,
      message: () =>
        pass
          ? `expected array not to contain object matching ${JSON.stringify(
              expected
            )}`
          : `expected array to contain object matching ${JSON.stringify(
              expected
            )}`
    };
  },

  /**
   * Check if error has specific error code
   */
  toBeErrorWithCode(received: any, code: string) {
    const pass =
      received instanceof Error && (received as any).code === code;

    return {
      pass,
      message: () =>
        pass
          ? `expected error not to have code ${code}`
          : `expected error to have code ${code}, got ${
              (received as any)?.code
            }`
    };
  },

  /**
   * Check if object matches schema definition
   */
  toMatchSchema(received: any, schema: Record<string, string>) {
    if (typeof received !== 'object' || received === null) {
      return {
        pass: false,
        message: () => 'expected value to be an object'
      };
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const mismatches: string[] = [];

    for (const [key, type] of Object.entries(schema)) {
      const value = received[key];

      if (value === undefined) {
        mismatches.push(`missing field "${key}"`);
        continue;
      }

      let valid = false;

      switch (type) {
        case 'uuid':
          valid = typeof value === 'string' && uuidRegex.test(value);
          break;
        case 'date':
          valid = value instanceof Date || !isNaN(Date.parse(value));
          break;
        case 'string':
          valid = typeof value === 'string';
          break;
        case 'number':
          valid = typeof value === 'number';
          break;
        case 'boolean':
          valid = typeof value === 'boolean';
          break;
        case 'array':
          valid = Array.isArray(value);
          break;
        case 'object':
          valid = typeof value === 'object' && value !== null;
          break;
        default:
          valid = typeof value === type;
      }

      if (!valid) {
        mismatches.push(`field "${key}" should be ${type}, got ${typeof value}`);
      }
    }

    const pass = mismatches.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `expected object not to match schema`
          : `expected object to match schema:\n  ${mismatches.join('\n  ')}`
    };
  },

  /**
   * Check if string is a valid email
   */
  toBeValidEmail(received: any) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`
    };
  },

  /**
   * Check if string is a valid URL
   */
  toBeValidUrl(received: any) {
    try {
      new URL(received);
      return {
        pass: true,
        message: () => `expected ${received} not to be a valid URL`
      };
    } catch {
      return {
        pass: false,
        message: () => `expected ${received} to be a valid URL`
      };
    }
  },

  /**
   * Check if number is within range (inclusive)
   */
  toBeWithinRange(received: any, min: number, max: number) {
    const pass =
      typeof received === 'number' && received >= min && received <= max;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min}-${max}`
          : `expected ${received} to be within range ${min}-${max}`
    };
  },

  /**
   * Check if array has specific length
   */
  toHaveLength(received: any, expectedLength: number) {
    const actualLength = Array.isArray(received) ? received.length : 0;
    const pass = actualLength === expectedLength;

    return {
      pass,
      message: () =>
        pass
          ? `expected array not to have length ${expectedLength}`
          : `expected array to have length ${expectedLength}, got ${actualLength}`
    };
  },

  /**
   * Check if two dates are approximately equal (within tolerance)
   */
  toBeCloseTo(received: Date | string, expected: Date | string, toleranceMs: number = 1000) {
    const receivedDate = received instanceof Date ? received : new Date(received);
    const expectedDate = expected instanceof Date ? expected : new Date(expected);

    if (isNaN(receivedDate.getTime()) || isNaN(expectedDate.getTime())) {
      return {
        pass: false,
        message: () => 'expected both values to be valid dates'
      };
    }

    const diff = Math.abs(receivedDate.getTime() - expectedDate.getTime());
    const pass = diff <= toleranceMs;

    return {
      pass,
      message: () =>
        pass
          ? `expected dates not to be within ${toleranceMs}ms of each other`
          : `expected dates to be within ${toleranceMs}ms, but difference was ${diff}ms`
    };
  },

  /**
   * Check if value is one of the allowed values
   */
  toBeOneOf(received: any, allowedValues: any[]) {
    const pass = allowedValues.includes(received);

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${JSON.stringify(
              allowedValues
            )}`
          : `expected ${received} to be one of ${JSON.stringify(
              allowedValues
            )}`
    };
  }
};

// Type declarations for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeUUID(): R;
      toBeRecentDate(seconds?: number): R;
      toContainObjectMatching(expected: Record<string, any>): R;
      toBeErrorWithCode(code: string): R;
      toMatchSchema(schema: Record<string, string>): R;
      toBeValidEmail(): R;
      toBeValidUrl(): R;
      toBeWithinRange(min: number, max: number): R;
      toBeCloseTo(expected: Date | string, toleranceMs?: number): R;
      toBeOneOf(allowedValues: any[]): R;
    }
  }
}
