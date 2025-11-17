/**
 * Integration Test Example
 *
 * Demonstrates how to write API integration tests using:
 * - ApiTestBase for test infrastructure
 * - HttpTestHelper for making API requests
 * - TestDatabaseManager for database operations
 * - Fixtures for test data
 */

import { ApiTestBase, UserFixture, AvatarFixture } from '@/common/utils/testing';
import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';

class UserApiIntegrationTest extends ApiTestBase {
  protected getImports() {
    return [AppModule];
  }

  protected getProviders() {
    return [];
  }

  protected configureApp(app: INestApplication) {
    // Add any global pipes, filters, interceptors here
    // app.useGlobalPipes(new ValidationPipe());
  }
}

describe('User API (Integration)', () => {
  let testHelper: UserApiIntegrationTest;
  let userFixture: UserFixture;

  beforeAll(async () => {
    testHelper = new UserApiIntegrationTest();
    await testHelper.beforeAll();
    userFixture = new UserFixture(testHelper.dbManager.getDataSource());
  });

  afterAll(async () => {
    await testHelper.afterAll();
  });

  beforeEach(async () => {
    await testHelper.beforeEach(); // Clears database
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await testHelper.httpHelper.post('/auth/register', {
        email: 'newuser@example.com',
        password: 'Test@1234',
        firstName: 'New',
        lastName: 'User'
      }, 201);

      expect(response.status).toBe(201);
      expect(response.body).toMatchSchema({
        id: 'uuid',
        email: 'string',
        firstName: 'string',
        lastName: 'string',
        createdAt: 'date'
      });
      expect(response.body.email).toBe('newuser@example.com');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject invalid email', async () => {
      const response = await testHelper.httpHelper.post('/auth/register', {
        email: 'invalid-email',
        password: 'Test@1234',
        firstName: 'Test',
        lastName: 'User'
      }, 400);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });

    it('should reject weak password', async () => {
      const response = await testHelper.httpHelper.post('/auth/register', {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      }, 400);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('password');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a user first
      const user = await userFixture.create({
        email: 'test@example.com',
        passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
      });

      const response = await testHelper.httpHelper.post('/auth/login', {
        email: 'test@example.com',
        password: 'Test@1234'
      }, 200);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const response = await testHelper.httpHelper.post('/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      }, 401);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      // Create and authenticate user
      const { user, token } = await testHelper.createAuthenticatedUser({
        email: 'test@example.com',
        firstName: 'Test'
      });

      const response = await testHelper.httpHelper.get('/users/me', 200);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.firstName).toBe('Test');
    });

    it('should reject unauthenticated request', async () => {
      testHelper.httpHelper.clearAuth();

      const response = await testHelper.httpHelper.get('/users/me', 401);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update user profile', async () => {
      const { user } = await testHelper.createAuthenticatedUser({
        firstName: 'Original'
      });

      const response = await testHelper.httpHelper.patch('/users/me', {
        firstName: 'Updated',
        lastName: 'Name'
      }, 200);

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('Name');
    });

    it('should not allow email update', async () => {
      await testHelper.createAuthenticatedUser();

      const response = await testHelper.httpHelper.patch('/users/me', {
        email: 'newemail@example.com'
      }, 400);

      expect(response.status).toBe(400);
    });
  });

  describe('User with Avatars', () => {
    it('should create avatar for user', async () => {
      const { user } = await testHelper.createAuthenticatedUser();

      const response = await testHelper.httpHelper.post('/avatars', {
        name: 'My Avatar',
        gender: 'male',
        measurements: {
          height: 180,
          weight: 75
        }
      }, 201);

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(user.id);
      expect(response.body.name).toBe('My Avatar');
    });

    it('should list user avatars', async () => {
      const { user } = await testHelper.createAuthenticatedUser();

      // Create some avatars
      const avatarFixture = new AvatarFixture(testHelper.dbManager.getDataSource());
      await avatarFixture.createMany(3, { userId: user.id });

      const response = await testHelper.httpHelper.get('/avatars', 200);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body).toContainObjectMatching({
        userId: user.id
      });
    });
  });

  // Example of testing pagination
  describe('GET /users (Admin)', () => {
    it('should paginate users', async () => {
      // Create admin user
      const { token } = await testHelper.createAuthenticatedUser({
        role: 'admin'
      });

      // Create test users
      await userFixture.createMany(15);

      const response = await testHelper.httpHelper.get(
        '/users?page=1&limit=10',
        200
      );

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(10);
      expect(response.body.total).toBeGreaterThanOrEqual(15);
      expect(response.body.page).toBe(1);
    });
  });

  // Example of testing with snapshots
  describe('Snapshot Testing', () => {
    it('should match user response snapshot', async () => {
      const { user } = await testHelper.createAuthenticatedUser({
        email: 'snapshot@example.com',
        firstName: 'Snapshot',
        lastName: 'User'
      });

      const response = await testHelper.httpHelper.get('/users/me', 200);

      // Sanitize before snapshot
      const { SnapshotManager } = await import('@/common/utils/testing');
      const sanitized = SnapshotManager.sanitize(response.body, {
        uuids: true,
        dates: true
      });

      expect(sanitized).toMatchSnapshot('user-profile-response');
    });
  });
});
