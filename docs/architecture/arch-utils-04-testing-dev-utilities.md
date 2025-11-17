# Architecture Document: Testing and Development Utilities

## Document Overview

**Version**: 1.0
**Last Updated**: November 2025
**Document Type**: Architecture Document
**Status**: Draft
**Arch ID**: arch-utils-04
**Related Spec**: spec-utils-04

---

## 1. Executive Summary

This architecture document describes the implementation of testing and development utilities for the Fashion Wallet backend. These utilities provide comprehensive support for unit testing, integration testing, test data generation, mocking, debugging, and development workflow optimization.

---

## 2. Architectural Overview

### 2.1 Utility Organization

```
src/common/utils/testing/
├── fixtures/
│   ├── user.fixture.ts
│   ├── avatar.fixture.ts
│   ├── catalog.fixture.ts
│   └── design.fixture.ts
├── mocks/
│   ├── database.mock.ts
│   ├── s3.mock.ts
│   ├── redis.mock.ts
│   └── queue.mock.ts
├── factories/
│   ├── entity.factory.ts
│   ├── dto.factory.ts
│   └── model.factory.ts
├── helpers/
│   ├── test.helper.ts
│   ├── assertion.helper.ts
│   └── async.helper.ts
├── matchers/
│   └── custom-matchers.ts
├── setup/
│   ├── test-setup.ts
│   ├── test-teardown.ts
│   └── test-database.ts
└── index.ts
```

---

## 3. Test Fixtures Architecture

### 3.1 Fixture Factory Pattern

```typescript
/**
 * Base fixture factory interface
 */
export interface FixtureFactory<T> {
  build(overrides?: Partial<T>): T;
  buildMany(count: number, overrides?: Partial<T>): T[];
  create(overrides?: Partial<T>): Promise<T>;
  createMany(count: number, overrides?: Partial<T>): Promise<T[]>;
}

/**
 * User fixture factory implementation
 */
export class UserFixture implements FixtureFactory<User> {
  private sequenceId = 0;

  /**
   * Build user object (in-memory only)
   */
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

  /**
   * Build multiple user objects
   */
  buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist user to database
   */
  async create(overrides: Partial<User> = {}): Promise<User> {
    const user = this.build(overrides);
    return await getRepository(User).save(user);
  }

  /**
   * Create and persist multiple users
   */
  async createMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users = this.buildMany(count, overrides);
    return await getRepository(User).save(users);
  }

  /**
   * Reset sequence for consistent testing
   */
  reset(): void {
    this.sequenceId = 0;
  }
}
```

### 3.2 Avatar Fixture Factory

```typescript
/**
 * Avatar fixture factory
 */
export class AvatarFixture implements FixtureFactory<Avatar> {
  private sequenceId = 0;

  build(overrides: Partial<Avatar> = {}): Avatar {
    this.sequenceId++;

    return {
      id: overrides.id || uuidv4(),
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Avatar ${this.sequenceId}`,
      status: overrides.status || 'ready',
      modelUrl: overrides.modelUrl || `https://cdn.example.com/avatars/${uuidv4()}.gltf`,
      thumbnailUrl: overrides.thumbnailUrl || `https://cdn.example.com/thumbnails/${uuidv4()}.jpg`,
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

  buildMany(count: number, overrides: Partial<Avatar> = {}): Avatar[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  async create(overrides: Partial<Avatar> = {}): Promise<Avatar> {
    const avatar = this.build(overrides);
    return await getRepository(Avatar).save(avatar);
  }

  async createMany(count: number, overrides: Partial<Avatar> = {}): Promise<Avatar[]> {
    const avatars = this.buildMany(count, overrides);
    return await getRepository(Avatar).save(avatars);
  }

  /**
   * Build avatar with measurements
   */
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

  reset(): void {
    this.sequenceId = 0;
  }
}
```

### 3.3 Design Fixture Factory

```typescript
/**
 * Design fixture factory with layer support
 */
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

  buildMany(count: number, overrides: Partial<Design> = {}): Design[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  async create(overrides: Partial<Design> = {}): Promise<Design> {
    const design = this.build(overrides);
    return await getRepository(Design).save(design);
  }

  async createMany(count: number, overrides: Partial<Design> = {}): Promise<Design[]> {
    const designs = this.buildMany(count, overrides);
    return await getRepository(Design).save(designs);
  }

  /**
   * Build design with layers
   */
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

  reset(): void {
    this.sequenceId = 0;
  }
}
```

---

## 4. Mock Services Architecture

### 4.1 Database Mock

```typescript
/**
 * Database mock for testing without actual database
 */
export class DatabaseMock {
  private data: Map<string, any[]> = new Map();

