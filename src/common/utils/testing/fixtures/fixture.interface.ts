/**
 * Generic fixture factory interface for test data generation
 *
 * Provides methods to build objects in memory and create them in the database
 * Supports both single and batch operations with optional overrides
 *
 * @template T The entity type this fixture generates
 *
 * @example
 * ```typescript
 * class UserFixture implements FixtureFactory<User> {
 *   build(overrides?: Partial<User>): User {
 *     return { id: uuid(), email: 'test@example.com', ...overrides };
 *   }
 *   // ... implement other methods
 * }
 *
 * const fixture = new UserFixture();
 * const user = fixture.build({ email: 'custom@example.com' });
 * const savedUser = await fixture.create();
 * ```
 */
export interface FixtureFactory<T> {
  /**
   * Build an entity instance without persisting to database
   * @param overrides Partial entity data to override defaults
   * @returns Built entity instance
   */
  build(overrides?: Partial<T>): T;

  /**
   * Build multiple entity instances without persisting
   * @param count Number of instances to build
   * @param overrides Partial entity data to override defaults (applied to all)
   * @returns Array of built entity instances
   */
  buildMany(count: number, overrides?: Partial<T>): T[];

  /**
   * Create and persist an entity instance to database
   * @param overrides Partial entity data to override defaults
   * @returns Promise resolving to created entity
   */
  create(overrides?: Partial<T>): Promise<T>;

  /**
   * Create and persist multiple entity instances to database
   * @param count Number of instances to create
   * @param overrides Partial entity data to override defaults (applied to all)
   * @returns Promise resolving to array of created entities
   */
  createMany(count: number, overrides?: Partial<T>): Promise<T[]>;

  /**
   * Reset the fixture state (e.g., sequence counters)
   * Useful when you need predictable test data across tests
   */
  reset(): void;
}
