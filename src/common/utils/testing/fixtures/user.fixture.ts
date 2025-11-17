import { v4 as uuidv4 } from 'uuid';
import { FixtureFactory } from './fixture.interface';
import { DataSource } from 'typeorm';
import { User } from '@/infrastructure/database/entities/user.entity';

/**
 * User fixture factory for generating test users
 *
 * Provides convenient methods to create user test data with sensible defaults
 * Automatically increments sequence numbers for unique email addresses
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
  private sequenceId = 0;
  private dataSource?: DataSource;

  constructor(dataSource?: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Set the data source for database operations
   */
  setDataSource(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * Build a user instance without persisting to database
   */
  build(overrides: Partial<User> = {}): User {
    this.sequenceId++;

    const user = new User();
    user.id = overrides.id || uuidv4();
    user.email = overrides.email || `user${this.sequenceId}@test.com`;
    user.firstName = overrides.firstName || `Test`;
    user.lastName = overrides.lastName || `User${this.sequenceId}`;
    // Default bcrypt hash for password "Test@1234"
    user.passwordHash = overrides.passwordHash || '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
    user.role = overrides.role || 'user';
    user.isActive = overrides.isActive ?? true;
    user.emailVerified = overrides.emailVerified ?? false;
    user.createdAt = overrides.createdAt || new Date();
    user.updatedAt = overrides.updatedAt || new Date();
    user.deletedAt = overrides.deletedAt || null;
    user.createdBy = overrides.createdBy || null;
    user.updatedBy = overrides.updatedBy || null;

    return user;
  }

  /**
   * Build multiple user instances without persisting
   */
  buildMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist a user to database
   */
  async create(overrides: Partial<User> = {}): Promise<User> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const user = this.build(overrides);
    const repository = this.dataSource.getRepository(User);
    return await repository.save(user);
  }

  /**
   * Create and persist multiple users to database
   */
  async createMany(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const users = this.buildMany(count, overrides);
    const repository = this.dataSource.getRepository(User);
    return await repository.save(users);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }

  /**
   * Build an admin user
   */
  buildAdmin(overrides: Partial<User> = {}): User {
    return this.build({
      role: 'admin',
      emailVerified: true,
      ...overrides
    });
  }

  /**
   * Create and persist an admin user
   */
  async createAdmin(overrides: Partial<User> = {}): Promise<User> {
    return this.create({
      role: 'admin',
      emailVerified: true,
      ...overrides
    });
  }

  /**
   * Build a designer user
   */
  buildDesigner(overrides: Partial<User> = {}): User {
    return this.build({
      role: 'designer',
      emailVerified: true,
      ...overrides
    });
  }

  /**
   * Create and persist a designer user
   */
  async createDesigner(overrides: Partial<User> = {}): Promise<User> {
    return this.create({
      role: 'designer',
      emailVerified: true,
      ...overrides
    });
  }
}
