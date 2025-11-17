import { TypeGuards } from '../type-guards.util';

describe('TypeGuards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(TypeGuards.isString('hello')).toBe(true);
      expect(TypeGuards.isString('')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(TypeGuards.isString(123)).toBe(false);
      expect(TypeGuards.isString(null)).toBe(false);
      expect(TypeGuards.isString(undefined)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(TypeGuards.isNumber(123)).toBe(true);
      expect(TypeGuards.isNumber(0)).toBe(true);
      expect(TypeGuards.isNumber(-123.45)).toBe(true);
    });

    it('should return false for non-numbers and NaN', () => {
      expect(TypeGuards.isNumber('123')).toBe(false);
      expect(TypeGuards.isNumber(NaN)).toBe(false);
      expect(TypeGuards.isNumber(null)).toBe(false);
    });
  });

  describe('isBoolean', () => {
    it('should return true for booleans', () => {
      expect(TypeGuards.isBoolean(true)).toBe(true);
      expect(TypeGuards.isBoolean(false)).toBe(true);
    });

    it('should return false for non-booleans', () => {
      expect(TypeGuards.isBoolean(1)).toBe(false);
      expect(TypeGuards.isBoolean('true')).toBe(false);
    });
  });

  describe('isNull', () => {
    it('should return true for null', () => {
      expect(TypeGuards.isNull(null)).toBe(true);
    });

    it('should return false for non-null', () => {
      expect(TypeGuards.isNull(undefined)).toBe(false);
      expect(TypeGuards.isNull(0)).toBe(false);
    });
  });

  describe('isUndefined', () => {
    it('should return true for undefined', () => {
      expect(TypeGuards.isUndefined(undefined)).toBe(true);
    });

    it('should return false for non-undefined', () => {
      expect(TypeGuards.isUndefined(null)).toBe(false);
      expect(TypeGuards.isUndefined(0)).toBe(false);
    });
  });

  describe('isNullOrUndefined', () => {
    it('should return true for null or undefined', () => {
      expect(TypeGuards.isNullOrUndefined(null)).toBe(true);
      expect(TypeGuards.isNullOrUndefined(undefined)).toBe(true);
    });

    it('should return false for other values', () => {
      expect(TypeGuards.isNullOrUndefined(0)).toBe(false);
      expect(TypeGuards.isNullOrUndefined('')).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(TypeGuards.isObject({})).toBe(true);
      expect(TypeGuards.isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(TypeGuards.isObject(null)).toBe(false);
      expect(TypeGuards.isObject([])).toBe(false);
      expect(TypeGuards.isObject('object')).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(TypeGuards.isArray([])).toBe(true);
      expect(TypeGuards.isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(TypeGuards.isArray({})).toBe(false);
      expect(TypeGuards.isArray('array')).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should return true for functions', () => {
      expect(TypeGuards.isFunction(() => {})).toBe(true);
      expect(TypeGuards.isFunction(function() {})).toBe(true);
    });

    it('should return false for non-functions', () => {
      expect(TypeGuards.isFunction({})).toBe(false);
      expect(TypeGuards.isFunction('function')).toBe(false);
    });
  });

  describe('isDate', () => {
    it('should return true for valid dates', () => {
      expect(TypeGuards.isDate(new Date())).toBe(true);
    });

    it('should return false for invalid dates and non-dates', () => {
      expect(TypeGuards.isDate(new Date('invalid'))).toBe(false);
      expect(TypeGuards.isDate('2023-01-01')).toBe(false);
    });
  });

  describe('isEmail', () => {
    it('should return true for valid emails', () => {
      expect(TypeGuards.isEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(TypeGuards.isEmail('invalid')).toBe(false);
      expect(TypeGuards.isEmail(123)).toBe(false);
    });
  });

  describe('isUrl', () => {
    it('should return true for valid URLs', () => {
      expect(TypeGuards.isUrl('https://example.com')).toBe(true);
      expect(TypeGuards.isUrl('http://example.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(TypeGuards.isUrl('not-a-url')).toBe(false);
      expect(TypeGuards.isUrl(123)).toBe(false);
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(TypeGuards.isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(TypeGuards.isUUID('not-a-uuid')).toBe(false);
      expect(TypeGuards.isUUID(123)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(TypeGuards.isNonEmptyString('hello')).toBe(true);
    });

    it('should return false for empty strings and whitespace', () => {
      expect(TypeGuards.isNonEmptyString('')).toBe(false);
      expect(TypeGuards.isNonEmptyString('   ')).toBe(false);
      expect(TypeGuards.isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isNonEmptyArray', () => {
    it('should return true for non-empty arrays', () => {
      expect(TypeGuards.isNonEmptyArray([1, 2, 3])).toBe(true);
    });

    it('should return false for empty arrays and non-arrays', () => {
      expect(TypeGuards.isNonEmptyArray([])).toBe(false);
      expect(TypeGuards.isNonEmptyArray({})).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(TypeGuards.isPositiveNumber(123)).toBe(true);
      expect(TypeGuards.isPositiveNumber(0.1)).toBe(true);
    });

    it('should return false for non-positive numbers', () => {
      expect(TypeGuards.isPositiveNumber(0)).toBe(false);
      expect(TypeGuards.isPositiveNumber(-123)).toBe(false);
    });
  });

  describe('isInteger', () => {
    it('should return true for integers', () => {
      expect(TypeGuards.isInteger(123)).toBe(true);
      expect(TypeGuards.isInteger(0)).toBe(true);
      expect(TypeGuards.isInteger(-123)).toBe(true);
    });

    it('should return false for non-integers', () => {
      expect(TypeGuards.isInteger(123.45)).toBe(false);
      expect(TypeGuards.isInteger('123')).toBe(false);
    });
  });

  describe('isJSON', () => {
    it('should return true for valid JSON strings', () => {
      expect(TypeGuards.isJSON('{"key": "value"}')).toBe(true);
      expect(TypeGuards.isJSON('[]')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(TypeGuards.isJSON('not json')).toBe(false);
      expect(TypeGuards.isJSON(123)).toBe(false);
    });
  });

  describe('hasProperty', () => {
    it('should return true if object has property', () => {
      const obj = { name: 'John', age: 30 };
      expect(TypeGuards.hasProperty(obj, 'name')).toBe(true);
    });

    it('should return false if object does not have property', () => {
      const obj = { name: 'John' };
      expect(TypeGuards.hasProperty(obj, 'age')).toBe(false);
      expect(TypeGuards.hasProperty(null, 'name')).toBe(false);
    });
  });

  describe('hasProperties', () => {
    it('should return true if object has all properties', () => {
      const obj = { name: 'John', age: 30, email: 'john@example.com' };
      expect(TypeGuards.hasProperties(obj, ['name', 'age'])).toBe(true);
    });

    it('should return false if object is missing properties', () => {
      const obj = { name: 'John' };
      expect(TypeGuards.hasProperties(obj, ['name', 'age'])).toBe(false);
    });
  });
});
