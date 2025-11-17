# Migration Guide: Adopting Testing Utilities

This guide helps you migrate existing tests to use the new testing utilities framework.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Migration](#step-by-step-migration)
- [Migration Examples](#migration-examples)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the migration, ensure you have:

1. Node.js 18+ and npm
2. All required dependencies installed:
   ```bash
   npm install --save-dev @nestjs/testing jest ts-jest supertest
   ```
3. Updated Jest configuration (see Step 2)

## Step-by-Step Migration

### Step 1: Install Dependencies

If not already installed:

```bash
npm install --save-dev \
  @nestjs/testing \
  @types/jest \
  jest \
  ts-jest \
  supertest \
  @types/supertest
```

### Step 2: Update Jest Configuration

Update your `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/test/$1'
  },
  testTimeout: 10000,
  maxWorkers: '50%'
};
```

### Step 3: Create Test Setup File

Create `test/setup.ts`:

```typescript
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

// Suppress console output in tests
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
```

### Step 4: Start Test Database Services

Start the test database using Docker Compose:

```bash
docker-compose -f docker-compose.test.yml up -d
```

### Step 5: Migrate Existing Tests

Follow the migration examples below for your specific use cases.

## Migration Examples

### Unit Tests

**Before:**

```typescript
describe('UserService', () => {
  let service: UserService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn()
    };
    service = new UserService(mockRepository);
  });

  it('should create user', async () => {
    const user = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed'
    };

    mockRepository.save.mockResolvedValue({ id: '123', ...user });

    const result = await service.create(user);

    expect(result.id).toBe('123');
    expect(mockRepository.save).toHaveBeenCalled();
  });
});
```

**After:**

```typescript
import { UserFixture, DatabaseMock } from '@/common/utils/testing';

describe('UserService', () => {
  let service: UserService;
  let dbMock: DatabaseMock;
  let userRepository: any;
  let userFixture: UserFixture;

  beforeEach(() => {
    dbMock = new DatabaseMock();
    userRepository = dbMock.mockRepository('User');
    service = new UserService(userRepository);
    userFixture = new UserFixture();
  });

  it('should create user', async () => {
    const user = userFixture.build({ email: 'test@example.com' });

    const result = await service.create(user);

    expect(result.id).toBeUUID();
    expect(result.email).toBe('test@example.com');
    expect(userRepository.save).toHaveBeenCalled();
  });
});
```

### Integration Tests

**Before:**

```typescript
describe('User API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test@1234',
        firstName: 'Test',
        lastName: 'User'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.email).toBe('test@example.com');
      });
  });
});
```

**After:**

```typescript
import { ApiTestBase } from '@/common/utils/testing';

class UserApiTest extends ApiTestBase {
  protected getImports() {
    return [AppModule];
  }

  protected getProviders() {
    return [];
  }
}

describe('User API', () => {
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

  it('POST /auth/register', async () => {
    const response = await testHelper.httpHelper.post('/auth/register', {
      email: 'test@example.com',
      password: 'Test@1234',
      firstName: 'Test',
      lastName: 'User'
    }, 201);

    expect(response.body.email).toBe('test@example.com');
    expect(response.body.id).toBeUUID();
  });
});
```

### Test Data Generation

**Before:**

```typescript
const testUser = {
  id: 'test-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  passwordHash: '$2b$10$...',
  role: 'user',
  isActive: true,
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

**After:**

```typescript
import { UserFixture } from '@/common/utils/testing';

const userFixture = new UserFixture();
const testUser = userFixture.build({ email: 'test@example.com' });

// Or create in database
const savedUser = await userFixture.create({ email: 'test@example.com' });
```

### Mocking External Services

**Before:**

```typescript
const mockS3 = {
  upload: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Location: 'https://example.com/file.jpg'
    })
  }),
  getObject: jest.fn(),
  deleteObject: jest.fn()
};
```

**After:**

```typescript
import { S3Mock } from '@/common/utils/testing';

const s3Mock = new S3Mock();

// Use like real S3
await s3Mock.upload({
  Bucket: 'test-bucket',
  Key: 'file.jpg',
  Body: Buffer.from('test')
}).promise();

const file = await s3Mock.getObject({
  Bucket: 'test-bucket',
  Key: 'file.jpg'
}).promise();
```

## Common Patterns

### Pattern 1: Test User Authentication

**Before:**

```typescript
let authToken: string;

beforeEach(async () => {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'test@example.com', password: 'password' });

  authToken = response.body.token;
});

