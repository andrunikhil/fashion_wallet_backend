# Implementation Plan: Testing and Development Utilities (utils-04)

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Implementation Plan
**Status**: Draft
**Related Architecture**: arch-utils-04-testing-dev-utilities
**Estimated Duration**: 2-3 weeks

---

## 1. Executive Summary

This implementation plan outlines the development of comprehensive testing and development utilities for the Fashion Wallet backend. These utilities will provide essential support for unit testing, integration testing, test data generation, mocking, and development workflow optimization. The implementation will follow a phased approach to ensure incremental delivery and validation.

---

## 2. Implementation Overview

### 2.1 Implementation Phases

```
Phase 1: Foundation Setup (Days 1-3)
├── Test infrastructure setup
├── Jest configuration enhancement
├── Test database setup
└── Basic fixtures framework

Phase 2: Core Test Utilities (Days 4-7)
├── Fixture factories
├── Mock services
├── Test helpers
└── Custom matchers

Phase 3: Advanced Testing Features (Days 8-12)
├── Performance profiling
├── Snapshot testing utilities
├── HTTP test helpers
└── Integration test base classes

Phase 4: Documentation & Examples (Days 13-15)
├── API documentation
├── Usage examples
├── Testing best practices
└── Migration guide
```

---

## 3. Phase 1: Foundation Setup (Days 1-3)

### 3.1 Objectives
- Set up test infrastructure
- Configure Jest for optimal testing
- Establish test database
- Create basic fixture framework

### 3.2 Day 1: Test Infrastructure Setup

#### Tasks

**Jest Configuration Enhancement**
```typescript
// jest.config.js
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

**Test Setup File**
```typescript
// test/setup.ts
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
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
```

**Deliverables**:
- ✓ Enhanced Jest configuration
- ✓ Test setup and teardown scripts
- ✓ Coverage reporting configured
- ✓ Test path aliases configured

### 3.3 Day 2: Test Database Setup

#### Tasks

**Create Test Database Manager**
```typescript
// src/common/utils/testing/setup/test-database.ts
import { Connection, createConnection } from 'typeorm';

export class TestDatabaseManager {
  private connection: Connection;

  async setup(): Promise<Connection> {
    this.connection = await createConnection({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'fashion_wallet_test',
      entities: [__dirname + '/../../../**/*.entity.ts'],
      synchronize: true,
      dropSchema: true,
      logging: false
    });

    return this.connection;
  }

  async seed(fixtures: Record<string, any[]>): Promise<void> {
    for (const [entityName, data] of Object.entries(fixtures)) {
      const repository = this.connection.getRepository(entityName);
      await repository.save(data);
    }
  }

  async clear(): Promise<void> {
    const entities = this.connection.entityMetadatas;
    for (const entity of entities) {
      const repository = this.connection.getRepository(entity.name);
      await repository.clear();
    }
  }

  async teardown(): Promise<void> {
    if (this.connection?.isConnected) {
      await this.connection.close();
    }
  }
}
```

**Docker Compose for Test Database**
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: fashion_wallet_test
    ports:
      - "5433:5432"
    volumes:
      - test-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5

  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  test-db-data:
```

**Deliverables**:
- ✓ TestDatabaseManager implementation
- ✓ Docker Compose for test services
- ✓ Database migration scripts
- ✓ Connection pooling configured

### 3.4 Day 3: Basic Fixture Framework

#### Tasks

**Create Fixture Factory Interface**
```typescript
// src/common/utils/testing/fixtures/fixture.interface.ts
export interface FixtureFactory<T> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  create(overrides?: Partial<T>): Promise<T>;
  createMany(count: number, overrides?: Partial<T>): Promise<T[]>;
  reset(): void;
}
```

**Implement User Fixture**
```typescript
// src/common/utils/testing/fixtures/user.fixture.ts
export class UserFixture implements FixtureFactory<User> {
  private sequenceId = 0;

  build(overrides: Partial<User> = {}): User {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      email: overrides.email || `user${this.sequenceId}@test.com`,
      firstName: overrides.firstName || `Test`,
      lastName: overrides.lastName || `User${this.sequenceId}`,
      password: overrides.password || 'Test@1234',
      role: overrides.role || 'user',
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  async create(overrides: Partial<User> = {}): Promise<User> {
    const user = this.build(overrides);
    return await getRepository(User).save(user);
  }

  async createMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users = this.buildMany(count, overrides);
    return await getRepository(User).save(users);
  }

  reset(): void {
    this.sequenceId = 0;
  }
}
```

