import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TestDatabaseManager } from '../setup/test-database';
import { HttpTestHelper } from '../helpers/http.helper';
import { UserFixture, User } from '../fixtures/user.fixture';

/**
 * Base class for API integration tests
 *
 * Provides common setup and teardown for testing API endpoints
 * Includes database management, app initialization, and HTTP helpers
 *
 * @example
 * ```typescript
 * class UserApiTest extends ApiTestBase {
 *   async setup() {
 *     await super.setup();
 *     // Additional setup
 *   }
 * }
 *
 * describe('User API', () => {
 *   let testHelper: UserApiTest;
 *
 *   beforeAll(async () => {
 *     testHelper = new UserApiTest();
 *     await testHelper.beforeAll();
 *   });
 *
 *   afterAll(async () => {
 *     await testHelper.afterAll();
 *   });
 *
 *   it('should create user', async () => {
 *     const response = await testHelper.httpHelper.post('/users', userData);
 *     expect(response.status).toBe(201);
 *   });
 * });
 * ```
 */
export abstract class ApiTestBase {
  protected app: INestApplication;
  protected httpHelper: HttpTestHelper;
  protected dbManager: TestDatabaseManager;
  protected moduleFixture: TestingModule;

  /**
   * Setup test environment
   * Override this to customize module imports or providers
   */
  async beforeAll(): Promise<void> {
    // Setup database
    this.dbManager = new TestDatabaseManager();
    await this.dbManager.setup();

    // Create testing module
    const imports = this.getImports();
    const providers = this.getProviders();

    const moduleBuilder = Test.createTestingModule({
      imports,
      providers
    });

    // Allow subclasses to modify the module
    this.configureModule(moduleBuilder);

    this.moduleFixture = await moduleBuilder.compile();

    // Create NestJS application
    this.app = this.moduleFixture.createNestApplication();

    // Configure application (pipes, filters, etc.)
    this.configureApp(this.app);

    await this.app.init();

    // Create HTTP helper
    this.httpHelper = new HttpTestHelper(this.app);
  }

  /**
   * Get module imports
   * Override to specify modules to import
   */
  protected getImports(): any[] {
    return [];
  }

  /**
   * Get module providers
   * Override to specify additional providers
   */
  protected getProviders(): any[] {
    return [];
  }

  /**
   * Configure the testing module
   * Override to customize module configuration
   */
  protected configureModule(moduleBuilder: any): void {
    // Can be overridden by subclasses
  }

  /**
   * Configure the NestJS application
   * Override to add pipes, filters, interceptors, etc.
   */
  protected configureApp(app: INestApplication): void {
    // Can be overridden by subclasses
    // Example: app.useGlobalPipes(new ValidationPipe());
  }

  /**
   * Clear database before each test
   */
  async beforeEach(): Promise<void> {
    await this.dbManager.clear();
  }

  /**
   * Cleanup after each test (optional)
   */
  async afterEach(): Promise<void> {
    // Can be overridden by subclasses
  }

  /**
   * Teardown test environment
   */
  async afterAll(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
    if (this.dbManager) {
      await this.dbManager.teardown();
    }
  }

  /**
   * Create an authenticated user and return user with token
   */
  protected async createAuthenticatedUser(
    overrides?: Partial<User>
  ): Promise<{ user: User; token: string }> {
    const userFixture = new UserFixture(this.dbManager.getDataSource());
    const user = await userFixture.create(overrides);

    const token = await this.httpHelper.authenticate({
      email: user.email,
      password: overrides?.password || 'Test@1234'
    });

    return { user, token };
  }

  /**
   * Create multiple authenticated users
   */
  protected async createAuthenticatedUsers(
    count: number,
    overrides?: Partial<User>
  ): Promise<Array<{ user: User; token: string }>> {
    const users: Array<{ user: User; token: string }> = [];

    for (let i = 0; i < count; i++) {
      const result = await this.createAuthenticatedUser(overrides);
      users.push(result);
    }

    return users;
  }

  /**
   * Get a service from the testing module
   */
  protected getService<T>(serviceClass: any): T {
    return this.moduleFixture.get<T>(serviceClass);
  }

  /**
   * Seed database with fixture data
   */
  protected async seedDatabase(fixtures: Record<string, any[]>): Promise<void> {
    await this.dbManager.seed(fixtures);
  }
}
