import { validate, ValidationError as ClassValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as Joi from 'joi';

/**
 * Validation utility class providing methods for DTO validation
 * using class-validator and Joi schemas
 */
export class ValidationUtil {
  /**
   * Validates a DTO object using class-validator decorators
   * @param dto The DTO object to validate
   * @param skipMissingProperties Whether to skip validation of missing properties
   * @returns Promise with validation errors or null if valid
   */
  static async validate<T extends object>(
    dtoClass: new () => T,
    data: unknown,
    skipMissingProperties = false,
  ): Promise<{ isValid: boolean; errors: string[]; formattedErrors: Record<string, string[]> }> {
    // Transform plain object to class instance
    const dtoInstance = plainToInstance(dtoClass, data);

    // Validate the instance
    const errors: ClassValidationError[] = await validate(dtoInstance, {
      skipMissingProperties,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length === 0) {
      return {
        isValid: true,
        errors: [],
        formattedErrors: {},
      };
    }

    // Format errors
    const formattedErrors: Record<string, string[]> = {};
    const errorMessages: string[] = [];

    errors.forEach((error) => {
      if (error.constraints) {
        const messages = Object.values(error.constraints);
        formattedErrors[error.property] = messages;
        errorMessages.push(...messages);
      }
    });

    return {
      isValid: false,
      errors: errorMessages,
      formattedErrors,
    };
  }

  /**
   * Validates data using a Joi schema
   * @param schema Joi schema to validate against
   * @param data Data to validate
   * @returns Validation result with errors if any
   */
  static validateWithJoi<T>(
    schema: Joi.Schema,
    data: unknown,
  ): { isValid: boolean; value: T | null; errors: string[]; details: Joi.ValidationErrorItem[] } {
    const result = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!result.error) {
      return {
        isValid: true,
        value: result.value as T,
        errors: [],
        details: [],
      };
    }

    const errors = result.error.details.map((detail) => detail.message);

    return {
      isValid: false,
      value: null,
      errors,
      details: result.error.details,
    };
  }

  /**
   * Validates email format
   * @param email Email to validate
   * @returns true if valid email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates password strength
   * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
   * @param password Password to validate
   * @returns true if password is strong
   */
  static isStrongPassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  /**
   * Validates phone number format (basic E.164 format)
   * @param phone Phone number to validate
   * @returns true if valid phone format
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validates URL format
   * @param url URL to validate
   * @returns true if valid URL
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validates UUID format (v4)
   * @param uuid UUID to validate
   * @returns true if valid UUID v4
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates if string is a valid JSON
   * @param str String to validate
   * @returns true if valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates credit card number using Luhn algorithm
   * @param cardNumber Credit card number to validate
   * @returns true if valid card number
   */
  static isValidCreditCard(cardNumber: string): boolean {
    // Remove spaces and dashes
    const sanitized = cardNumber.replace(/[\s-]/g, '');

    // Check if all characters are digits and length is valid
    if (!/^\d{13,19}$/.test(sanitized)) {
      return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validates MongoDB ObjectId format
   * @param id ObjectId to validate
   * @returns true if valid ObjectId
   */
  static isValidObjectId(id: string): boolean {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id);
  }
}