**Deliverables**:
- ✓ FixtureFactory interface
- ✓ UserFixture implementation
- ✓ Basic fixture tests
- ✓ Fixture documentation

---

## 4. Phase 2: Core Test Utilities (Days 4-7)

### 4.1 Objectives
- Implement all fixture factories
- Create comprehensive mock services
- Build test helper utilities
- Add custom Jest matchers

### 4.2 Day 4: Entity Fixtures

#### Tasks

**Avatar Fixture Implementation**
```typescript
// src/common/utils/testing/fixtures/avatar.fixture.ts
export class AvatarFixture implements FixtureFactory<Avatar> {
  private sequenceId = 0;

  build(overrides: Partial<Avatar> = {}): Avatar {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Avatar ${this.sequenceId}`,
      status: overrides.status || 'ready',
      modelUrl: overrides.modelUrl ||
        `https://cdn.example.com/avatars/${uuidv4()}.gltf`,
      thumbnailUrl: overrides.thumbnailUrl ||
        `https://cdn.example.com/thumbnails/${uuidv4()}.jpg`,
      metadata: overrides.metadata || {
        height: 175,
        weight: 70,
        bodyType: 'athletic'
      },
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  buildWithMeasurements(overrides: Partial<Avatar> = {}): Avatar {
    const avatar = this.build(overrides);
    avatar.measurements = {
      id: uuidv4(),
      avatarId: avatar.id,
      height: 175,
      shoulderWidth: 45,
      chestCircumference: 95,
      waistCircumference: 80,
      hipCircumference: 98,
      inseamLength: 80,
      armLength: 65,
      neckCircumference: 38,
      unit: 'metric',
      confidence: 0.92,
      isManual: false
    };
    return avatar;
  }

  // ... other methods
}
```

**Catalog Fixture Implementation**
```typescript
// src/common/utils/testing/fixtures/catalog.fixture.ts
export class CatalogFixture {
  createSilhouette(overrides: Partial<Silhouette> = {}): Silhouette {
    return {
      id: uuidv4(),
      name: 'Test T-Shirt',
      category: 'tops',
      subcategory: 't-shirt',
      modelUrl: 'https://cdn.example.com/models/tshirt.gltf',
      thumbnailUrl: 'https://cdn.example.com/thumbnails/tshirt.jpg',
      fitType: 'regular',
      tags: ['casual', 'summer'],
      metadata: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  createFabric(overrides: Partial<Fabric> = {}): Fabric {
    return {
      id: uuidv4(),
      name: 'Cotton Plain',
      type: 'solid',
      diffuseMapUrl: 'https://cdn.example.com/fabrics/cotton.jpg',
      properties: {
        shine: 0.2,
        stretch: 0.1,
        drape: 'medium'
      },
      colors: ['#FFFFFF', '#000000'],
      tags: ['natural', 'breathable'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }
}
```

**Design Fixture Implementation**
```typescript
// src/common/utils/testing/fixtures/design.fixture.ts
export class DesignFixture implements FixtureFactory<Design> {
  private sequenceId = 0;

  build(overrides: Partial<Design> = {}): Design {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Design ${this.sequenceId}`,
      description: overrides.description || `Test design description`,
      avatarId: overrides.avatarId || uuidv4(),
      layers: overrides.layers || [],
      status: overrides.status || 'draft',
      visibility: overrides.visibility || 'private',
      metadata: overrides.metadata || {},
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  buildWithLayers(layerCount: number = 3, overrides: Partial<Design> = {}): Design {
    const design = this.build(overrides);
    design.layers = Array.from({ length: layerCount }, (_, index) => ({
      id: uuidv4(),
      designId: design.id,
      type: index === 0 ? 'silhouette' : 'fabric',
      order: index,
      data: {
        itemId: uuidv4(),
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: {}
      },
      isVisible: true,
      isLocked: false
    }));
    return design;
  }

  // ... other methods
}
```

**Deliverables**:
- ✓ AvatarFixture with measurements
- ✓ CatalogFixture (silhouettes, fabrics, patterns)
- ✓ DesignFixture with layers
- ✓ Fixture unit tests

### 4.3 Day 5: Mock Services

#### Tasks

**Database Mock**
```typescript
// src/common/utils/testing/mocks/database.mock.ts
export class DatabaseMock {
  private data: Map<string, any[]> = new Map();

  mockRepository<T>(entityName: string) {
    if (!this.data.has(entityName)) {
      this.data.set(entityName, []);
    }

    const store = this.data.get(entityName)!;

    return {
      find: jest.fn(async (options?: any) => {
        // Implementation as shown in architecture doc
      }),
      findOne: jest.fn(async (options: any) => {
        // Implementation
      }),
      save: jest.fn(async (entity: T | T[]) => {
        // Implementation
      }),
      delete: jest.fn(async (criteria: any) => {
        // Implementation
      }),
      // ... other methods
    };
  }

  clear(): void {
    this.data.clear();
  }
}
```

**S3 Mock**
```typescript
// src/common/utils/testing/mocks/s3.mock.ts
export class S3Mock {
  private storage: Map<string, Buffer> = new Map();

  upload = jest.fn((params: AWS.S3.PutObjectRequest) => {
    // Implementation as shown in architecture doc
  });

  getObject = jest.fn((params: AWS.S3.GetObjectRequest) => {
    // Implementation
  });

  deleteObject = jest.fn((params: AWS.S3.DeleteObjectRequest) => {
    // Implementation
  });

  // ... other methods
}
```

**Redis Mock**
```typescript
// src/common/utils/testing/mocks/redis.mock.ts
export class RedisMock {
  private cache: Map<string, { value: string; expiry?: number }> = new Map();

  get = jest.fn(async (key: string): Promise<string | null> => {
    // Implementation
  });

  set = jest.fn(async (key: string, value: string, ...args): Promise<string> => {
    // Implementation
  });

  // ... other methods
}
```

**Queue Mock**
```typescript
// src/common/utils/testing/mocks/queue.mock.ts
export class QueueMock {
  private jobs: Map<string, any[]> = new Map();

  add = jest.fn(async (name: string, data: any, opts?: any) => {
    if (!this.jobs.has(name)) {
      this.jobs.set(name, []);
    }
    const job = { id: uuidv4(), name, data, opts };
    this.jobs.get(name)!.push(job);
    return job;
  });

  process = jest.fn((name: string, handler: Function) => {
    // Mock process implementation
  });

  // ... other methods
}
```

**Deliverables**:
- ✓ DatabaseMock with full CRUD
- ✓ S3Mock for file operations
- ✓ RedisMock for caching
- ✓ QueueMock for background jobs
- ✓ Mock service tests

### 4.4 Day 6: Test Helpers

#### Tasks

**Async Test Helper**
```typescript
// src/common/utils/testing/helpers/async.helper.ts
export class AsyncTestHelper {
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    // Implementation as shown in architecture doc
  }

  static async waitForValue<T>(
    getter: () => T | Promise<T>,
    expectedValue: T,
    timeout: number = 5000
  ): Promise<void> {
    // Implementation
  }

  static async waitForRejection(
    promise: Promise<any>,
    expectedError?: string | RegExp
  ): Promise<Error> {
    // Implementation
  }

  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**HTTP Test Helper**
```typescript
// src/common/utils/testing/helpers/http.helper.ts
export class HttpTestHelper {
  private app: INestApplication;
  private authToken?: string;

  constructor(app: INestApplication) {
    this.app = app;
  }

  async authenticate(credentials: { email: string; password: string }): Promise<string> {
    // Implementation
  }

  async get(url: string, expectedStatus: number = 200) {
    // Implementation
  }

  async post(url: string, data: any, expectedStatus: number = 201) {
    // Implementation
  }

  // ... other HTTP methods
}
```

**Assertion Helper**
```typescript
// src/common/utils/testing/helpers/assertion.helper.ts
export class AssertionHelper {
  static assertValidationError(error: any, field: string, message?: string): void {
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fields).toHaveProperty(field);
    if (message) {
      expect(error.fields[field]).toContain(message);
    }
  }

  static assertDatabaseRecord<T>(
    actual: T,
    expected: Partial<T>,
    excludeFields: string[] = ['createdAt', 'updatedAt']
  ): void {
    const actualFiltered = Object.entries(actual as any)
      .filter(([key]) => !excludeFields.includes(key))
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    expect(actualFiltered).toMatchObject(expected);
  }
}
```

**Deliverables**:
- ✓ AsyncTestHelper with wait functions
- ✓ HttpTestHelper for API testing
- ✓ AssertionHelper for common assertions
- ✓ Helper utility tests

### 4.5 Day 7: Custom Matchers

#### Tasks

**Implement Custom Matchers**
```typescript
// src/common/utils/testing/matchers/custom-matchers.ts
export const customMatchers = {
  toBeUUID(received: any) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`
    };
  },

  toBeRecentDate(received: any, seconds: number = 60) {
    const pass =
      received instanceof Date &&
      Date.now() - received.getTime() < seconds * 1000;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within last ${seconds} seconds`
          : `expected ${received} to be within last ${seconds} seconds`
    };
  },

  toContainObjectMatching(received: any[], expected: Record<string, any>) {
    const pass = Array.isArray(received) && received.some(item =>
      Object.entries(expected).every(([key, value]) => item[key] === value)
    );
    return {
      pass,
      message: () =>
        pass
          ? `expected array not to contain object matching ${JSON.stringify(expected)}`
          : `expected array to contain object matching ${JSON.stringify(expected)}`
    };
  },

  toBeErrorWithCode(received: any, code: string) {
    const pass =
      received instanceof Error &&
      (received as any).code === code;
    return {
      pass,
      message: () =>
        pass
          ? `expected error not to have code ${code}`
          : `expected error to have code ${code}, got ${(received as any)?.code}`
    };
  },

  toMatchSchema(received: any, schema: Record<string, string>) {
    const pass = Object.entries(schema).every(([key, type]) => {
      const value = received[key];
      if (type === 'uuid') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return typeof value === 'string' && uuidRegex.test(value);
      }
      if (type === 'date') {
        return value instanceof Date || !isNaN(Date.parse(value));
      }
      return typeof value === type;
    });
    return {
      pass,
      message: () =>
        pass
          ? `expected object not to match schema`
          : `expected object to match schema ${JSON.stringify(schema)}`
    };
  }
};
```

**Deliverables**:
- ✓ toBeUUID matcher
- ✓ toBeRecentDate matcher
- ✓ toContainObjectMatching matcher
- ✓ toBeErrorWithCode matcher
- ✓ toMatchSchema matcher
- ✓ Matcher tests and documentation

---

## 5. Phase 3: Advanced Testing Features (Days 8-12)

### 5.1 Objectives
- Implement performance profiling
- Add snapshot testing utilities
- Create integration test base classes
- Build end-to-end testing framework

### 5.2 Day 8-9: Performance Profiling

#### Tasks

**Performance Profiler**
```typescript
// src/common/utils/testing/performance/profiler.ts
export class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

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

  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];
    if (measurements.length === 0) return null;

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
}
```

**Load Testing Utility**
```typescript
// src/common/utils/testing/performance/load-test.ts
export class LoadTestRunner {
  async run(config: {
    name: string;
    operation: () => Promise<any>;
    concurrency: number;
    duration: number;
  }): Promise<LoadTestResult> {
    const { name, operation, concurrency, duration } = config;
    const startTime = Date.now();
    const results: number[] = [];
    const errors: Error[] = [];

    const workers = Array.from({ length: concurrency }, async () => {
      while (Date.now() - startTime < duration) {
        const opStart = performance.now();
        try {
          await operation();
          results.push(performance.now() - opStart);
        } catch (error) {
          errors.push(error as Error);
        }
      }
    });

    await Promise.all(workers);

    return {
      name,
      totalRequests: results.length,
      successfulRequests: results.length - errors.length,
      failedRequests: errors.length,
      duration: Date.now() - startTime,
      requestsPerSecond: results.length / (duration / 1000),
      averageLatency: results.reduce((a, b) => a + b, 0) / results.length,
      errors
    };
  }
}
```

**Deliverables**:
- ✓ PerformanceProfiler with stats
- ✓ LoadTestRunner for stress testing
- ✓ Performance benchmarking suite
- ✓ Performance test examples

### 5.3 Day 10: Snapshot Testing

#### Tasks

**Snapshot Manager**
```typescript
// src/common/utils/testing/snapshot/snapshot-manager.ts
export class SnapshotManager {
  static sanitize(data: any, options: {
    uuids?: boolean;
    dates?: boolean;
    tokens?: boolean;
  } = {}): any {
    const { uuids = true, dates = true, tokens = true } = options;
    const sanitized = JSON.parse(JSON.stringify(data));

    const traverse = (obj: any) => {
      if (obj === null || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize UUIDs
        if (uuids && typeof value === 'string' &&
            /^[0-9a-f-]{36}$/i.test(value)) {
          obj[key] = '<UUID>';
        }

        // Sanitize dates
        if (dates && (value instanceof Date ||
            (typeof value === 'string' && !isNaN(Date.parse(value))))) {
          obj[key] = '<DATE>';
        }

        // Sanitize tokens
        if (tokens && typeof value === 'string' && (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('password')
        )) {
          obj[key] = '<REDACTED>';
        }

        // Recurse
        if (typeof value === 'object') {
          traverse(value);
        }
      }
    };

    traverse(sanitized);
    return sanitized;
  }

