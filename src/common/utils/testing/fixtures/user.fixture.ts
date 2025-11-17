import { v4 as uuidv4 } from 'uuid';
import { FixtureFactory } from './fixture.interface';
import { DataSource } from 'typeorm';

/**
 * User entity interface (to be replaced with actual User entity when available)
 */
export interface User {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

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
    const repository = this.dataSource.getRepository('User');
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
    const repository = this.dataSource.getRepository('User');
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
      ...overrides
    });
  }

  /**
   * Create and persist an admin user
   */
  async createAdmin(overrides: Partial<User> = {}): Promise<User> {
    return this.create({
      role: 'admin',
      ...overrides
    });
  }
}
