import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidationUtil } from './validator.util';

/**
 * Custom validator for strong password
 */
@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    return ValidationUtil.isStrongPassword(password);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character`;
  }
}

/**
 * Decorator for strong password validation
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

/**
 * Custom validator for phone number
 */
@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phone: string): boolean {
    return ValidationUtil.isValidPhoneNumber(phone);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid phone number in E.164 format`;
  }
}

/**
 * Decorator for phone number validation
 */
export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

/**
 * Custom validator for MongoDB ObjectId
 */
@ValidatorConstraint({ name: 'isObjectId', async: false })
export class IsObjectIdConstraint implements ValidatorConstraintInterface {
  validate(id: string): boolean {
    return ValidationUtil.isValidObjectId(id);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid MongoDB ObjectId`;
  }
}

/**
 * Decorator for MongoDB ObjectId validation
 */
export function IsObjectId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsObjectIdConstraint,
    });
  };
}

/**
 * Custom validator for credit card
 */
@ValidatorConstraint({ name: 'isCreditCard', async: false })
export class IsCreditCardConstraint implements ValidatorConstraintInterface {
  validate(cardNumber: string): boolean {
    return ValidationUtil.isValidCreditCard(cardNumber);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid credit card number`;
  }
}

/**
 * Decorator for credit card validation
 */
export function IsCreditCard(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCreditCardConstraint,
    });
  };
}

/**
 * Custom validator for password confirmation
 */
@ValidatorConstraint({ name: 'isPasswordMatch', async: false })
export class IsPasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments): boolean {
    const object = args.object as any;
    const password = object[args.constraints[0]];
    return confirmPassword === password;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Passwords do not match';
  }
}

/**
 * Decorator for password confirmation validation
 * @param property The property name of the password field to match
 */
export function IsPasswordMatch(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: IsPasswordMatchConstraint,
    });
  };
}

/**
 * Custom validator for future date
 */
@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: Date | string): boolean {
    const inputDate = new Date(date);
    const now = new Date();
    return inputDate > now;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a future date`;
  }
}

/**
 * Decorator for future date validation
 */
export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

/**
 * Custom validator for past date
 */
@ValidatorConstraint({ name: 'isPastDate', async: false })
export class IsPastDateConstraint implements ValidatorConstraintInterface {
  validate(date: Date | string): boolean {
    const inputDate = new Date(date);
    const now = new Date();
    return inputDate < now;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a past date`;
  }
}

/**
 * Decorator for past date validation
 */
export function IsPastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastDateConstraint,
    });
  };
}
