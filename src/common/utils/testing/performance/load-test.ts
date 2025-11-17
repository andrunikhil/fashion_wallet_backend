/**
 * Load test result interface
 */
export interface LoadTestResult {
  name: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  duration: number;
  requestsPerSecond: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errors: Error[];
}

/**
 * Load test configuration interface
 */
export interface LoadTestConfig {
  name: string;
  operation: () => Promise<any>;
  concurrency: number;
  duration?: number;
  iterations?: number;
}

/**
 * Load test runner for stress testing operations
 *
 * @example
 * ```typescript
 * const loadTester = new LoadTestRunner();
 *
 * // Run load test with duration
 * const result = await loadTester.run({
 *   name: 'API endpoint',
 *   operation: async () => await fetch('/api/users'),
 *   concurrency: 10,
 *   duration: 5000 // 5 seconds
 * });
 *
 * console.log(`RPS: ${result.requestsPerSecond}`);
 * console.log(`P95 Latency: ${result.p95Latency}ms`);
 *
 * // Run load test with fixed iterations
 * const result2 = await loadTester.run({
 *   name: 'Database query',
 *   operation: async () => await db.query('SELECT * FROM users'),
 *   concurrency: 5,
 *   iterations: 100
 * });
 * ```
 */
export class LoadTestRunner {
  /**
   * Run a load test
   *
   * @param config Load test configuration
   * @returns Load test results
   */
  async run(config: LoadTestConfig): Promise<LoadTestResult> {
    const { name, operation, concurrency, duration, iterations } = config;

    if (!duration && !iterations) {
      throw new Error('Either duration or iterations must be specified');
    }

    const startTime = Date.now();
    const results: number[] = [];
    const errors: Error[] = [];
    let completed = 0;
    let targetReached = false;

    const workers = Array.from({ length: concurrency }, async () => {
      while (!targetReached) {
        // Check if we should stop
        if (duration && Date.now() - startTime >= duration) {
          targetReached = true;
          break;
        }
        if (iterations && completed >= iterations) {
          targetReached = true;
          break;
        }

        const opStart = performance.now();
        try {
          await operation();
          const opDuration = performance.now() - opStart;
          results.push(opDuration);
          completed++;
        } catch (error) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
          completed++;
        }
      }
    });

    await Promise.all(workers);

    const actualDuration = Date.now() - startTime;
    const successfulResults = results.filter(r => r !== undefined);

    return this.calculateResults(
      name,
      successfulResults,
      errors,
      actualDuration
    );
  }

  /**
   * Calculate load test results from measurements
   */
  private calculateResults(
    name: string,
    results: number[],
    errors: Error[],
    duration: number
  ): LoadTestResult {
    const totalRequests = results.length + errors.length;
    const successfulRequests = results.length;
    const failedRequests = errors.length;

    if (results.length === 0) {
      return {
        name,
        totalRequests,
        successfulRequests: 0,
        failedRequests,
        duration,
        requestsPerSecond: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errors
      };
    }

    const sorted = [...results].sort((a, b) => a - b);
    const sum = results.reduce((a, b) => a + b, 0);

    return {
      name,
      totalRequests,
      successfulRequests,
      failedRequests,
      duration,
      requestsPerSecond: (totalRequests / duration) * 1000,
      averageLatency: sum / results.length,
      minLatency: sorted[0],
      maxLatency: sorted[sorted.length - 1],
      p50Latency: sorted[Math.floor(results.length * 0.5)],
      p95Latency: sorted[Math.floor(results.length * 0.95)],
      p99Latency: sorted[Math.floor(results.length * 0.99)],
      errors
    };
  }

  /**
   * Generate formatted report from load test result
   *
   * @param result Load test result
   * @returns Formatted report string
   */
  generateReport(result: LoadTestResult): string {
    const lines: string[] = [
      `Load Test Report: ${result.name}`,
      '',
      'Summary:',
      `  Total Requests: ${result.totalRequests}`,
      `  Successful: ${result.successfulRequests}`,
      `  Failed: ${result.failedRequests}`,
      `  Success Rate: ${(
        (result.successfulRequests / result.totalRequests) *
        100
      ).toFixed(2)}%`,
      `  Duration: ${result.duration}ms`,
      `  Requests/sec: ${result.requestsPerSecond.toFixed(2)}`,
      '',
      'Latency:',
      `  Average: ${result.averageLatency.toFixed(2)}ms`,
      `  Min: ${result.minLatency.toFixed(2)}ms`,
      `  Max: ${result.maxLatency.toFixed(2)}ms`,
      `  P50: ${result.p50Latency.toFixed(2)}ms`,
      `  P95: ${result.p95Latency.toFixed(2)}ms`,
      `  P99: ${result.p99Latency.toFixed(2)}ms`
    ];

    if (result.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      const errorCounts = new Map<string, number>();
      for (const error of result.errors) {
        const message = error.message;
        errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
      }
      for (const [message, count] of errorCounts.entries()) {
        lines.push(`  ${count}x ${message}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Run multiple load tests sequentially
   *
   * @param configs Array of load test configurations
   * @returns Array of load test results
   */
  async runMultiple(configs: LoadTestConfig[]): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const config of configs) {
      const result = await this.run(config);
      results.push(result);
    }

    return results;
  }

  /**
   * Assert that load test meets performance requirements
   *
   * @param result Load test result
   * @param requirements Performance requirements
   */
  assertPerformance(
    result: LoadTestResult,
    requirements: {
      minRPS?: number;
      maxP95Latency?: number;
      maxP99Latency?: number;
      minSuccessRate?: number;
    }
  ): void {
    const errors: string[] = [];

    if (requirements.minRPS && result.requestsPerSecond < requirements.minRPS) {
      errors.push(
        `RPS requirement not met: ${result.requestsPerSecond.toFixed(
          2
        )} < ${requirements.minRPS}`
      );
    }

    if (
      requirements.maxP95Latency &&
      result.p95Latency > requirements.maxP95Latency
    ) {
      errors.push(
        `P95 latency requirement not met: ${result.p95Latency.toFixed(
          2
        )}ms > ${requirements.maxP95Latency}ms`
      );
    }

    if (
      requirements.maxP99Latency &&
      result.p99Latency > requirements.maxP99Latency
    ) {
      errors.push(
        `P99 latency requirement not met: ${result.p99Latency.toFixed(
          2
        )}ms > ${requirements.maxP99Latency}ms`
      );
    }

    if (requirements.minSuccessRate) {
      const successRate =
        (result.successfulRequests / result.totalRequests) * 100;
      if (successRate < requirements.minSuccessRate) {
        errors.push(
          `Success rate requirement not met: ${successRate.toFixed(
            2
          )}% < ${requirements.minSuccessRate}%`
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Performance requirements not met:\n  ${errors.join('\n  ')}`
      );
    }
  }
}
