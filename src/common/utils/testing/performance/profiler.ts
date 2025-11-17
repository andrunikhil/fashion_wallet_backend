/**
 * Performance statistics interface
 */
export interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

/**
 * Performance profiler for measuring and analyzing operation performance
 *
 * @example
 * ```typescript
 * const profiler = new PerformanceProfiler();
 *
 * // Measure operation
 * for (let i = 0; i < 100; i++) {
 *   await profiler.measure('database-query', async () => {
 *     await db.query('SELECT * FROM users');
 *   });
 * }
 *
 * // Get statistics
 * const stats = profiler.getStats('database-query');
 * console.log(`Mean: ${stats.mean}ms, P95: ${stats.p95}ms`);
 *
 * // Assert performance requirement
 * profiler.assertPerformance('database-query', 100); // Max 100ms mean
 *
 * // Generate report
 * console.log(profiler.generateReport());
 * ```
 */
export class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Measure the execution time of an operation
   *
   * @param name Name/identifier for the measurement
   * @param operation Function to measure
   * @returns Result of the operation
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      const duration = performance.now() - start;
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
    }
  }

  /**
   * Get performance statistics for a measurement
   *
   * @param name Name of the measurement
   * @returns Performance statistics or null if no measurements exist
   */
  getStats(name: string): PerformanceStats | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((a, b) => a + b, 0);

    return {
      count: measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / measurements.length,
      median: sorted[Math.floor(measurements.length / 2)],
      p95: sorted[Math.floor(measurements.length * 0.95)],
      p99: sorted[Math.floor(measurements.length * 0.99)]
    };
  }

  /**
   * Assert that performance meets requirement
   *
   * @param name Name of the measurement
   * @param maxDuration Maximum allowed mean duration in milliseconds
   * @throws Error if requirement is not met
   */
  assertPerformance(name: string, maxDuration: number): void {
    const stats = this.getStats(name);
    if (!stats) {
      throw new Error(`No measurements found for ${name}`);
    }
    if (stats.mean > maxDuration) {
      throw new Error(
        `Performance requirement not met for ${name}: ` +
          `mean ${stats.mean.toFixed(2)}ms > ${maxDuration}ms`
      );
    }
  }

  /**
   * Assert that P95 performance meets requirement
   *
   * @param name Name of the measurement
   * @param maxDuration Maximum allowed P95 duration in milliseconds
   * @throws Error if requirement is not met
   */
  assertP95Performance(name: string, maxDuration: number): void {
    const stats = this.getStats(name);
    if (!stats) {
      throw new Error(`No measurements found for ${name}`);
    }
    if (stats.p95 > maxDuration) {
      throw new Error(
        `P95 performance requirement not met for ${name}: ` +
          `p95 ${stats.p95.toFixed(2)}ms > ${maxDuration}ms`
      );
    }
  }

  /**
   * Generate a formatted performance report
   *
   * @returns Formatted report string
   */
  generateReport(): string {
    const lines: string[] = ['Performance Report:', ''];

    for (const [name, measurements] of this.measurements.entries()) {
      const stats = this.getStats(name)!;
      lines.push(`${name}:`);
      lines.push(`  Count: ${stats.count}`);
      lines.push(`  Mean: ${stats.mean.toFixed(2)}ms`);
      lines.push(`  Median: ${stats.median.toFixed(2)}ms`);
      lines.push(`  Min: ${stats.min.toFixed(2)}ms`);
      lines.push(`  Max: ${stats.max.toFixed(2)}ms`);
      lines.push(`  P95: ${stats.p95.toFixed(2)}ms`);
      lines.push(`  P99: ${stats.p99.toFixed(2)}ms`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }

  /**
   * Clear measurements for a specific name
   *
   * @param name Name of measurements to clear
   */
  clearMeasurement(name: string): void {
    this.measurements.delete(name);
  }

  /**
   * Get all measurement names
   *
   * @returns Array of measurement names
   */
  getMeasurementNames(): string[] {
    return Array.from(this.measurements.keys());
  }

  /**
   * Get raw measurements for a name
   *
   * @param name Name of the measurement
   * @returns Array of measurement durations or undefined
   */
  getRawMeasurements(name: string): number[] | undefined {
    return this.measurements.get(name);
  }
}
