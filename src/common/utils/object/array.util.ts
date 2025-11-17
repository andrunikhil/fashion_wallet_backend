/**
 * Array utility class for array manipulation
 * Provides comprehensive array operations including chunking, grouping, and sorting
 */
export class ArrayUtil {
  /**
   * Chunks an array into smaller arrays
   * @param array Array to chunk
   * @param size Chunk size
   * @returns Array of chunks
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }

  /**
   * Gets unique values from an array
   * @param array Array to process
   * @returns Array with unique values
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Gets unique values by a key function
   * @param array Array to process
   * @param keyFn Function to extract key
   * @returns Array with unique values
   */
  static uniqueBy<T>(array: T[], keyFn: (item: T) => any): T[] {
    const seen = new Set();
    return array.filter((item) => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Groups array elements by a key
   * @param array Array to group
   * @param keyFn Function to extract key
   * @returns Grouped object
   */
  static groupBy<T>(array: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = String(keyFn(item));
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Counts occurrences of each value
   * @param array Array to count
   * @returns Object with counts
   */
  static countBy<T>(array: T[]): Record<string, number> {
    return array.reduce((counts, item) => {
      const key = String(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Sorts array by a property
   * @param array Array to sort
   * @param keyFn Function to extract sort key
   * @param order Sort order (default: 'asc')
   * @returns Sorted array
   */
  static sortBy<T>(
    array: T[],
    keyFn: (item: T) => any,
    order: 'asc' | 'desc' = 'asc',
  ): T[] {
    return [...array].sort((a, b) => {
      const aVal = keyFn(a);
      const bVal = keyFn(b);

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Flattens a nested array
   * @param array Array to flatten
   * @param depth Depth to flatten (default: 1)
   * @returns Flattened array
   */
  static flatten<T>(array: any[], depth: number = 1): T[] {
    if (depth === 0) return array;

    return array.reduce((flat, item) => {
      if (Array.isArray(item)) {
        return flat.concat(this.flatten(item, depth - 1));
      }
      return flat.concat(item);
    }, []);
  }

  /**
   * Flattens an array deeply
   * @param array Array to flatten
   * @returns Deeply flattened array
   */
  static flattenDeep<T>(array: any[]): T[] {
    return array.reduce((flat, item) => {
      if (Array.isArray(item)) {
        return flat.concat(this.flattenDeep(item));
      }
      return flat.concat(item);
    }, []);
  }

  /**
   * Compacts an array (removes falsy values)
   * @param array Array to compact
   * @returns Compacted array
   */
  static compact<T>(array: (T | null | undefined | false | 0 | '')[]): T[] {
    return array.filter(Boolean) as T[];
  }

  /**
   * Gets the intersection of multiple arrays
   * @param arrays Arrays to intersect
   * @returns Intersection array
   */
  static intersection<T>(...arrays: T[][]): T[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];

    return arrays.reduce((result, array) => {
      return result.filter((item) => array.includes(item));
    });
  }

  /**
   * Gets the union of multiple arrays
   * @param arrays Arrays to union
   * @returns Union array
   */
  static union<T>(...arrays: T[][]): T[] {
    return this.unique(arrays.flat());
  }

  /**
   * Gets the difference between two arrays (items in first but not in second)
   * @param array1 First array
   * @param array2 Second array
   * @returns Difference array
   */
  static difference<T>(array1: T[], array2: T[]): T[] {
    return array1.filter((item) => !array2.includes(item));
  }

  /**
   * Shuffles an array randomly
   * @param array Array to shuffle
   * @returns Shuffled array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Gets a random sample from an array
   * @param array Array to sample from
   * @param size Sample size (default: 1)
   * @returns Random sample
   */
  static sample<T>(array: T[], size: number = 1): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, size);
  }

  /**
   * Partitions an array based on a condition
   * @param array Array to partition
   * @param predicate Partition condition
   * @returns Tuple of [truthy, falsy] arrays
   */
  static partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const truthy: T[] = [];
    const falsy: T[] = [];

    for (const item of array) {
      if (predicate(item)) {
        truthy.push(item);
      } else {
        falsy.push(item);
      }
    }

    return [truthy, falsy];
  }

  /**
   * Finds the index of an item by a predicate
   * @param array Array to search
   * @param predicate Search predicate
   * @returns Index or -1
   */
  static findIndex<T>(array: T[], predicate: (item: T) => boolean): number {
    return array.findIndex(predicate);
  }

  /**
   * Finds the last index of an item by a predicate
   * @param array Array to search
   * @param predicate Search predicate
   * @returns Index or -1
   */
  static findLastIndex<T>(array: T[], predicate: (item: T) => boolean): number {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Takes first n elements from array
   * @param array Array to take from
   * @param n Number of elements (default: 1)
   * @returns First n elements
   */
  static take<T>(array: T[], n: number = 1): T[] {
    return array.slice(0, n);
  }

  /**
   * Takes last n elements from array
   * @param array Array to take from
   * @param n Number of elements (default: 1)
   * @returns Last n elements
   */
  static takeLast<T>(array: T[], n: number = 1): T[] {
    return array.slice(-n);
  }

  /**
   * Drops first n elements from array
   * @param array Array to drop from
   * @param n Number of elements (default: 1)
   * @returns Array without first n elements
   */
  static drop<T>(array: T[], n: number = 1): T[] {
    return array.slice(n);
  }

  /**
   * Drops last n elements from array
   * @param array Array to drop from
   * @param n Number of elements (default: 1)
   * @returns Array without last n elements
   */
  static dropLast<T>(array: T[], n: number = 1): T[] {
    return array.slice(0, -n);
  }

  /**
   * Zips multiple arrays together
   * @param arrays Arrays to zip
   * @returns Zipped array
   */
  static zip<T>(...arrays: T[][]): T[][] {
    const maxLength = Math.max(...arrays.map((arr) => arr.length));
    const result: T[][] = [];

    for (let i = 0; i < maxLength; i++) {
      result.push(arrays.map((arr) => arr[i]));
    }

    return result;
  }

  /**
   * Unzips an array of arrays
   * @param array Array to unzip
   * @returns Unzipped arrays
   */
  static unzip<T>(array: T[][]): T[][] {
    return this.zip(...array);
  }

  /**
   * Gets the sum of array values
   * @param array Array of numbers
   * @returns Sum
   */
  static sum(array: number[]): number {
    return array.reduce((sum, num) => sum + num, 0);
  }

  /**
   * Gets the average of array values
   * @param array Array of numbers
   * @returns Average
   */
  static average(array: number[]): number {
    if (array.length === 0) return 0;
    return this.sum(array) / array.length;
  }

  /**
   * Gets the minimum value in array
   * @param array Array of numbers
   * @returns Minimum value
   */
  static min(array: number[]): number {
    return Math.min(...array);
  }

  /**
   * Gets the maximum value in array
   * @param array Array of numbers
   * @returns Maximum value
   */
  static max(array: number[]): number {
    return Math.max(...array);
  }

  /**
   * Gets the median value in array
   * @param array Array of numbers
   * @returns Median value
   */
  static median(array: number[]): number {
    const sorted = [...array].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  /**
   * Checks if array is empty
   * @param array Array to check
   * @returns true if empty
   */
  static isEmpty<T>(array: T[]): boolean {
    return array.length === 0;
  }

  /**
   * Checks if arrays are equal
   * @param array1 First array
   * @param array2 Second array
   * @returns true if equal
   */
  static isEqual<T>(array1: T[], array2: T[]): boolean {
    if (array1.length !== array2.length) return false;
    return array1.every((item, index) => item === array2[index]);
  }

  /**
   * Rotates array elements
   * @param array Array to rotate
   * @param positions Number of positions to rotate (positive = right, negative = left)
   * @returns Rotated array
   */
  static rotate<T>(array: T[], positions: number): T[] {
    const len = array.length;
    if (len === 0) return array;

    const offset = ((positions % len) + len) % len;
    return [...array.slice(offset), ...array.slice(0, offset)];
  }

  /**
   * Fills an array with a value
   * @param length Array length
   * @param value Fill value or function
   * @returns Filled array
   */
  static fill<T>(length: number, value: T | ((index: number) => T)): T[] {
    const result: T[] = [];

    for (let i = 0; i < length; i++) {
      result.push(typeof value === 'function' ? (value as Function)(i) : value);
    }

    return result;
  }

  /**
   * Creates a range of numbers
   * @param start Start value
   * @param end End value (exclusive)
   * @param step Step value (default: 1)
   * @returns Range array
   */
  static range(start: number, end: number, step: number = 1): number[] {
    const result: number[] = [];

    for (let i = start; i < end; i += step) {
      result.push(i);
    }

    return result;
  }
}
