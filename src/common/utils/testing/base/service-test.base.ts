import { Test, TestingModule } from '@nestjs/testing';
import { Provider, Type } from '@nestjs/common';
import { DatabaseMock } from '../mocks/database.mock';
import { S3Mock } from '../mocks/s3.mock';
import { RedisMock } from '../mocks/redis.mock';
import { QueueMock } from '../mocks/queue.mock';

/**
 * Base class for service unit tests
 *
 * Provides common setup and teardown for testing services in isolation
 * Includes mock utilities for dependencies
 *
 * @example
 * ```typescript
 * class UserServiceTest extends ServiceTestBase {
 *   getProviders(): Provider[] {
 *     return [
 *       UserService,
 *       { provide: getRepositoryToken(User), useValue: this.dbMock.mockRepository('User') }
 *     ];
 *   }
 *
 *   getImports(): any[] {
 *     return [];
 *   }
 * }
 *
 * describe('UserService', () => {
 *   let testHelper: UserServiceTest;
 *   let userService: UserService;
 *
 *   beforeAll(async () => {
 *     testHelper = new UserServiceTest();
 *     await testHelper.beforeAll();
 *     userService = testHelper.getService(UserService);
 *   });
 *
 *   afterAll(async () => {
 *     await testHelper.afterAll();
 *   });
 *
 *   it('should create user', async () => {
 *     const result = await userService.create(userData);
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */
export abstract class ServiceTestBase {
  protected module: TestingModule;
  protected dbMock: DatabaseMock;
  protected s3Mock: S3Mock;
  protected redisMock: RedisMock;
  protected queueMock: QueueMock;

  /**
   * Setup test module
   */
  async beforeAll(): Promise<void> {
    // Initialize mocks
    this.dbMock = new DatabaseMock();
    this.s3Mock = new S3Mock();
    this.redisMock = new RedisMock();
    this.queueMock = new QueueMock();

    // Create testing module
    this.module = await Test.createTestingModule({
      providers: this.getProviders(),
      imports: this.getImports()
    })
      .overrideProvider('DatabaseConnection')
      .useValue(this.dbMock)
      .compile();

    // Allow subclasses to perform additional setup
    await this.setup();
  }

  /**
   * Get providers for the testing module
   * Must be implemented by subclasses
   */
  abstract getProviders(): Provider[];

  /**
   * Get imports for the testing module
   * Must be implemented by subclasses
   */
  abstract getImports(): any[];

  /**
   * Additional setup after module creation
   * Can be overridden by subclasses
   */
  protected async setup(): Promise<void> {
    // Can be overridden
  }

  /**
   * Setup before each test
   */
  async beforeEach(): Promise<void> {
    // Clear mocks
    this.dbMock.clear();
    this.s3Mock.clear();
    this.redisMock.clear();
    this.queueMock.clear();

    // Clear jest mocks
    jest.clearAllMocks();
  }

  /**
   * Cleanup after each test
   */
  async afterEach(): Promise<void> {
    // Can be overridden
  }

  /**
   * Teardown test module
   */
  async afterAll(): Promise<void> {
    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Get a service from the testing module
   */
  protected getService<T>(serviceClass: Type<T>): T {
    return this.module.get<T>(serviceClass);
  }

  /**
   * Get a provider from the testing module
   */
  protected getProvider<T>(token: any): T {
    return this.module.get<T>(token);
  }

  /**
   * Create a mock repository for an entity
   */
  protected createMockRepository<T>(entityName: string) {
    return this.dbMock.mockRepository<T>(entityName);
  }

  /**
   * Get database mock
   */
  protected getDbMock(): DatabaseMock {
    return this.dbMock;
  }

  /**
   * Get S3 mock
   */
  protected getS3Mock(): S3Mock {
    return this.s3Mock;
  }

  /**
   * Get Redis mock
   */
  protected getRedisMock(): RedisMock {
    return this.redisMock;
  }

  /**
   * Get Queue mock
   */
  protected getQueueMock(): QueueMock {
    return this.queueMock;
  }
}
