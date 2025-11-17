import { customMatchers } from './utils/matchers';

// Extend Jest matchers
expect.extend(customMatchers);

// Global test configuration
beforeAll(async () => {
  // Setup global test resources
});

afterAll(async () => {
  // Cleanup global test resources
});

// Suppress console output in tests (can be overridden in specific tests)
if (process.env.TEST_SUPPRESS_LOGS !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