  static assertMatchesSnapshot(
    actual: any,
    snapshotName: string,
    options?: { uuids?: boolean; dates?: boolean; tokens?: boolean }
  ): void {
    const sanitized = this.sanitize(actual, options);
    expect(sanitized).toMatchSnapshot(snapshotName);
  }
}
```

**Deliverables**:
- ✓ SnapshotManager with sanitization
- ✓ Snapshot testing examples
- ✓ Snapshot update utilities

### 5.4 Day 11-12: Integration Test Base Classes

#### Tasks

**API Test Base Class**
```typescript
// src/common/utils/testing/base/api-test.base.ts
export abstract class ApiTestBase {
  protected app: INestApplication;
  protected httpHelper: HttpTestHelper;
  protected dbManager: TestDatabaseManager;

  async beforeAll(): Promise<void> {
    this.dbManager = new TestDatabaseManager();
    await this.dbManager.setup();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();

    this.httpHelper = new HttpTestHelper(this.app);
  }

  async beforeEach(): Promise<void> {
    await this.dbManager.clear();
  }

  async afterAll(): Promise<void> {
    await this.app.close();
    await this.dbManager.teardown();
  }

  protected async createAuthenticatedUser(
    overrides?: Partial<User>
  ): Promise<{ user: User; token: string }> {
    const userFixture = new UserFixture();
    const user = await userFixture.create(overrides);
    const token = await this.httpHelper.authenticate({
      email: user.email,
      password: 'Test@1234'
    });
    return { user, token };
  }
}
```

**Service Test Base Class**
```typescript
// src/common/utils/testing/base/service-test.base.ts
export abstract class ServiceTestBase {
  protected module: TestingModule;