  /**
   * Mock repository
   */
  mockRepository<T>(entityName: string) {
    if (!this.data.has(entityName)) {
      this.data.set(entityName, []);
    }

    const store = this.data.get(entityName)!;

    return {
      find: jest.fn(async (options?: any) => {
        let results = [...store];

        if (options?.where) {
          results = results.filter(item =>
            Object.entries(options.where).every(([key, value]) => item[key] === value)
          );
        }

        if (options?.take) {
          results = results.slice(0, options.take);
        }

        return results;
      }),

      findOne: jest.fn(async (options: any) => {
        if (typeof options === 'string') {
          return store.find(item => item.id === options) || null;
        }

        if (options.where) {
          return store.find(item =>
            Object.entries(options.where).every(([key, value]) => item[key] === value)
          ) || null;
        }

        return null;
      }),

      save: jest.fn(async (entity: T | T[]) => {
        const entities = Array.isArray(entity) ? entity : [entity];

        entities.forEach(e => {
          const existing = store.findIndex(item => item.id === (e as any).id);
          if (existing >= 0) {
            store[existing] = e;
          } else {
            store.push(e);
          }
        });

        return Array.isArray(entity) ? entities : entities[0];
      }),

      delete: jest.fn(async (criteria: any) => {
        const index = store.findIndex(item => item.id === criteria);
        if (index >= 0) {
          store.splice(index, 1);
          return { affected: 1 };
        }
        return { affected: 0 };
      }),

      count: jest.fn(async (options?: any) => {
        if (!options?.where) {
          return store.length;
        }

        return store.filter(item =>
          Object.entries(options.where).every(([key, value]) => item[key] === value)
        ).length;
      }),

      clear: jest.fn(async () => {
        store.length = 0;
      })
    };
  }

  /**
   * Clear all mock data
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get data for entity
   */
  getData<T>(entityName: string): T[] {
    return this.data.get(entityName) || [];
  }

  /**
   * Seed data for entity
   */
  seed<T>(entityName: string, data: T[]): void {
    this.data.set(entityName, data);
  }
}
```

### 4.2 S3 Mock

```typescript
/**
 * S3 service mock for testing file operations
 */
export class S3Mock {
  private storage: Map<string, Buffer> = new Map();

  /**
   * Mock upload operation
   */
  upload = jest.fn((params: AWS.S3.PutObjectRequest) => {
    const key = `${params.Bucket}/${params.Key}`;
    this.storage.set(key, params.Body as Buffer);

    return {
      promise: jest.fn(async () => ({
        Location: `https://s3.amazonaws.com/${params.Bucket}/${params.Key}`,
        ETag: '"mock-etag"',
        Bucket: params.Bucket,
        Key: params.Key
      }))
    };
  });

  /**
   * Mock getObject operation
   */
  getObject = jest.fn((params: AWS.S3.GetObjectRequest) => {
    const key = `${params.Bucket}/${params.Key}`;
    const body = this.storage.get(key);

    if (!body) {
      return {
        promise: jest.fn(async () => {
          throw new Error('NoSuchKey: The specified key does not exist.');
        })
      };
    }

    return {
      promise: jest.fn(async () => ({
        Body: body,
        ContentType: 'application/octet-stream',
        ContentLength: body.length
      }))
    };
  });

  /**
   * Mock deleteObject operation
   */
  deleteObject = jest.fn((params: AWS.S3.DeleteObjectRequest) => {
    const key = `${params.Bucket}/${params.Key}`;
    this.storage.delete(key);

    return {
      promise: jest.fn(async () => ({}))
    };
  });

  /**
   * Mock listObjects operation
   */
  listObjects = jest.fn((params: AWS.S3.ListObjectsRequest) => {
    const prefix = params.Prefix || '';
    const bucketPrefix = `${params.Bucket}/`;

    const objects = Array.from(this.storage.keys())
      .filter(key => key.startsWith(bucketPrefix + prefix))
      .map(key => ({
        Key: key.replace(bucketPrefix, ''),
        Size: this.storage.get(key)!.length,
        LastModified: new Date()
      }));

    return {
      promise: jest.fn(async () => ({
        Contents: objects
      }))
    };
  });

  /**
   * Get signed URL (mock)
   */
  getSignedUrl = jest.fn((operation: string, params: any) => {
    return `https://s3.amazonaws.com/${params.Bucket}/${params.Key}?signature=mock-signature`;
  });

  /**
   * Clear all storage
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Get stored file
   */
  getFile(bucket: string, key: string): Buffer | undefined {
    return this.storage.get(`${bucket}/${key}`);
  }
}
```

### 4.3 Redis Mock

```typescript
/**
 * Redis mock for caching tests
 */
export class RedisMock {
  private cache: Map<string, { value: string; expiry?: number }> = new Map();

  /**
   * Mock get operation
   */
  get = jest.fn(async (key: string): Promise<string | null> => {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  });

