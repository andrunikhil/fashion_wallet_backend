/**
 * Async test helper utilities for waiting and timing operations
 *
 * @example
 * ```typescript
 * // Wait for a condition to be true
 * await AsyncTestHelper.waitForCondition(() => user.isActive);
 *
 * // Wait for a specific value
 * await AsyncTestHelper.waitForValue(() => counter.value, 10);
 *
 * // Wait for promise to reject
 * const error = await AsyncTestHelper.waitForRejection(promise);
 * ```
 */
export class AsyncTestHelper {
  /**
   * Wait for a condition to become true
   *
   * @param condition Function that returns boolean or Promise<boolean>
   * @param timeout Maximum time to wait in milliseconds (default: 5000)
   * @param interval Check interval in milliseconds (default: 100)
   * @throws Error if timeout is reached before condition becomes true
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(
      `Timeout waiting for condition after ${timeout}ms`
    );
  }

  /**
   * Wait for a getter to return a specific value
   *
   * @param getter Function that returns the value to check
   * @param expectedValue Expected value to match
   * @param timeout Maximum time to wait in milliseconds (default: 5000)
   * @throws Error if timeout is reached before value matches
   */
  static async waitForValue<T>(
    getter: () => T | Promise<T>,
    expectedValue: T,
    timeout: number = 5000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const value = await getter();
      if (value === expectedValue) {
        return;
      }
      await this.sleep(100);
    }

    const currentValue = await getter();
    throw new Error(
      `Timeout waiting for value. Expected: ${expectedValue}, Got: ${currentValue}`
    );
  }

  /**
   * Wait for a promise to reject and return the error
   *
   * @param promise Promise that should reject
   * @param expectedError Optional error message or regex to match
   * @returns The error that was thrown
   * @throws Error if promise resolves instead of rejecting
   */
  static async waitForRejection(
    promise: Promise<any>,
    expectedError?: string | RegExp
  ): Promise<Error> {
    try {
      await promise;
      throw new Error('Expected promise to reject, but it resolved');
    } catch (error) {
      if (!(error instanceof Error)) {
        throw new Error('Expected error to be an instance of Error');
      }

      if (expectedError) {
        const message = error.message;
        if (typeof expectedError === 'string') {
          if (!message.includes(expectedError)) {
            throw new Error(
              `Expected error message to include "${expectedError}", but got "${message}"`
            );
          }
        } else {
          if (!expectedError.test(message)) {
            throw new Error(
              `Expected error message to match ${expectedError}, but got "${message}"`
            );
          }
        }
      }

      return error;
    }
  }

  /**
   * Sleep for specified milliseconds
   *
   * @param ms Milliseconds to sleep
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for multiple promises with timeout
   *
   * @param promises Array of promises to wait for
   * @param timeout Maximum time to wait in milliseconds
   * @returns Array of resolved values
   * @throws Error if timeout is reached
   */
  static async waitForAll<T>(
    promises: Promise<T>[],
    timeout: number = 10000
  ): Promise<T[]> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout waiting for all promises after ${timeout}ms`)),
        timeout
      )
    );

    return Promise.race([
      Promise.all(promises),
      timeoutPromise
    ]);
  }

  /**
   * Retry an async operation until it succeeds or max attempts reached
   *
   * @param operation Function to retry
   * @param maxAttempts Maximum number of attempts (default: 3)
   * @param delayMs Delay between attempts in milliseconds (default: 1000)
   * @returns Result of successful operation
   * @throws Last error if all attempts fail
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxAttempts) {
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute function with timeout
   *
   * @param fn Function to execute
   * @param timeout Timeout in milliseconds
   * @returns Result of function execution
   * @throws Error if timeout is reached
   */
  static async withTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeout}ms`)),
        timeout
      )
    );

    return Promise.race([fn(), timeoutPromise]);
  }
}