  async beforeAll(): Promise<void> {
    this.module = await Test.createTestingModule({
      providers: this.getProviders(),
      imports: this.getImports()
    }).compile();
  }

  abstract getProviders(): Provider[];
  abstract getImports(): any[];

  protected getService<T>(serviceClass: Type<T>): T {
    return this.module.get<T>(serviceClass);
  }

  async afterAll(): Promise<void> {
    await this.module.close();
  }
}
```

**Deliverables**:
- ✓ ApiTestBase for API tests
- ✓ ServiceTestBase for service tests
- ✓ RepositoryTestBase for repository tests
- ✓ Base class usage examples

---

## 6. Phase 4: Documentation & Examples (Days 13-15)

### 6.1 Objectives
- Create comprehensive documentation
- Write usage examples
- Document best practices
- Provide migration guide

### 6.2 Day 13: API Documentation

#### Tasks

**Generate API Documentation**
- Document all fixture factories
- Document all mock services
- Document all test helpers
- Document custom matchers
- Document base classes

**Create JSDoc Comments**
```typescript
/**
 * User fixture factory for generating test users
 *
 * @example
 * ```typescript
 * const userFixture = new UserFixture();
 *
 * // Build user without saving
 * const user = userFixture.build({ email: 'test@example.com' });
 *
 * // Create and save user to database
 * const savedUser = await userFixture.create({ role: 'admin' });
 *
 * // Create multiple users
 * const users = await userFixture.createMany(5);
 * ```
 */
