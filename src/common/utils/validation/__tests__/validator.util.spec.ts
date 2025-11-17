import { ValidationUtil } from '../validator.util';
import * as Joi from 'joi';

describe('ValidationUtil', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(ValidationUtil.isValidEmail('test@example.com')).toBe(true);
      expect(ValidationUtil.isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(ValidationUtil.isValidEmail('invalid')).toBe(false);
      expect(ValidationUtil.isValidEmail('invalid@')).toBe(false);
      expect(ValidationUtil.isValidEmail('@example.com')).toBe(false);
      expect(ValidationUtil.isValidEmail('')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for strong passwords', () => {
      expect(ValidationUtil.isStrongPassword('Password123!')).toBe(true);
      expect(ValidationUtil.isStrongPassword('Str0ng@Pass')).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(ValidationUtil.isStrongPassword('password')).toBe(false); // No uppercase, number, special char
      expect(ValidationUtil.isStrongPassword('Pass123')).toBe(false); // No special char
      expect(ValidationUtil.isStrongPassword('Pass!')).toBe(false); // No number, too short
      expect(ValidationUtil.isStrongPassword('PASSWORD123!')).toBe(false); // No lowercase
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone numbers', () => {
      expect(ValidationUtil.isValidPhoneNumber('+12345678901')).toBe(true);
      expect(ValidationUtil.isValidPhoneNumber('+447911123456')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(ValidationUtil.isValidPhoneNumber('123')).toBe(false);
      expect(ValidationUtil.isValidPhoneNumber('abc')).toBe(false);
      expect(ValidationUtil.isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(ValidationUtil.isValidUrl('https://example.com')).toBe(true);
      expect(ValidationUtil.isValidUrl('http://example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(ValidationUtil.isValidUrl('not-a-url')).toBe(false);
      expect(ValidationUtil.isValidUrl('ftp://example.com')).toBe(false);
      expect(ValidationUtil.isValidUrl('')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(ValidationUtil.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(ValidationUtil.isValidUUID('not-a-uuid')).toBe(false);
      expect(ValidationUtil.isValidUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false); // Wrong version
      expect(ValidationUtil.isValidUUID('')).toBe(false);
    });
  });

  describe('isValidJSON', () => {
    it('should return true for valid JSON strings', () => {
      expect(ValidationUtil.isValidJSON('{"key": "value"}')).toBe(true);
      expect(ValidationUtil.isValidJSON('[]')).toBe(true);
      expect(ValidationUtil.isValidJSON('null')).toBe(true);
    });

    it('should return false for invalid JSON strings', () => {
      expect(ValidationUtil.isValidJSON('not json')).toBe(false);
      expect(ValidationUtil.isValidJSON('{key: value}')).toBe(false);
      expect(ValidationUtil.isValidJSON('')).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('should return true for valid credit card numbers', () => {
      expect(ValidationUtil.isValidCreditCard('4532015112830366')).toBe(true); // Visa
      expect(ValidationUtil.isValidCreditCard('4532-0151-1283-0366')).toBe(true); // Visa with dashes
    });

    it('should return false for invalid credit card numbers', () => {
      expect(ValidationUtil.isValidCreditCard('1234567890123456')).toBe(false);
      expect(ValidationUtil.isValidCreditCard('abc')).toBe(false);
      expect(ValidationUtil.isValidCreditCard('')).toBe(false);
    });
  });

  describe('isValidObjectId', () => {
    it('should return true for valid MongoDB ObjectIds', () => {
      expect(ValidationUtil.isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(ValidationUtil.isValidObjectId('5f8d0d55b54764421b7156c9')).toBe(true);
    });

    it('should return false for invalid ObjectIds', () => {
      expect(ValidationUtil.isValidObjectId('not-an-objectid')).toBe(false);
      expect(ValidationUtil.isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      expect(ValidationUtil.isValidObjectId('')).toBe(false);
    });
  });

  describe('validateWithJoi', () => {
    it('should validate data with Joi schema', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().min(0).required(),
      });

      const validData = { name: 'John', age: 30 };
      const result = ValidationUtil.validateWithJoi(schema, validData);

      expect(result.isValid).toBe(true);
      expect(result.value).toEqual(validData);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().min(0).required(),
      });

      const invalidData = { name: 'John' }; // Missing age
      const result = ValidationUtil.validateWithJoi(schema, invalidData);

      expect(result.isValid).toBe(false);
      expect(result.value).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
