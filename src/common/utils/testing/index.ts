/**
 * Fashion Wallet Testing Utilities
 *
 * Comprehensive testing utilities for unit, integration, and performance testing
 *
 * @example
 * ```typescript
 * // Import fixtures
 * import { UserFixture, AvatarFixture } from '@/common/utils/testing';
 *
 * // Import mocks
 * import { DatabaseMock, S3Mock } from '@/common/utils/testing';
 *
 * // Import helpers
 * import { AsyncTestHelper, HttpTestHelper } from '@/common/utils/testing';
 *
 * // Import base classes
 * import { ApiTestBase, ServiceTestBase } from '@/common/utils/testing';
 * ```
 */

// Fixtures
export * from './fixtures';

// Mocks
export * from './mocks';

// Helpers
export * from './helpers';

// Performance
export * from './performance';

// Snapshot
export * from './snapshot';

// Base classes
export * from './base';

// Setup
export * from './setup';