export class UserFixture implements FixtureFactory<User> {
  // ...
}
```

**Deliverables**:
- ✓ Complete API documentation
- ✓ JSDoc comments for all utilities
- ✓ Type definitions documentation

### 6.3 Day 14: Usage Examples

#### Tasks

**Create Example Tests**

**Unit Test Example**
```typescript
// examples/unit-test.example.spec.ts
describe('UserService', () => {
  let service: UserService;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const dbMock = new DatabaseMock();
    userRepository = dbMock.mockRepository('User');

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should create a user', async () => {
    const userFixture = new UserFixture();
    const userData = userFixture.build();

    const result = await service.create(userData);

    expect(result).toMatchObject(userData);
    expect(userRepository.save).toHaveBeenCalledWith(userData);
  });
});
```

**Integration Test Example**
```typescript
// examples/integration-test.example.spec.ts
describe('User API (Integration)', () => {
  let testHelper: ApiTestBase;

  beforeAll(async () => {
    testHelper = new class extends ApiTestBase {}();
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

    expect(response.body).toMatchSchema({
      id: 'uuid',
      email: 'string',
      firstName: 'string',
      lastName: 'string',
      createdAt: 'date'
    });
  });
});
```

**Performance Test Example**
```typescript
// examples/performance-test.example.spec.ts
describe('Avatar Processing Performance', () => {
  let profiler: PerformanceProfiler;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
  });

  it('should process avatar within performance budget', async () => {
    const avatarService = getService(AvatarService);

    // Run operation 10 times
    for (let i = 0; i < 10; i++) {
      await profiler.measure('avatar-processing', async () => {
        await avatarService.processAvatar(testPhotoUrl);
      });
    }

    // Assert performance requirement
    profiler.assertPerformance('avatar-processing', 2000); // 2 seconds max

    // Log report
    console.log(profiler.generateReport());
  });
});
```

**Deliverables**:
- ✓ Unit test examples
- ✓ Integration test examples
- ✓ E2E test examples
- ✓ Performance test examples
- ✓ Snapshot test examples

### 6.4 Day 15: Best Practices & Migration

#### Tasks

**Create Testing Best Practices Guide**
```markdown
# Testing Best Practices

