# Testing Best Practices

This document outlines best practices for writing and maintaining tests in the Fashion Wallet backend.

## Table of Contents

- [Test Organization](#test-organization)
- [Test Naming](#test-naming)
- [Test Structure](#test-structure)
- [Fixture Usage](#fixture-usage)
- [Mock Usage](#mock-usage)
- [Assertions](#assertions)
- [Performance Testing](#performance-testing)
- [Coverage](#coverage)
- [Continuous Integration](#continuous-integration)

## Test Organization

### Directory Structure

```
project-root/
├── src/
│   ├── modules/
│   │   └── user/
│   │       ├── user.service.ts
│   │       ├── user.service.spec.ts      # Unit tests
│   │       ├── user.controller.ts
│   │       └── user.controller.spec.ts   # Unit tests
│   └── common/
│       └── utils/
│           └── testing/                   # Testing utilities
└── test/
    ├── setup.ts                           # Global test setup
    ├── examples/                          # Example tests
    ├── integration/                       # Integration tests
    │   └── user-api.integration.spec.ts
    └── e2e/                              # End-to-end tests
        └── user-flow.e2e.spec.ts
```

### Naming Conventions

**Unit Tests:**
- Place next to source file: `user.service.spec.ts`
- Name format: `[source-file].spec.ts`

**Integration Tests:**
- Place in `/test/integration`
- Name format: `[feature]-api.integration.spec.ts`

**E2E Tests:**
- Place in `/test/e2e`
- Name format: `[user-flow].e2e.spec.ts`

## Test Naming

### Describe Blocks

Use clear, descriptive names:

```typescript
// ✅ Good
describe('UserService', () => {
  describe('create', () => {
    describe('when email is valid', () => {});
    describe('when email is invalid', () => {});
  });
});

// ❌ Bad
describe('test', () => {
  describe('test2', () => {});
});
```

### Test Cases

Use behavior-driven style:

```typescript
// ✅ Good
it('should create user when valid data is provided', async () => {});
it('should throw ValidationError when email is invalid', async () => {});
it('should return null when user is not found', async () => {});

// ❌ Bad
it('test user creation', async () => {});
it('user email', async () => {});
```

## Test Structure

Follow the **Arrange-Act-Assert** pattern:

```typescript
it('should update user profile', async () => {
  // Arrange
  const user = await userFixture.create({ firstName: 'Original' });
  const updates = { firstName: 'Updated' };

  // Act
  const result = await service.update(user.id, updates);

  // Assert
  expect(result.firstName).toBe('Updated');
  expect(result.id).toBe(user.id);
});
```

### Keep Tests Simple

```typescript
// ✅ Good - One logical assertion per test
it('should set isActive to true for new users', () => {
  const user = userFixture.build();
  expect(user.isActive).toBe(true);
});

it('should generate unique emails for each user', () => {
  const user1 = userFixture.build();
  const user2 = userFixture.build();
  expect(user1.email).not.toBe(user2.email);
});

// ❌ Bad - Testing multiple unrelated things
it('should create valid user', () => {
  const user = userFixture.build();
  expect(user.isActive).toBe(true);
  expect(user.email).toContain('@');
  expect(user.id).toBeUUID();
  expect(user.createdAt).toBeDefined();
  // ... many more assertions
});
```

## Fixture Usage

### Use Fixtures for All Test Data

```typescript
// ✅ Good
const user = userFixture.build({ email: 'test@example.com' });

// ❌ Bad
const user = {
  id: '123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2b$10$...',
  role: 'user',
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdBy: null,
  updatedBy: null
};
```

### Reset Fixtures Between Tests

```typescript
describe('UserService', () => {
  let userFixture: UserFixture;

  beforeEach(() => {
    userFixture = new UserFixture(dataSource);
    userFixture.reset(); // Reset sequence counters
  });

  it('should create user 1', () => {
    const user = userFixture.build();
    expect(user.email).toBe('user1@test.com');
  });

  it('should create user 2', () => {
    const user = userFixture.build();
    expect(user.email).toBe('user1@test.com'); // Starts fresh
  });
});
```

### Use Build vs Create Appropriately

```typescript
// Unit tests - use build() (no database)
it('should format user name', () => {
  const user = userFixture.build({ firstName: 'John', lastName: 'Doe' });
  expect(formatUserName(user)).toBe('John Doe');
});

// Integration tests - use create() (with database)
it('should find user by email', async () => {
  const user = await userFixture.create({ email: 'test@example.com' });
  const found = await service.findByEmail('test@example.com');
  expect(found.id).toBe(user.id);
});
```

## Mock Usage

### Mock External Dependencies

```typescript
describe('FileUploadService', () => {
  let s3Mock: S3Mock;
  let service: FileUploadService;

  beforeEach(() => {
    s3Mock = new S3Mock();
    service = new FileUploadService(s3Mock);
  });

  it('should upload file to S3', async () => {
    await service.uploadFile('test.jpg', Buffer.from('data'));

    expect(s3Mock.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'uploads',
        Key: 'test.jpg'
      })
    );
  });
});
```

### Clear Mocks Between Tests

```typescript
beforeEach(() => {
  dbMock.clear();
  s3Mock.clear();
  redisMock.clear();
  queueMock.clear();
  jest.clearAllMocks();
});
```

### Don't Mock What You're Testing

```typescript
// ❌ Bad - Mocking the service under test
it('should create user', async () => {
  const mockService = { create: jest.fn() };
  await mockService.create({});
  expect(mockService.create).toHaveBeenCalled();
});

// ✅ Good - Test real service with mocked dependencies
it('should create user', async () => {
  const dbMock = new DatabaseMock();
  const service = new UserService(dbMock.mockRepository('User'));

  const user = await service.create(userFixture.build());

  expect(user).toBeDefined();
});
```

## Assertions

### Use Custom Matchers

```typescript
// ✅ Good
expect(user.id).toBeUUID();
expect(user.createdAt).toBeRecentDate();
expect(user.email).toBeValidEmail();

// ❌ Bad
expect(typeof user.id).toBe('string');
expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/);
```

### Use Specific Assertions

```typescript
// ✅ Good
expect(result).toBe(expected);
expect(result).toEqual(expected);
expect(result).toBeNull();
expect(result).toBeUndefined();

// ❌ Bad
expect(result == expected).toBe(true);
expect(result === null).toBe(true);
expect(typeof result === 'undefined').toBe(true);
```

### Test Both Success and Failure Cases

```typescript
describe('create', () => {
  it('should create user with valid data', async () => {
    // Test success case
  });

  it('should throw ValidationError with invalid email', async () => {
    // Test failure case
  });

  it('should throw ConflictError when email already exists', async () => {
    // Test error case
  });
});
```

## Performance Testing

### Set Performance Budgets

```typescript
it('should process avatar within 2 seconds', async () => {
  const profiler = new PerformanceProfiler();

  for (let i = 0; i < 10; i++) {
    await profiler.measure('avatar-processing', async () => {
      await avatarService.processAvatar(testPhotoUrl);
    });
  }

  // Assert performance requirement
  profiler.assertPerformance('avatar-processing', 2000);
});
```

### Profile Critical Paths

```typescript
// Identify and profile critical operations
const criticalOperations = [
  'user-login',
  'design-save',
  'avatar-generation',
  'catalog-search'
];

for (const operation of criticalOperations) {
  // Profile and assert performance
}
```

### Load Test Important Endpoints

```typescript
it('should handle 100 concurrent requests', async () => {
  const loadTester = new LoadTestRunner();

  const result = await loadTester.run({
    name: 'User Login',
    operation: async () => await httpHelper.post('/auth/login', credentials),
    concurrency: 100,
    duration: 5000
  });

  loadTester.assertPerformance(result, {
    minRPS: 50,
    maxP95Latency: 200,
    minSuccessRate: 99
  });
});
```

## Coverage

### Aim for High Coverage

Configure in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

### Focus on Business Logic

```typescript
// ✅ High value tests
describe('PricingService', () => {
  it('should apply discount for premium users', () => {});
  it('should calculate tax correctly', () => {});
  it('should handle currency conversion', () => {});
});

// ❌ Low value tests
describe('UserDto', () => {
  it('should have email property', () => {
    expect(new UserDto()).toHaveProperty('email');
  });
});
```

### Exclude Non-Logic Files

```javascript
// jest.config.js
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.dto.ts',
  '!src/**/*.entity.ts',
  '!src/**/*.interface.ts',
  '!src/main.ts'
]
```

## Continuous Integration

### Run Tests in CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: fashion_wallet_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6380:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5433
          TEST_DB_USER: postgres
          TEST_DB_PASSWORD: test
          TEST_DB_NAME: fashion_wallet_test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Fail on Coverage Drop

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Test Independence

### Don't Rely on Test Order

```typescript
// ❌ Bad - Test B depends on Test A
describe('UserService', () => {
  let createdUserId: string;

  it('A: should create user', async () => {
    const user = await service.create(userData);
    createdUserId = user.id;
  });

  it('B: should find created user', async () => {
    const user = await service.findById(createdUserId);
    expect(user).toBeDefined();
  });
});

// ✅ Good - Each test is independent
describe('UserService', () => {
  it('should create user', async () => {
    const user = await service.create(userData);
    expect(user).toBeDefined();
  });

  it('should find user by ID', async () => {
    const createdUser = await userFixture.create();
    const foundUser = await service.findById(createdUser.id);
    expect(foundUser.id).toBe(createdUser.id);
  });
});
```

### Clean Up After Tests

```typescript
// ✅ Automatic cleanup with base classes
beforeEach(async () => {
  await testHelper.beforeEach(); // Clears database
});

// ✅ Manual cleanup when needed
afterEach(async () => {
  await cleanup();
});
```

## Async Testing

### Always Await Async Operations

```typescript
// ✅ Good
it('should create user', async () => {
  const user = await userFixture.create();
  expect(user).toBeDefined();
});

// ❌ Bad
it('should create user', () => {
  userFixture.create(); // Promise not awaited!
  // Test completes before operation finishes
});
```

### Handle Promise Rejections

```typescript
// ✅ Good
it('should handle errors', async () => {
  await expect(
    service.findById('invalid-id')
  ).rejects.toThrow('Not found');
});

// ❌ Bad
it('should handle errors', async () => {
  try {
    await service.findById('invalid-id');
  } catch (error) {
    // Error silently caught but not asserted
  }
});
```

### Use Proper Timeouts

```typescript
// For slow operations
it('should process large file', async () => {
  await service.processFile(largefile);
}, 30000); // 30 second timeout

// Or use waitFor helpers
it('should eventually complete', async () => {
  await AsyncTestHelper.waitForCondition(
    () => job.isComplete,
    10000 // 10 second timeout
  );
});
```

## Code Review Checklist

When reviewing test code, check for:

- [ ] Tests are independent and can run in any order
- [ ] Fixtures are used for test data generation
- [ ] External dependencies are mocked
- [ ] Assertions are specific and meaningful
- [ ] Both success and failure cases are tested
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Test names clearly describe what is being tested
- [ ] Async operations are properly awaited
- [ ] Tests are not too complex or too simple
- [ ] Performance-critical code has performance tests
- [ ] Coverage meets or exceeds thresholds

## Summary

- **Organize** tests logically (unit, integration, e2e)
- **Name** tests descriptively (behavior-driven)
- **Structure** tests clearly (AAA pattern)
- **Use** fixtures for all test data
- **Mock** external dependencies
- **Assert** with custom matchers
- **Test** performance-critical paths
- **Maintain** high coverage (>80%)
- **Ensure** tests are independent
- **Handle** async operations properly
