# Fashion Wallet Testing Utilities

Comprehensive testing utilities for unit testing, integration testing, and performance testing in the Fashion Wallet backend.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Fixtures](#fixtures)
- [Mocks](#mocks)
- [Test Helpers](#test-helpers)
- [Custom Matchers](#custom-matchers)
- [Performance Testing](#performance-testing)
- [Snapshot Testing](#snapshot-testing)
- [Base Test Classes](#base-test-classes)
- [Best Practices](#best-practices)

## Installation

The testing utilities are already included in the project. Ensure you have the required dependencies:

```bash
npm install --save-dev @nestjs/testing jest ts-jest supertest
```

## Quick Start

### Unit Test Example

```typescript
import { UserFixture } from '@/common/utils/testing';
import { DatabaseMock } from '@/common/utils/testing';

describe('UserService', () => {
  let service: UserService;
  let dbMock: DatabaseMock;

  beforeEach(() => {
    dbMock = new DatabaseMock();
    const userRepository = dbMock.mockRepository('User');
    service = new UserService(userRepository);
  });

  it('should create a user', async () => {
    const userFixture = new UserFixture();
    const userData = userFixture.build({ email: 'test@example.com' });

    const result = await service.create(userData);

    expect(result).toBeDefined();
    expect(result.email).toBe('test@example.com');
  });
});
```

### Integration Test Example

```typescript
import { ApiTestBase, UserFixture } from '@/common/utils/testing';

class UserApiTest extends ApiTestBase {
  protected getImports() {
    return [AppModule];
  }

  protected getProviders() {
    return [];
  }
}

describe('User API (Integration)', () => {
  let testHelper: UserApiTest;

  beforeAll(async () => {
    testHelper = new UserApiTest();
    await testHelper.beforeAll();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  it('should register a new user', async () => {
    const response = await testHelper.httpHelper.post('/auth/register', {
      email: 'test@example.com',
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User'
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeUUID();
    expect(response.body.email).toBe('test@example.com');
  });
});
```

## Fixtures

Fixtures provide convenient factory methods for generating test data.

### UserFixture

```typescript
import { UserFixture } from '@/common/utils/testing';

const userFixture = new UserFixture(dataSource);

// Build without saving
const user = userFixture.build({ email: 'test@example.com' });

// Create and save to database
const savedUser = await userFixture.create({ role: 'admin' });

// Create multiple users
const users = await userFixture.createMany(5);

// Create specific user types
const admin = await userFixture.createAdmin();
const designer = await userFixture.createDesigner();
```

### AvatarFixture

```typescript
import { AvatarFixture } from '@/common/utils/testing';

const avatarFixture = new AvatarFixture(dataSource);

// Build avatar
const avatar = avatarFixture.build({ userId: 'user-id' });

// Build gender-specific avatars
const maleAvatar = avatarFixture.buildMale();
const femaleAvatar = avatarFixture.buildFemale();

// Build default avatar
const defaultAvatar = avatarFixture.buildDefault();

// Create and save
const savedAvatar = await avatarFixture.create({
  name: 'My Avatar',
  measurements: { height: 180, chest: 100 }
});
```

### CatalogFixture

```typescript
import { CatalogFixture } from '@/common/utils/testing';

const catalogFixture = new CatalogFixture(dataSource);

// Build catalog items
const silhouette = catalogFixture.buildSilhouette({ name: 'T-Shirt' });
const fabric = catalogFixture.buildFabric({ name: 'Cotton' });
const pattern = catalogFixture.buildPattern({ name: 'Stripes' });

// Build premium item
const premiumItem = catalogFixture.buildPremium();

// Save to database
const savedSilhouette = await catalogFixture.saveSilhouette();
const savedFabric = await catalogFixture.saveFabric();
```

### DesignFixture

```typescript
import { DesignFixture } from '@/common/utils/testing';

const designFixture = new DesignFixture(designModel); // Mongoose model

// Build design
const design = designFixture.build({ name: 'Summer Outfit' });

// Build design with layers
const designWithLayers = designFixture.buildWithLayers(3);

// Build specific status
const publishedDesign = designFixture.buildPublished();
const draftDesign = designFixture.buildDraft();

// Create and save
const savedDesign = await designFixture.create({
  userId: 'user-id',
  name: 'My Design'
});
```

## Mocks

Mock services for testing without external dependencies.

### DatabaseMock

```typescript
import { DatabaseMock } from '@/common/utils/testing';

const dbMock = new DatabaseMock();
const userRepository = dbMock.mockRepository<User>('User');

// Use like a real repository
await userRepository.save({ email: 'test@example.com' });
const user = await userRepository.findOne({ where: { email: 'test@example.com' } });
const users = await userRepository.find();
await userRepository.delete({ id: 'user-id' });
```

### S3Mock

```typescript
import { S3Mock } from '@/common/utils/testing';

const s3Mock = new S3Mock();

// Upload file
await s3Mock.upload({
  Bucket: 'test-bucket',
  Key: 'test.txt',
  Body: Buffer.from('test content')
}).promise();

// Get file
const result = await s3Mock.getObject({
  Bucket: 'test-bucket',
  Key: 'test.txt'
}).promise();

// Delete file
await s3Mock.deleteObject({
  Bucket: 'test-bucket',
  Key: 'test.txt'
}).promise();
```

### RedisMock

```typescript
import { RedisMock } from '@/common/utils/testing';

const redisMock = new RedisMock();

// Set value with expiry
await redisMock.set('key', 'value', 'EX', 60);

// Get value
const value = await redisMock.get('key');

// Delete value
await redisMock.del('key');

// Increment
await redisMock.incr('counter');
```

### QueueMock

```typescript
import { QueueMock } from '@/common/utils/testing';

const queueMock = new QueueMock();

// Add job
const job = await queueMock.add('email', {
  to: 'test@example.com',
  subject: 'Test'
});

// Process jobs
queueMock.process('email', async (job) => {
  console.log('Processing:', job.data);
});

// Get jobs
const jobs = await queueMock.getJobs(['waiting', 'active', 'completed']);
```

## Test Helpers

### AsyncTestHelper

```typescript
import { AsyncTestHelper } from '@/common/utils/testing';

// Wait for condition
await AsyncTestHelper.waitForCondition(
  () => user.isActive,
  5000 // timeout
);

// Wait for specific value
await AsyncTestHelper.waitForValue(
  () => counter.value,
  10 // expected value
);

// Wait for rejection
const error = await AsyncTestHelper.waitForRejection(
  promise,
  'Expected error message'
);

// Retry operation
const result = await AsyncTestHelper.retry(
  () => unreliableOperation(),
  3, // max attempts
  1000 // delay between attempts
);
```

### HttpTestHelper

```typescript
import { HttpTestHelper } from '@/common/utils/testing';

const httpHelper = new HttpTestHelper(app);

// Authenticate
const token = await httpHelper.authenticate({
  email: 'test@example.com',
  password: 'password'
});

// Make authenticated requests
const response = await httpHelper.get('/users/me');
const createResponse = await httpHelper.post('/users', userData);
const updateResponse = await httpHelper.patch('/users/123', updates);
const deleteResponse = await httpHelper.delete('/users/123');
```

### AssertionHelper

```typescript
import { AssertionHelper } from '@/common/utils/testing';

// Assert validation error
AssertionHelper.assertValidationError(
  error,
  'email',
  'Invalid email format'
);

// Assert database record
AssertionHelper.assertDatabaseRecord(
  actualUser,
  { email: 'test@example.com', role: 'user' },
  ['createdAt', 'updatedAt'] // exclude fields
);

// Assert array contains
AssertionHelper.assertArrayContains(
  users,
  { role: 'admin' }
);

// Assert recent date
AssertionHelper.assertRecentDate(user.createdAt, 60); // within 60 seconds
```

## Custom Matchers

```typescript
// UUID validation
expect(user.id).toBeUUID();

// Recent date
expect(user.createdAt).toBeRecentDate(60);

// Array contains object matching
expect(users).toContainObjectMatching({ role: 'admin' });

// Schema validation
expect(response.body).toMatchSchema({
  id: 'uuid',
  email: 'string',
  createdAt: 'date'
});

// Email validation
expect(user.email).toBeValidEmail();

// URL validation
expect(avatar.modelUrl).toBeValidUrl();

// Range validation
expect(user.age).toBeWithinRange(18, 100);

// Enum validation
expect(user.role).toBeOneOf(['user', 'admin', 'designer']);
```

## Performance Testing

### PerformanceProfiler

```typescript
import { PerformanceProfiler } from '@/common/utils/testing';

const profiler = new PerformanceProfiler();

// Measure operation
for (let i = 0; i < 100; i++) {
  await profiler.measure('database-query', async () => {
    await userRepository.find();
  });
}

// Get statistics
const stats = profiler.getStats('database-query');
console.log(`Mean: ${stats.mean}ms`);
console.log(`P95: ${stats.p95}ms`);
console.log(`P99: ${stats.p99}ms`);

// Assert performance
profiler.assertPerformance('database-query', 100); // max 100ms mean

// Generate report
console.log(profiler.generateReport());
```

### LoadTestRunner

```typescript
import { LoadTestRunner } from '@/common/utils/testing';

const loadTester = new LoadTestRunner();

// Run load test
const result = await loadTester.run({
  name: 'API endpoint',
  operation: async () => await httpHelper.get('/users'),
  concurrency: 10,
  duration: 5000 // 5 seconds
});

console.log(`RPS: ${result.requestsPerSecond}`);
console.log(`P95 Latency: ${result.p95Latency}ms`);

// Assert performance requirements
loadTester.assertPerformance(result, {
  minRPS: 50,
  maxP95Latency: 200,
  minSuccessRate: 99
});
```

## Snapshot Testing

```typescript
import { SnapshotManager } from '@/common/utils/testing';

// Sanitize data before snapshot
const sanitized = SnapshotManager.sanitize(apiResponse, {
  uuids: true,
  dates: true,
  tokens: true
});
expect(sanitized).toMatchSnapshot();

// Assert with automatic sanitization
SnapshotManager.assertMatchesSnapshot(
  apiResponse,
  'user-create-response',
  { uuids: true, dates: true }
);

// Prepare for snapshot (sanitize + sort)
const prepared = SnapshotManager.prepareForSnapshot(apiResponse);
expect(prepared).toMatchSnapshot();
```

## Base Test Classes

### ApiTestBase

```typescript
import { ApiTestBase } from '@/common/utils/testing';

class MyApiTest extends ApiTestBase {
  protected getImports() {
    return [AppModule];
  }

  protected getProviders() {
    return [];
  }

  protected configureApp(app: INestApplication) {
    // Configure app (pipes, filters, etc.)
  }
}

describe('My API', () => {
  let testHelper: MyApiTest;

  beforeAll(async () => {
    testHelper = new MyApiTest();
    await testHelper.beforeAll();
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  it('should work', async () => {
    // Use testHelper.httpHelper, testHelper.dbManager, etc.
  });
});
```

### ServiceTestBase

```typescript
import { ServiceTestBase } from '@/common/utils/testing';

class MyServiceTest extends ServiceTestBase {
  getProviders(): Provider[] {
    return [
      MyService,
      { provide: 'MyRepository', useValue: this.dbMock.mockRepository('MyEntity') }
    ];
  }

  getImports() {
    return [];
  }
}

describe('MyService', () => {
  let testHelper: MyServiceTest;
  let service: MyService;

  beforeAll(async () => {
    testHelper = new MyServiceTest();
    await testHelper.beforeAll();
    service = testHelper.getService(MyService);
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach();
  });

  it('should work', () => {
    // Use service and testHelper mocks
  });
});
```

## Best Practices

### 1. Test Organization

- Keep unit tests next to source files (`*.spec.ts`)
- Keep integration tests in `/test/integration`
- Keep E2E tests in `/test/e2e`

### 2. Fixture Usage

- Use fixtures for all test data generation
- Reset fixtures between tests for isolation
- Prefer `build()` for unit tests (no database)
- Use `create()` for integration tests (with database)

### 3. Mock Usage

- Mock external dependencies (S3, Redis, etc.) in unit tests
- Use real database for integration tests
- Mock at service boundaries
- Clear mocks between tests

### 4. Performance Testing

- Test critical paths with profiler
- Set performance budgets and enforce them
- Monitor for regressions in CI/CD
- Use load testing for stress scenarios

### 5. Code Coverage

- Aim for >80% coverage (enforced by Jest config)
- Focus on business logic
- Ignore DTOs, entities, and interfaces
- Test edge cases and error paths

### 6. Test Independence

- Each test should be independent
- Don't rely on test execution order
- Clean up after each test
- Use beforeEach/afterEach for setup/teardown

### 7. Async Testing

- Always await async operations
- Use AsyncTestHelper for waiting conditions
- Set appropriate timeouts
- Handle promise rejections properly

### 8. Snapshot Testing

- Use for API responses and large objects
- Sanitize dynamic data (UUIDs, dates, tokens)
- Review snapshot changes carefully
- Update snapshots when intentional changes occur

## Examples

See the `/test/examples` directory for complete working examples:

- `unit-test.example.spec.ts` - Unit testing with mocks
- `integration-test.example.spec.ts` - API integration testing
- `performance-test.example.spec.ts` - Performance profiling
- `load-test.example.spec.ts` - Load testing

## License

MIT