it('should access protected route', () => {
  return request(app.getHttpServer())
    .get('/users/me')
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);
});
```

**After:**

```typescript
it('should access protected route', async () => {
  const { user, token } = await testHelper.createAuthenticatedUser();

  const response = await testHelper.httpHelper.get('/users/me');

  expect(response.body.id).toBe(user.id);
});
```

### Pattern 2: Test Data Cleanup

**Before:**

```typescript
afterEach(async () => {
  await userRepository.delete({});
  await avatarRepository.delete({});
  await designModel.deleteMany({});
});
```

**After:**

```typescript
// Automatic cleanup with ApiTestBase
beforeEach(async () => {
  await testHelper.beforeEach(); // Clears all data
});
```

### Pattern 3: Creating Related Entities

**Before:**

```typescript
const user = await userRepository.save({
  email: 'test@example.com',
  // ... all fields
});

const avatar = await avatarRepository.save({
  userId: user.id,
  name: 'Avatar',
  // ... all fields
});
```

**After:**

```typescript
import { UserFixture, AvatarFixture } from '@/common/utils/testing';

const user = await userFixture.create();
const avatar = await avatarFixture.create({ userId: user.id });
```

### Pattern 4: Testing Validation

**Before:**

```typescript
it('should reject invalid email', async () => {
  try {
    await service.create({ email: 'invalid' });
    fail('Should have thrown');
  } catch (error) {
    expect(error.message).toContain('email');
  }
});
```

**After:**

```typescript
import { AssertionHelper } from '@/common/utils/testing';

it('should reject invalid email', async () => {
  await expect(
    service.create({ email: 'invalid' })
  ).rejects.toThrow();

  // Or with helper
  try {
    await service.create({ email: 'invalid' });
  } catch (error) {
    AssertionHelper.assertValidationError(error, 'email');
  }
});
```

## Troubleshooting

### Issue: Custom matchers not working

**Solution:** Ensure `test/setup.ts` is loaded:

```javascript
// In jest.config.js
setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
```

### Issue: Database connection errors

**Solution:** Ensure test database is running:

```bash
docker-compose -f docker-compose.test.yml up -d
docker-compose -f docker-compose.test.yml ps
```

Check environment variables:

```bash
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
export TEST_DB_USER=test
export TEST_DB_PASSWORD=test
export TEST_DB_NAME=fashion_wallet_test
```

### Issue: Tests timing out

**Solution:** Increase timeout in Jest config:

```javascript
// jest.config.js
testTimeout: 10000 // 10 seconds
```

Or per test:

```typescript
it('slow operation', async () => {
  // test code
}, 30000); // 30 seconds
```

### Issue: Fixtures not creating entities

**Solution:** Ensure DataSource is set:

```typescript
const userFixture = new UserFixture(dataSource);
// or
userFixture.setDataSource(dataSource);
```

### Issue: Mocks not resetting between tests

**Solution:** Clear mocks in beforeEach:

```typescript
beforeEach(() => {
  dbMock.clear();
  s3Mock.clear();
  redisMock.clear();
  queueMock.clear();
  jest.clearAllMocks();
});
```

### Issue: Path aliases not resolving

**Solution:** Ensure tsconfig.json has correct paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@test/*": ["test/*"]
    }
  }
}
```

And Jest config mirrors them:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^@test/(.*)$': '<rootDir>/test/$1'
}
```

## Migration Checklist

- [ ] Update Jest configuration
- [ ] Create test setup file with custom matchers
- [ ] Start test database services
- [ ] Replace manual test data with fixtures
- [ ] Replace manual mocks with utility mocks
- [ ] Migrate unit tests to use DatabaseMock
- [ ] Migrate integration tests to use ApiTestBase
- [ ] Add custom matchers to assertions
- [ ] Add performance tests where appropriate
- [ ] Update CI/CD pipelines if needed
- [ ] Document any custom patterns for your team

## Next Steps

After migration:

1. **Run your test suite:** `npm test`
2. **Check coverage:** `npm run test:cov`
3. **Review and update:** Refactor tests to use utilities more effectively
4. **Add new tests:** Write tests for previously untested code
5. **Document patterns:** Document team-specific testing patterns

## Getting Help

- Review examples in `/test/examples`
- Check the main README: `/src/common/utils/testing/README.md`
- Look at existing tests in the codebase
- Ask team members who have migrated their tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/ladjs/supertest#readme)
