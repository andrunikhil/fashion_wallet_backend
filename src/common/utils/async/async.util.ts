/**
 * Retry options configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Batch processing options
 */
export interface BatchOptions<T> {
  batchSize: number;
  concurrency?: number;
  onBatchComplete?: (results: T[], batchIndex: number) => void;
  onError?: (error: Error, item: any) => void;
}

/**
 * Async utility class for handling asynchronous operations
 * Provides retry logic, timeouts, parallel execution, and batch processing
 */
export class AsyncUtil {
  /**
   * Delays execution for specified milliseconds
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retries an async operation with configurable backoff
   * @param fn Async function to retry
   * @param options Retry options
   * @returns Promise with function result
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 'exponential',
      maxDelay = 30000,
      onRetry,
      shouldRetry,
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (shouldRetry && !shouldRetry(lastError)) {
          throw lastError;
        }

        // Don't retry if this was the last attempt
        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Calculate delay
        let retryDelay = delay;
        if (backoff === 'exponential') {
          retryDelay = Math.min(delay * Math.pow(2, attempt - 1), maxDelay);
        } else if (backoff === 'linear') {
          retryDelay = Math.min(delay * attempt, maxDelay);
        }

        // Call retry callback
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        // Wait before next attempt
        await this.sleep(retryDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Wraps a promise with a timeout
   * @param promise Promise to wrap
   * @param timeoutMs Timeout in milliseconds
   * @param timeoutError Optional custom timeout error
   * @returns Promise that rejects on timeout
   */
  static async timeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError?: Error,
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Executes promises in parallel with concurrency limit
   * @param items Items to process
   * @param fn Function to execute for each item
   * @param concurrency Maximum concurrent executions
   * @returns Promise with all results
   */
  static async parallel<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    concurrency: number = 5,
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const promise = fn(item, i).then((result) => {
        results[i] = result;
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        executing.splice(
          executing.findIndex((p) => p === promise),
          1,
        );
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Executes promises sequentially
   * @param items Items to process
   * @param fn Function to execute for each item
   * @returns Promise with all results
   */
  static async sequential<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i++) {
      results.push(await fn(items[i], i));
    }

    return results;
  }

  /**
   * Processes items in batches
   * @param items Items to process
   * @param fn Function to execute for each item
   * @param options Batch options
   * @returns Promise with all results
   */
  static async batch<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    options: BatchOptions<R>,
  ): Promise<R[]> {
    const { batchSize, concurrency = 1, onBatchComplete, onError } = options;
    const results: R[] = [];

    // Split into batches
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process batches
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchResults = await this.parallel(
        batch,
        async (item, itemIndex) => {
          try {
            return await fn(item, batchIndex * batchSize + itemIndex);
          } catch (error) {
            if (onError) {
              onError(error as Error, item);
            }
            throw error;
          }
        },
        concurrency,
      );

      results.push(...batchResults);

      if (onBatchComplete) {
        onBatchComplete(batchResults, batchIndex);
      }
    }

    return results;
  }

  /**
   * Executes all promises and returns both fulfilled and rejected results
   * @param promises Promises to execute
   * @returns Promise with all settled results
   */
  static async allSettled<T>(
    promises: Promise<T>[],
  ): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(promises);
  }

  /**
   * Executes promises with a race to first successful result
   * @param promises Promises to race
   * @returns Promise with first successful result
   */
  static async race<T>(promises: Promise<T>[]): Promise<T> {
    return Promise.race(promises);
  }

  /**
   * Executes promises and returns first successful result (ignores rejections)
   * @param promises Promises to execute
   * @returns Promise with first successful result
   */
  static async any<T>(promises: Promise<T>[]): Promise<T> {
    return Promise.any(promises);
  }

  /**
   * Polls a function until it returns true or times out
   * @param fn Function to poll
   * @param options Polling options
   * @returns Promise that resolves when condition is met
   */
  static async poll(
    fn: () => Promise<boolean> | boolean,
    options: {
      interval?: number;
      timeout?: number;
      maxAttempts?: number;
    } = {},
  ): Promise<void> {
    const { interval = 1000, timeout = 30000, maxAttempts = Infinity } = options;
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < maxAttempts) {
      const result = await fn();
      if (result) {
        return;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Polling timeout exceeded');
      }

      attempts++;
      await this.sleep(interval);
    }

    throw new Error('Max polling attempts exceeded');
  }

  /**
   * Debounces an async function
   * @param fn Function to debounce
   * @param delayMs Delay in milliseconds
   * @returns Debounced function
   */
  static debounce<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    delayMs: number,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    let latestResolve: ((value: ReturnType<T>) => void) | null = null;
    let latestReject: ((error: any) => void) | null = null;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return new Promise<ReturnType<T>>((resolve, reject) => {
        latestResolve = resolve;
        latestReject = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            latestResolve?.(result);
          } catch (error) {
            latestReject?.(error);
          }
        }, delayMs);
      });
    };
  }

  /**
   * Throttles an async function
   * @param fn Function to throttle
   * @param limitMs Time limit in milliseconds
   * @returns Throttled function
   */
  static throttle<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    limitMs: number,
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> | null {
    let lastRun = 0;

    return async (...args: Parameters<T>): Promise<ReturnType<T>> | null => {
      const now = Date.now();

      if (now - lastRun >= limitMs) {
        lastRun = now;
        return fn(...args);
      }

      return null;
    };
  }

  /**
   * Memoizes an async function
   * @param fn Function to memoize
   * @param keyFn Optional key function
   * @returns Memoized function
   */
  static memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyFn?: (...args: Parameters<T>) => string,
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = await fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  /**
   * Executes a function with a lock to prevent concurrent execution
   * @param key Lock key
   * @param fn Function to execute
   * @returns Promise with function result
   */
  private static locks = new Map<string, Promise<any>>();

  static async lock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for existing lock
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create new lock
    const promise = fn();
    this.locks.set(key, promise);

    try {
      return await promise;
    } finally {
      this.locks.delete(key);
    }
  }

  /**
   * Wraps a promise to catch and handle errors
   * @param promise Promise to wrap
   * @returns Tuple of [error, data]
   */
  static async safely<T>(
    promise: Promise<T>,
  ): Promise<[Error | null, T | null]> {
    try {
      const data = await promise;
      return [null, data];
    } catch (error) {
      return [error as Error, null];
    }
  }
}
