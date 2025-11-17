/**
 * Unit Test Example
 *
 * Demonstrates how to write unit tests using the testing utilities:
 * - UserFixture for test data generation
 * - DatabaseMock for mocking repositories
 * - Custom matchers for assertions
 */

import { UserFixture, DatabaseMock } from '@/common/utils/testing';
import { User } from '@/infrastructure/database/entities/user.entity';

// Example service to test
class UserService {
  constructor(private userRepository: any) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = { ...userData, id: 'generated-id' } as User;
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new Error('User not found');
    }
    Object.assign(user, updates);
    return await this.userRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    await this.userRepository.delete({ id });
  }
}

describe('UserService (Unit)', () => {
  let service: UserService;
  let dbMock: DatabaseMock;
  let userRepository: any;
  let userFixture: UserFixture;

  beforeEach(() => {
    // Setup mocks
    dbMock = new DatabaseMock();
    userRepository = dbMock.mockRepository<User>('User');

    // Create service with mocked repository
    service = new UserService(userRepository);

    // Create fixture
    userFixture = new UserFixture();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // Arrange
      const userData = userFixture.build({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      });

      // Act
      const result = await service.create(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('Test');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test'
        })
      );
    });

    it('should create an admin user', async () => {
      // Arrange
      const adminData = userFixture.buildAdmin({
        email: 'admin@example.com'
      });

      // Act
      const result = await service.create(adminData);

      // Assert
      expect(result.role).toBe('admin');
      expect(result.emailVerified).toBe(true);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      // Arrange
      const user = userFixture.build({ email: 'test@example.com' });
      await userRepository.save(user);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      // Arrange
      const user = userFixture.build({
        id: 'user-123',
        email: 'test@example.com'
      });
      await userRepository.save(user);

      // Act
      const result = await service.update('user-123', {
        firstName: 'Updated'
      });

      // Assert
      expect(result.firstName).toBe('Updated');
      expect(userRepository.save).toHaveBeenCalledTimes(2); // Once for initial save, once for update
    });

    it('should throw when user not found', async () => {
      // Act & Assert
      await expect(
        service.update('nonexistent', { firstName: 'Updated' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      // Arrange
      const user = userFixture.build({ id: 'user-123' });
      await userRepository.save(user);

      // Act
      await service.delete('user-123');

      // Assert
      expect(userRepository.delete).toHaveBeenCalledWith({ id: 'user-123' });
    });
  });

  // Example using custom matchers
  describe('with custom matchers', () => {
    it('should generate valid user IDs', () => {
      const user = userFixture.build();
      expect(user.id).toBeUUID();
    });

    it('should create users with recent timestamps', () => {
      const user = userFixture.build();
      expect(user.createdAt).toBeRecentDate(60);
    });

    it('should validate email format', () => {
      const user = userFixture.build();
      expect(user.email).toBeValidEmail();
    });

    it('should match user schema', () => {
      const user = userFixture.build();
      expect(user).toMatchSchema({
        id: 'uuid',
        email: 'string',
        firstName: 'string',
        lastName: 'string',
        role: 'string',
        isActive: 'boolean',
        createdAt: 'date'
      });
    });
  });

  // Example of testing multiple scenarios
  describe('batch operations', () => {
    it('should handle multiple users', () => {
      const users = userFixture.buildMany(5, { role: 'user' });

      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user.role).toBe('user');
        expect(user.id).toBeUUID();
      });
    });
  });
});
