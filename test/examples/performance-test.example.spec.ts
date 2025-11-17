/**
 * Performance Test Example
 *
 * Demonstrates how to write performance tests using:
 * - PerformanceProfiler for profiling operations
 * - LoadTestRunner for load testing
 */

import {
  PerformanceProfiler,
  LoadTestRunner,
  UserFixture,
  DatabaseMock
} from '@/common/utils/testing';

describe('Performance Tests', () => {
  describe('PerformanceProfiler', () => {
    let profiler: PerformanceProfiler;
    let dbMock: DatabaseMock;
    let userRepository: any;

    beforeEach(() => {
      profiler = new PerformanceProfiler();
      dbMock = new DatabaseMock();
      userRepository = dbMock.mockRepository('User');
    });

    it('should profile database query performance', async () => {
      const userFixture = new UserFixture();

      // Create test data
      const users = userFixture.buildMany(100);
      await userRepository.save(users);

      // Profile find operation
      for (let i = 0; i < 50; i++) {
        await profiler.measure('user-find-all', async () => {
          await userRepository.find();
        });
      }

      // Get statistics
      const stats = profiler.getStats('user-find-all');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(50);

      console.log('User Find All Performance:');
      console.log(`  Mean: ${stats!.mean.toFixed(2)}ms`);
      console.log(`  Median: ${stats!.median.toFixed(2)}ms`);
      console.log(`  Min: ${stats!.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats!.max.toFixed(2)}ms`);
      console.log(`  P95: ${stats!.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats!.p99.toFixed(2)}ms`);

      // Assert performance requirement (operations should be fast with mock)
      profiler.assertPerformance('user-find-all', 10); // Max 10ms mean
    });

    it('should profile multiple operations', async () => {
      const userFixture = new UserFixture();

      // Profile different operations
      for (let i = 0; i < 20; i++) {
        // Profile create
        await profiler.measure('user-create', async () => {
          const user = userFixture.build();
          await userRepository.save(user);
        });

        // Profile find by email
        await profiler.measure('user-find-by-email', async () => {
          await userRepository.findOne({
            where: { email: `user${i}@test.com` }
          });
        });

        // Profile update
        await profiler.measure('user-update', async () => {
          const user = await userRepository.findOne({
            where: { email: `user${i}@test.com` }
          });
          user.firstName = 'Updated';
          await userRepository.save(user);
        });
      }

      // Generate comprehensive report
      console.log(profiler.generateReport());

      // Assert performance for all operations
      profiler.assertPerformance('user-create', 5);
      profiler.assertPerformance('user-find-by-email', 5);
      profiler.assertPerformance('user-update', 10);
    });

    it('should profile P95 performance', async () => {
      const userFixture = new UserFixture();

      // Simulate variable latency
      for (let i = 0; i < 100; i++) {
        await profiler.measure('variable-operation', async () => {
          const user = userFixture.build();
          await userRepository.save(user);
          // Simulate some variable processing time
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 2));
          }
        });
      }

      const stats = profiler.getStats('variable-operation');
      expect(stats!.p95).toBeLessThan(stats!.max);

      // Assert P95 instead of mean
      profiler.assertP95Performance('variable-operation', 15);
    });
  });

  describe('LoadTestRunner', () => {
    let loadTester: LoadTestRunner;
    let dbMock: DatabaseMock;
    let userRepository: any;

    beforeEach(() => {
      loadTester = new LoadTestRunner();
      dbMock = new DatabaseMock();
      userRepository = dbMock.mockRepository('User');
    });

    it('should run load test with duration', async () => {
      const userFixture = new UserFixture();

      const result = await loadTester.run({
        name: 'User Creation Load Test',
        operation: async () => {
          const user = userFixture.build();
          await userRepository.save(user);
        },
        concurrency: 5,
        duration: 2000 // 2 seconds
      });

      console.log('Load Test Results:');
      console.log(`  Total Requests: ${result.totalRequests}`);
      console.log(`  Successful: ${result.successfulRequests}`);
      console.log(`  Failed: ${result.failedRequests}`);
      console.log(`  RPS: ${result.requestsPerSecond.toFixed(2)}`);
      console.log(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`);
      console.log(`  P95 Latency: ${result.p95Latency.toFixed(2)}ms`);

      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.failedRequests).toBe(0);
    });

    it('should run load test with fixed iterations', async () => {
      const userFixture = new UserFixture();

      const result = await loadTester.run({
        name: 'User Query Load Test',
        operation: async () => {
          await userRepository.find({ take: 10 });
        },
        concurrency: 3,
        iterations: 100 // Exactly 100 operations
      });

      expect(result.totalRequests).toBe(100);
      expect(result.successfulRequests).toBe(100);

      // Generate and log report
      console.log(loadTester.generateReport(result));
    });

    it('should assert performance requirements', async () => {
      const userFixture = new UserFixture();

      const result = await loadTester.run({
        name: 'Performance Requirement Test',
        operation: async () => {
          const user = userFixture.build();
          await userRepository.save(user);
        },
        concurrency: 2,
        duration: 1000
      });

      // Assert performance requirements
      loadTester.assertPerformance(result, {
        minRPS: 10, // At least 10 requests per second
        maxP95Latency: 50, // P95 latency under 50ms
        minSuccessRate: 99 // At least 99% success rate
      });
    });

    it('should handle errors gracefully', async () => {
      let callCount = 0;

      const result = await loadTester.run({
        name: 'Error Handling Test',
        operation: async () => {
          callCount++;
          // Fail every 5th request
          if (callCount % 5 === 0) {
            throw new Error('Simulated error');
          }
        },
        concurrency: 2,
        iterations: 20
      });

      expect(result.totalRequests).toBe(20);
      expect(result.failedRequests).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);

      console.log(`Failed ${result.failedRequests} out of ${result.totalRequests} requests`);
    });

    it('should compare different concurrency levels', async () => {
      const userFixture = new UserFixture();

      const concurrencyLevels = [1, 5, 10];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const result = await loadTester.run({
          name: `Concurrency ${concurrency}`,
          operation: async () => {
            const user = userFixture.build();
            await userRepository.save(user);
          },
          concurrency,
          duration: 1000
        });
        results.push(result);

        console.log(`\nConcurrency ${concurrency}:`);
        console.log(`  RPS: ${result.requestsPerSecond.toFixed(2)}`);
        console.log(`  Avg Latency: ${result.averageLatency.toFixed(2)}ms`);
        console.log(`  P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
      }

      // RPS should increase with concurrency (for this simple mock)
      expect(results[1].requestsPerSecond).toBeGreaterThan(
        results[0].requestsPerSecond
      );
    });
  });

  describe('Combined Performance Testing', () => {
    it('should use both profiler and load tester', async () => {
      const profiler = new PerformanceProfiler();
      const loadTester = new LoadTestRunner();
      const dbMock = new DatabaseMock();
      const userRepository = dbMock.mockRepository('User');
      const userFixture = new UserFixture();

      // First, profile individual operations
      for (let i = 0; i < 10; i++) {
        await profiler.measure('single-create', async () => {
          const user = userFixture.build();
          await userRepository.save(user);
        });
      }

      const singleOpStats = profiler.getStats('single-create');
      console.log('Single Operation Stats:');
      console.log(`  Mean: ${singleOpStats!.mean.toFixed(2)}ms`);

      // Then, run load test to see behavior under load
      const loadResult = await loadTester.run({
        name: 'Create Under Load',
        operation: async () => {
          const user = userFixture.build();
          await userRepository.save(user);
        },
        concurrency: 5,
        duration: 1000
      });

      console.log('\nUnder Load:');
      console.log(`  RPS: ${loadResult.requestsPerSecond.toFixed(2)}`);
      console.log(`  Avg Latency: ${loadResult.averageLatency.toFixed(2)}ms`);

      // Compare single vs load latency
      const latencyIncrease =
        (loadResult.averageLatency / singleOpStats!.mean - 1) * 100;
      console.log(
        `\nLatency increase under load: ${latencyIncrease.toFixed(1)}%`
      );
    });
  });
});