  /**
   * Mock set operation
   */
  set = jest.fn(async (
    key: string,
    value: string,
    mode?: string,
    duration?: number
  ): Promise<string> => {
    const expiry = mode === 'EX' && duration
      ? Date.now() + duration * 1000
      : undefined;

    this.cache.set(key, { value, expiry });
    return 'OK';
  });

  /**
   * Mock setex operation
   */
  setex = jest.fn(async (key: string, seconds: number, value: string): Promise<string> => {
    return this.set(key, value, 'EX', seconds);
  });

  /**
   * Mock del operation
   */
  del = jest.fn(async (...keys: string[]): Promise<number> => {
    let deleted = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        deleted++;
      }
    });
    return deleted;
  });

  /**
   * Mock exists operation
   */
  exists = jest.fn(async (key: string): Promise<number> => {
    return this.cache.has(key) ? 1 : 0;
  });

  /**
   * Mock ttl operation
   */
  ttl = jest.fn(async (key: string): Promise<number> => {
    const entry = this.cache.get(key);

    if (!entry) {
      return -2; // Key doesn't exist
    }

    if (!entry.expiry) {
      return -1; // No expiry set
    }

    const remaining = Math.floor((entry.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  });

  /**
   * Mock incr operation
   */
  incr = jest.fn(async (key: string): Promise<number> => {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    await this.set(key, newValue);
    return parseInt(newValue, 10);
  });

  /**
   * Mock hset operation
   */
  hset = jest.fn(async (key: string, field: string, value: string): Promise<number> => {
    const hashKey = `hash:${key}`;
    const hash = this.cache.get(hashKey);

    if (hash) {
      const hashData = JSON.parse(hash.value);
      const isNew = !hashData[field];
      hashData[field] = value;
      this.cache.set(hashKey, { value: JSON.stringify(hashData) });
      return isNew ? 1 : 0;
    } else {
      const hashData = { [field]: value };
      this.cache.set(hashKey, { value: JSON.stringify(hashData) });
      return 1;
    }
  });

  /**
   * Mock hget operation
   */
  hget = jest.fn(async (key: string, field: string): Promise<string | null> => {
    const hashKey = `hash:${key}`;
    const hash = this.cache.get(hashKey);

    if (!hash) {
      return null;
    }

    const hashData = JSON.parse(hash.value);
    return hashData[field] || null;
  });

  /**
   * Clear all cache
   */
  flushall = jest.fn(async (): Promise<string> => {
    this.cache.clear();
    return 'OK';
  });

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}
```

---

## 5. Test Helpers Architecture

### 5.1 Async Test Helpers

```typescript
/**
 * Async test helpers
 */
export class AsyncTestHelper {
  /**
   * Wait for condition to be true
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (!(await condition())) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Condition not met within ${timeout}ms`);
      }
      await this.sleep(interval);
    }
  }

  /**
   * Wait for value to change
   */
  static async waitForValue<T>(
    getter: () => T | Promise<T>,
    expectedValue: T,
    timeout: number = 5000
  ): Promise<void> {
    await this.waitForCondition(
      async () => (await getter()) === expectedValue,
      timeout
    );
  }

  /**
   * Wait for promise to reject
   */
  static async waitForRejection(
    promise: Promise<any>,
    expectedError?: string | RegExp
  ): Promise<Error> {
    try {
      await promise;
      throw new Error('Promise did not reject as expected');
    } catch (error) {
      if (expectedError) {
        const message = (error as Error).message;
        if (typeof expectedError === 'string') {
          expect(message).toContain(expectedError);
        } else {
          expect(message).toMatch(expectedError);
        }
      }
      return error as Error;
    }
  }

  /**
   * Sleep utility
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry async operation
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }
}
```

### 5.2 HTTP Test Helpers

```typescript
/**
 * HTTP test helpers for API testing
 */
export class HttpTestHelper {
  private app: INestApplication;
  private authToken?: string;

  constructor(app: INestApplication) {
    this.app = app;
  }

  /**
   * Authenticate and store token
   */
  async authenticate(credentials: { email: string; password: string }): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    this.authToken = response.body.accessToken;
    return this.authToken;
  }

  /**
   * Make authenticated GET request
   */
  async get(url: string, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer()).get(url);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make authenticated POST request
   */
  async post(url: string, data: any, expectedStatus: number = 201) {
    const req = request(this.app.getHttpServer())
      .post(url)
      .send(data);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make authenticated PUT request
   */
  async put(url: string, data: any, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer())
      .put(url)
      .send(data);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Make authenticated DELETE request
   */
  async delete(url: string, expectedStatus: number = 200) {
    const req = request(this.app.getHttpServer()).delete(url);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Upload file
   */
  async uploadFile(
    url: string,
    fieldName: string,
    filePath: string,
    expectedStatus: number = 201
  ) {
    const req = request(this.app.getHttpServer())
      .post(url)
      .attach(fieldName, filePath);

    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }

    return req.expect(expectedStatus);
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    this.authToken = undefined;
  }
}
```

---

## 6. Custom Matchers

### 6.1 Jest Custom Matchers

```typescript
/**
 * Custom Jest matchers for better assertions
 */
export const customMatchers = {
  /**
   * Check if value is a valid UUID
   */
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

  /**
   * Check if date is recent (within last N seconds)
   */
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

  /**
   * Check if array contains object with properties
   */
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

  /**
   * Check if error has specific properties
   */
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

  /**
   * Check if object matches schema
   */
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

---

## 7. Test Database Setup

### 7.1 Test Database Manager

```typescript
/**
 * Test database manager for integration tests
 */
export class TestDatabaseManager {
  private connection: Connection;

  /**
   * Setup test database
   */
  async setup(): Promise<Connection> {
    this.connection = await createConnection({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'fashion_wallet_test',
      entities: [__dirname + '/../**/*.entity.ts'],
      synchronize: true,
      dropSchema: true,
      logging: false
    });

    return this.connection;
  }

  /**
   * Seed database with test data
   */
  async seed(fixtures: Record<string, any[]>): Promise<void> {
    for (const [entityName, data] of Object.entries(fixtures)) {
      const repository = this.connection.getRepository(entityName);
      await repository.save(data);
    }
  }

  /**
   * Clear all tables
   */
  async clear(): Promise<void> {
    const entities = this.connection.entityMetadatas;

    for (const entity of entities) {
      const repository = this.connection.getRepository(entity.name);
      await repository.clear();
    }
  }

  /**
   * Reset database to clean state
   */
  async reset(): Promise<void> {
    await this.connection.synchronize(true);
  }

  /**
   * Teardown and close connection
   */
  async teardown(): Promise<void> {
    if (this.connection?.isConnected) {
      await this.connection.close();
    }
  }

  /**
   * Get repository for testing
   */
  getRepository<T>(entity: any): Repository<T> {
    return this.connection.getRepository(entity);
  }
}
```

---

## 8. Performance Testing Utilities

### 8.1 Performance Profiler

```typescript
/**
 * Performance profiling utilities
 */
export class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Measure execution time
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
   * Get statistics for measurement
   */
  getStats(name: string) {
    const measurements = this.measurements.get(name) || [];

    if (measurements.length === 0) {
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
   * Assert performance requirement
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
   * Reset all measurements
   */
  reset(): void {
    this.measurements.clear();
  }

  /**
   * Generate performance report
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
}
```

---

## 9. Snapshot Testing Utilities

### 9.1 Snapshot Manager

```typescript
/**
 * Snapshot testing utilities for API responses
 */
export class SnapshotManager {
  /**
   * Sanitize dynamic values for snapshots
   */
  static sanitize(data: any, options: {
    uuids?: boolean;
    dates?: boolean;
    tokens?: boolean;
  } = {}): any {
    const {
      uuids = true,
      dates = true,
      tokens = true
    } = options;

    const sanitized = JSON.parse(JSON.stringify(data));

    const traverse = (obj: any) => {
      if (obj === null || typeof obj !== 'object') {
        return;
      }

      if (Array.isArray(obj)) {
        obj.forEach(traverse);
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize UUIDs
        if (uuids && typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)) {
          obj[key] = '<UUID>';
        }

        // Sanitize dates
        if (dates && (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value))))) {
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

  /**
   * Compare with snapshot
   */
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

---

## 10. Integration Test Base Classes

### 10.1 API Test Base Class

```typescript
/**
 * Base class for API integration tests
 */
export abstract class ApiTestBase {
  protected app: INestApplication;
  protected httpHelper: HttpTestHelper;
  protected dbManager: TestDatabaseManager;

  /**
   * Setup before all tests
   */
  async beforeAll(): Promise<void> {
    // Setup test database
    this.dbManager = new TestDatabaseManager();
    await this.dbManager.setup();

    // Create test app
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();

    // Create HTTP helper
    this.httpHelper = new HttpTestHelper(this.app);
  }

  /**
   * Setup before each test
   */
  async beforeEach(): Promise<void> {
    await this.dbManager.clear();
  }

  /**
   * Teardown after all tests
   */
  async afterAll(): Promise<void> {
    await this.app.close();
    await this.dbManager.teardown();
  }

  /**
   * Create and authenticate test user
   */
  protected async createAuthenticatedUser(overrides?: Partial<User>): Promise<{
    user: User;
    token: string;
  }> {
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

---

## Document Metadata

**Version**: 1.0
**Author**: Fashion Wallet Engineering Team
**Status**: Draft
**Review Cycle**: Bi-weekly
**Next Review**: December 2025
**Dependencies**: arch-utils-00-core-utilities

---

**End of Testing and Development Utilities Architecture Document**
