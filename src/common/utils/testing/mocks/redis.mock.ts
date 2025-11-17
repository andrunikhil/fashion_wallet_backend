/**
 * Mock Redis client for testing caching operations
 * Provides in-memory cache simulation with expiry support
 *
 * @example
 * ```typescript
 * const redisMock = new RedisMock();
 *
 * // Set value
 * await redisMock.set('key', 'value', 'EX', 60);
 *
 * // Get value
 * const value = await redisMock.get('key');
 *
 * // Delete value
 * await redisMock.del('key');
 * ```
 */
export class RedisMock {
  private cache: Map<string, { value: string; expiry?: number }> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Get value by key
   */
  get = jest.fn(async (key: string): Promise<string | null> => {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  });

  /**
   * Set value with optional expiry
   */
  set = jest.fn(async (
    key: string,
    value: string,
    ...args: any[]
  ): Promise<string> => {
    let expiry: number | undefined;

    // Parse expiry arguments (EX seconds, PX milliseconds)
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && args[i + 1]) {
        expiry = Date.now() + args[i + 1] * 1000;
      } else if (args[i] === 'PX' && args[i + 1]) {
        expiry = Date.now() + args[i + 1];
      }
    }

    this.cache.set(key, { value, expiry });

    // Set timeout to delete expired key
    if (expiry) {
      const timeout = setTimeout(() => {
        this.cache.delete(key);
        this.intervals.delete(key);
      }, expiry - Date.now());
      this.intervals.set(key, timeout);
    }

    return 'OK';
  });

  /**
   * Set value with expiry in seconds
   */
  setex = jest.fn(async (
    key: string,
    seconds: number,
    value: string
  ): Promise<string> => {
    return this.set(key, value, 'EX', seconds);
  });

  /**
   * Delete one or more keys
   */
  del = jest.fn(async (...keys: string[]): Promise<number> => {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deleted++;
        const interval = this.intervals.get(key);
        if (interval) {
          clearTimeout(interval);
          this.intervals.delete(key);
        }
      }
    }
    return deleted;
  });

  /**
   * Check if key exists
   */
  exists = jest.fn(async (...keys: string[]): Promise<number> => {
    let count = 0;
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry) {
        // Check if expired
        if (!entry.expiry || Date.now() <= entry.expiry) {
          count++;
        } else {
          this.cache.delete(key);
        }
      }
    }
    return count;
  });

  /**
   * Get time to live for a key
   */
  ttl = jest.fn(async (key: string): Promise<number> => {
    const entry = this.cache.get(key);
    if (!entry) {
      return -2; // Key doesn't exist
    }
    if (!entry.expiry) {
      return -1; // Key exists but has no expiry
    }

    const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  });

  /**
   * Increment value by 1
   */
  incr = jest.fn(async (key: string): Promise<number> => {
    const entry = this.cache.get(key);
    const currentValue = entry ? parseInt(entry.value, 10) : 0;
    const newValue = currentValue + 1;
    this.cache.set(key, { value: String(newValue) });
    return newValue;
  });

  /**
   * Increment value by amount
   */
  incrby = jest.fn(async (key: string, increment: number): Promise<number> => {
    const entry = this.cache.get(key);
    const currentValue = entry ? parseInt(entry.value, 10) : 0;
    const newValue = currentValue + increment;
    this.cache.set(key, { value: String(newValue) });
    return newValue;
  });

  /**
   * Decrement value by 1
   */
  decr = jest.fn(async (key: string): Promise<number> => {
    const entry = this.cache.get(key);
    const currentValue = entry ? parseInt(entry.value, 10) : 0;
    const newValue = currentValue - 1;
    this.cache.set(key, { value: String(newValue) });
    return newValue;
  });

  /**
   * Get all keys matching pattern
   */
  keys = jest.fn(async (pattern: string): Promise<string[]> => {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  });

  /**
   * Delete all keys
   */
  flushall = jest.fn(async (): Promise<string> => {
    this.clear();
    return 'OK';
  });

  /**
   * Delete all keys in current database
   */
  flushdb = jest.fn(async (): Promise<string> => {
    this.clear();
    return 'OK';
  });

  /**
   * Set multiple key-value pairs
   */
  mset = jest.fn(async (...args: string[]): Promise<string> => {
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      const value = args[i + 1];
      if (key && value !== undefined) {
        this.cache.set(key, { value });
      }
    }
    return 'OK';
  });

  /**
   * Get multiple values
   */
  mget = jest.fn(async (...keys: string[]): Promise<(string | null)[]> => {
    return Promise.all(keys.map(key => this.get(key)));
  });

  /**
   * Clear all data and intervals
   */
  clear(): void {
    this.cache.clear();
    for (const interval of this.intervals.values()) {
      clearTimeout(interval);
    }
    this.intervals.clear();
  }

  /**
   * Get all keys (for testing purposes)
   */
  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get raw cache data (for testing purposes)
   */
  getRawData(): Map<string, { value: string; expiry?: number }> {
    return this.cache;
  }
}
