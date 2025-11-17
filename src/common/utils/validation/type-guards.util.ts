/**
 * Type guard utilities for runtime type checking
 * Provides comprehensive type checking with TypeScript type narrowing
 */
export class TypeGuards {
  /**
   * Checks if value is a string
   * @param value Value to check
   * @returns true if value is a string
   */
  static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  /**
   * Checks if value is a number
   * @param value Value to check
   * @returns true if value is a number
   */
  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Checks if value is a boolean
   * @param value Value to check
   * @returns true if value is a boolean
   */
  static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  /**
   * Checks if value is null
   * @param value Value to check
   * @returns true if value is null
   */
  static isNull(value: unknown): value is null {
    return value === null;
  }

  /**
   * Checks if value is undefined
   * @param value Value to check
   * @returns true if value is undefined
   */
  static isUndefined(value: unknown): value is undefined {
    return value === undefined;
  }

  /**
   * Checks if value is null or undefined
   * @param value Value to check
   * @returns true if value is null or undefined
   */
  static isNullOrUndefined(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  /**
   * Checks if value is defined (not null or undefined)
   * @param value Value to check
   * @returns true if value is defined
   */
  static isDefined<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  /**
   * Checks if value is an object
   * @param value Value to check
   * @returns true if value is an object
   */
  static isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  /**
   * Checks if value is a plain object (not class instance)
   * @param value Value to check
   * @returns true if value is a plain object
   */
  static isPlainObject(value: unknown): value is Record<string, any> {
    if (!this.isObject(value)) {
      return false;
    }

    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
  }

  /**
   * Checks if value is an array
   * @param value Value to check
   * @returns true if value is an array
   */
  static isArray(value: unknown): value is any[] {
    return Array.isArray(value);
  }

  /**
   * Checks if value is a function
   * @param value Value to check
   * @returns true if value is a function
   */
  static isFunction(value: unknown): value is Function {
    return typeof value === 'function';
  }

  /**
   * Checks if value is a Date object
   * @param value Value to check
   * @returns true if value is a Date
   */
  static isDate(value: unknown): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
  }

  /**
   * Checks if value is a RegExp object
   * @param value Value to check
   * @returns true if value is a RegExp
   */
  static isRegExp(value: unknown): value is RegExp {
    return value instanceof RegExp;
  }

  /**
   * Checks if value is a Promise
   * @param value Value to check
   * @returns true if value is a Promise
   */
  static isPromise(value: unknown): value is Promise<any> {
    return value instanceof Promise || (this.isObject(value) && this.isFunction((value as any).then));
  }