## 1. Test Organization
- Keep unit tests next to source files (`*.spec.ts`)
- Keep integration tests in `/test/integration`
- Keep E2E tests in `/test/e2e`

## 2. Fixture Usage
- Use fixtures for all test data generation
- Reset fixtures between tests
- Prefer `build()` for unit tests
- Use `create()` for integration tests

## 3. Mock Usage
- Mock external dependencies (S3, Redis, etc.)
- Use real database for integration tests
- Mock at service boundaries

## 4. Performance Testing
- Test critical paths with profiler
- Set performance budgets
- Monitor regression

## 5. Code Coverage
- Aim for >80% coverage
- Focus on business logic
- Ignore DTOs and entities
```

**Create Migration Guide**
```markdown
# Migration Guide: Adopting Testing Utilities

## Step 1: Install Dependencies
```bash
npm install --save-dev @nestjs/testing supertest
```

## Step 2: Update Jest Config
Update `jest.config.js` with the new configuration...

## Step 3: Convert Existing Tests
Before:
```typescript
test('create user', async () => {
  const user = { email: 'test@example.com', ... };
  // ...
});
```

After:
```typescript
test('create user', async () => {
  const userFixture = new UserFixture();
  const user = userFixture.build();
  // ...
});
```

## Step 4: Add Custom Matchers
Add to `test/setup.ts`:
```typescript
import { customMatchers } from '@/common/utils/testing/matchers';
expect.extend(customMatchers);
```
```

**Deliverables**:
- ✓ Best practices guide
- ✓ Migration guide
- ✓ Troubleshooting guide
- ✓ FAQ document

---

## 7. Testing Strategy

### 7.1 Unit Tests (>90% coverage required)

**Coverage Areas**:
- Fixture factories
- Mock services
- Test helpers
- Custom matchers
- Performance profiler
- Snapshot manager

### 7.2 Integration Tests

**Test Scenarios**:
- Database mock CRUD operations
- S3 mock file operations
- Redis mock caching
- Queue mock job processing
- HTTP test helper authentication
- Test database setup/teardown

### 7.3 Usage Tests

**Validation**:
- Fixture usage in real tests
- Mock usage in service tests
- Helper usage in API tests
- Base class inheritance

---

## 8. Success Criteria

### 8.1 Functional Requirements

- [ ] All fixture factories implemented and tested
- [ ] All mock services working correctly
- [ ] All test helpers functional
- [ ] Custom matchers registered and working
- [ ] Base classes support inheritance
- [ ] Performance profiling accurate
- [ ] Snapshot testing working

### 8.2 Quality Requirements

- [ ] >90% test coverage for utilities
- [ ] All public APIs documented
- [ ] Usage examples provided
- [ ] Best practices documented
- [ ] Migration guide complete

### 8.3 Performance Requirements

- [ ] Fixture generation <10ms per object
- [ ] Mock operations <1ms
- [ ] Test setup <2 seconds
- [ ] Performance profiler overhead <5%

---

## 9. Dependencies & Prerequisites

### 9.1 Technical Dependencies

```json
{
  "devDependencies": {
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@faker-js/faker": "^8.0.0"
  }
}
```

### 9.2 Infrastructure Requirements

- PostgreSQL test database
- Redis test instance
- Docker Compose for test services
- CI/CD pipeline integration

---

## 10. Risks & Mitigation

### 10.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Test database setup complexity | High | Medium | Use Docker Compose for standardization |
| Mock services diverge from real services | High | Medium | Regular sync with real implementations |
| Performance overhead in tests | Medium | Low | Optimize fixture generation |
| Flaky tests | High | Medium | Use proper async helpers and timeouts |

### 10.2 Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underestimated complexity | Medium | Add 2-day buffer |
| Integration issues | Medium | Early integration testing |
| Documentation delays | Low | Write docs alongside code |

---

## 11. Deliverables Summary

### 11.1 Code Deliverables

- ✓ Fixture factories (User, Avatar, Catalog, Design)
- ✓ Mock services (Database, S3, Redis, Queue)
- ✓ Test helpers (Async, HTTP, Assertion)
- ✓ Custom matchers (5+ matchers)
- ✓ Performance profiler
- ✓ Snapshot manager
- ✓ Base test classes
- ✓ Test database manager

### 11.2 Documentation Deliverables

- ✓ API documentation
- ✓ Usage examples
- ✓ Best practices guide
- ✓ Migration guide
- ✓ Troubleshooting guide

### 11.3 Testing Deliverables

- ✓ Unit tests for all utilities
- ✓ Integration tests
- ✓ Example test suites
- ✓ Performance benchmarks

---

## 12. Timeline Summary

```
Week 1 (Days 1-5):
├── Day 1: Test infrastructure setup
├── Day 2: Test database setup
├── Day 3: Basic fixture framework
├── Day 4: Entity fixtures
└── Day 5: Mock services

Week 2 (Days 6-10):
├── Day 6: Test helpers
├── Day 7: Custom matchers
├── Day 8-9: Performance profiling
└── Day 10: Snapshot testing

Week 3 (Days 11-15):
├── Day 11-12: Integration test base classes
├── Day 13: API documentation
├── Day 14: Usage examples
└── Day 15: Best practices & migration

Buffer: 2 days for unexpected issues
```

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Estimated Effort**: 15-17 days
**Team Size**: 2-3 developers
**Review Cycle**: Weekly
**Next Review**: December 2025

---

**End of Implementation Plan**
