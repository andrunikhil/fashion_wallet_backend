/**
 * Object utility class for object manipulation
 * Provides comprehensive object operations including deep cloning, merging, and property access
 */
export class ObjectUtil {
  /**
   * Deep clones an object (handles circular references)
   * @param obj Object to clone
   * @returns Cloned object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Handle dates
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item)) as any;
    }

    // Handle objects
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Deep merges multiple objects
   * @param target Target object
   * @param sources Source objects to merge
   * @returns Merged object
   */
  static deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;

    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key] as any, source[key] as any);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Picks specified properties from an object
   * @param obj Source object
   * @param keys Keys to pick
   * @returns Object with picked properties
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;

    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Omits specified properties from an object
   * @param obj Source object
   * @param keys Keys to omit
   * @returns Object without omitted properties
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj } as any;

    for (const key of keys) {
      delete result[key];
    }

    return result;
  }

  /**
   * Gets a nested property value using dot notation
   * @param obj Object to get from
   * @param path Property path (e.g., 'user.address.city')
   * @param defaultValue Default value if not found
   * @returns Property value or default
   */
  static get<T = any>(obj: any, path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) {
        return defaultValue as T;
      }
    }

    return result as T;
  }

  /**
   * Sets a nested property value using dot notation
   * @param obj Object to set on
   * @param path Property path (e.g., 'user.address.city')
   * @param value Value to set
   * @returns Modified object
   */
  static set<T extends object>(obj: T, path: string, value: any): T {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current: any = obj;

    for (const key of keys) {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
    return obj;
  }

  /**
   * Checks if a value is a plain object
   * @param value Value to check
   * @returns true if plain object
   */
  static isObject(value: any): value is object {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Checks if an object is empty
   * @param obj Object to check
   * @returns true if empty
   */
  static isEmpty(obj: object): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Gets all property paths in an object
   * @param obj Object to get paths from
   * @param prefix Optional prefix for paths
   * @returns Array of property paths
   */
  static getPaths(obj: any, prefix: string = ''): string[] {
    const paths: string[] = [];

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const path = prefix ? `${prefix}.${key}` : key;

        if (this.isObject(obj[key])) {
          paths.push(...this.getPaths(obj[key], path));
        } else {
          paths.push(path);
        }
      }
    }

    return paths;
  }

  /**
   * Flattens a nested object
   * @param obj Object to flatten
   * @param prefix Optional prefix
   * @returns Flattened object
   */
  static flatten(obj: any, prefix: string = ''): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const path = prefix ? `${prefix}.${key}` : key;

        if (this.isObject(obj[key]) && !Array.isArray(obj[key])) {
          Object.assign(result, this.flatten(obj[key], path));
        } else {
          result[path] = obj[key];
        }
      }
    }

    return result;
  }

  /**
   * Unflattens a flattened object
   * @param obj Flattened object
   * @returns Nested object
   */
  static unflatten(obj: Record<string, any>): any {
    const result: any = {};

    for (const path in obj) {
      this.set(result, path, obj[path]);
    }

    return result;
  }

  /**
   * Maps object values
   * @param obj Source object
   * @param fn Mapping function
   * @returns Object with mapped values
   */
  static mapValues<T extends object, R>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => R,
  ): Record<keyof T, R> {
    const result: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = fn(obj[key], key);
      }
    }

    return result;
  }

  /**
   * Maps object keys
   * @param obj Source object
   * @param fn Mapping function
   * @returns Object with mapped keys
   */
  static mapKeys<T extends object>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => string,
  ): Record<string, T[keyof T]> {
    const result: Record<string, any> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = fn(obj[key], key);
        result[newKey] = obj[key];
      }
    }

    return result;
  }

  /**
   * Filters object properties
   * @param obj Source object
   * @param fn Filter function
   * @returns Filtered object
   */
  static filter<T extends object>(
    obj: T,
    fn: (value: T[keyof T], key: keyof T) => boolean,
  ): Partial<T> {
    const result: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key) && fn(obj[key], key)) {
        result[key] = obj[key];
      }
    }

    return result;
  }

  /**
   * Inverts an object (swaps keys and values)
   * @param obj Object to invert
   * @returns Inverted object
   */
  static invert(obj: Record<string, string | number>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[String(obj[key])] = key;
      }
    }

    return result;
  }

  /**
   * Compares two objects for equality (deep comparison)
   * @param obj1 First object
   * @param obj2 Second object
   * @returns true if equal
   */
  static isEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== typeof obj2) return false;

    if (obj1 === null || obj2 === null) return false;

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
      if (obj1.length !== obj2.length) return false;
      return obj1.every((item, index) => this.isEqual(item, obj2[index]));
    }

    if (typeof obj1 === 'object') {
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);

      if (keys1.length !== keys2.length) return false;

      return keys1.every((key) => this.isEqual(obj1[key], obj2[key]));
    }

    return false;
  }

  /**
   * Gets the difference between two objects
   * @param obj1 Original object
   * @param obj2 Compared object
   * @returns Object with differences
   */
  static diff(obj1: any, obj2: any): any {
    const changes: any = {};

    for (const key in obj2) {
      if (obj2.hasOwnProperty(key)) {
        if (!obj1.hasOwnProperty(key)) {
          changes[key] = obj2[key];
        } else if (this.isObject(obj1[key]) && this.isObject(obj2[key])) {
          const nestedDiff = this.diff(obj1[key], obj2[key]);
          if (Object.keys(nestedDiff).length > 0) {
            changes[key] = nestedDiff;
          }
        } else if (obj1[key] !== obj2[key]) {
          changes[key] = obj2[key];
        }
      }
    }

    return changes;
  }

  /**
   * Removes null and undefined values from an object
   * @param obj Object to clean
   * @param recursive Whether to clean nested objects
   * @returns Cleaned object
   */
  static removeNullish(obj: any, recursive: boolean = false): any {
    const result: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (value !== null && value !== undefined) {
          if (recursive && this.isObject(value)) {
            result[key] = this.removeNullish(value, recursive);
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Freezes an object deeply (makes it immutable)
   * @param obj Object to freeze
   * @returns Frozen object
   */
  static deepFreeze<T>(obj: T): Readonly<T> {
    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach((prop) => {
      const value = (obj as any)[prop];
      if (value && typeof value === 'object') {
        this.deepFreeze(value);
      }
    });

    return obj;
  }
}