  /**
   * Checks if value is a valid email string
   * @param value Value to check
   * @returns true if value is a valid email
   */
  static isEmail(value: unknown): value is string {
    if (!this.isString(value)) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  /**
   * Checks if value is a valid URL string
   * @param value Value to check
   * @returns true if value is a valid URL
   */
  static isUrl(value: unknown): value is string {
    if (!this.isString(value)) {
      return false;
    }

    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Checks if value is a valid UUID string
   * @param value Value to check
   * @returns true if value is a valid UUID
   */
  static isUUID(value: unknown): value is string {
    if (!this.isString(value)) {
      return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Checks if value is a non-empty string
   * @param value Value to check
   * @returns true if value is a non-empty string
   */
  static isNonEmptyString(value: unknown): value is string {
    return this.isString(value) && value.trim().length > 0;
  }

  /**
   * Checks if value is a non-empty array
   * @param value Value to check
   * @returns true if value is a non-empty array
   */
  static isNonEmptyArray(value: unknown): value is any[] {
    return this.isArray(value) && value.length > 0;
  }

  /**
   * Checks if value is an empty object
   * @param value Value to check
   * @returns true if value is an empty object
   */
  static isEmptyObject(value: unknown): boolean {
    return this.isObject(value) && Object.keys(value).length === 0;
  }

  /**
   * Checks if value is a positive number
   * @param value Value to check
   * @returns true if value is a positive number
   */
  static isPositiveNumber(value: unknown): value is number {
    return this.isNumber(value) && value > 0;
  }

  /**
   * Checks if value is a negative number
   * @param value Value to check
   * @returns true if value is a negative number
   */
  static isNegativeNumber(value: unknown): value is number {
    return this.isNumber(value) && value < 0;
  }

  /**
   * Checks if value is an integer
   * @param value Value to check
   * @returns true if value is an integer
   */
  static isInteger(value: unknown): value is number {
    return this.isNumber(value) && Number.isInteger(value);
  }

  /**
   * Checks if value is a valid JSON string
   * @param value Value to check
   * @returns true if value is a valid JSON string
   */
  static isJSON(value: unknown): value is string {
    if (!this.isString(value)) {
      return false;
    }

    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if value is a Buffer
   * @param value Value to check
   * @returns true if value is a Buffer
   */
  static isBuffer(value: unknown): value is Buffer {
    return Buffer.isBuffer(value);
  }

  /**
   * Checks if value is a MongoDB ObjectId string
   * @param value Value to check
   * @returns true if value is a valid ObjectId
   */
  static isObjectId(value: unknown): value is string {
    if (!this.isString(value)) {
      return false;
    }

    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(value);
  }

  /**
   * Checks if value is a class instance (not plain object)
   * @param value Value to check
   * @returns true if value is a class instance
   */
  static isClassInstance(value: unknown): boolean {
    if (!this.isObject(value)) {
      return false;
    }

    const proto = Object.getPrototypeOf(value);
    return proto !== null && proto !== Object.prototype;
  }

  /**
   * Checks if value is an Error object
   * @param value Value to check
   * @returns true if value is an Error
   */
  static isError(value: unknown): value is Error {
    return value instanceof Error;
  }

  /**
   * Checks if value is a Map
   * @param value Value to check
   * @returns true if value is a Map
   */
  static isMap(value: unknown): value is Map<any, any> {
    return value instanceof Map;
  }

  /**
   * Checks if value is a Set
   * @param value Value to check
   * @returns true if value is a Set
   */
  static isSet(value: unknown): value is Set<any> {
    return value instanceof Set;
  }

  /**
   * Checks if value is a Symbol
   * @param value Value to check
   * @returns true if value is a Symbol
   */
  static isSymbol(value: unknown): value is symbol {
    return typeof value === 'symbol';
  }

  /**
   * Checks if value is a BigInt
   * @param value Value to check
   * @returns true if value is a BigInt
   */
  static isBigInt(value: unknown): value is bigint {
    return typeof value === 'bigint';
  }

  /**
   * Checks if value is iterable
   * @param value Value to check
   * @returns true if value is iterable
   */
  static isIterable(value: unknown): value is Iterable<any> {
    if (this.isNullOrUndefined(value)) {
      return false;
    }

    return this.isFunction((value as any)[Symbol.iterator]);
  }

  /**
   * Checks if value is async iterable
   * @param value Value to check
   * @returns true if value is async iterable
   */
  static isAsyncIterable(value: unknown): value is AsyncIterable<any> {
    if (this.isNullOrUndefined(value)) {
      return false;
    }

    return this.isFunction((value as any)[Symbol.asyncIterator]);
  }

  /**
   * Type guard for array of specific type
   * @param value Value to check
   * @param guard Type guard function for array elements
   * @returns true if value is array of specific type
   */
  static isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
    return this.isArray(value) && value.every(guard);
  }

  /**
   * Checks if value has a specific property
   * @param value Value to check
   * @param property Property name
   * @returns true if value has the property
   */
  static hasProperty<K extends string>(
    value: unknown,
    property: K,
  ): value is Record<K, unknown> {
    return this.isObject(value) && property in value;
  }

  /**
   * Checks if value has all specified properties
   * @param value Value to check
   * @param properties Array of property names
   * @returns true if value has all properties
   */
  static hasProperties<K extends string>(
    value: unknown,
    properties: K[],
  ): value is Record<K, unknown> {
    return this.isObject(value) && properties.every((prop) => prop in value);
  }
}
