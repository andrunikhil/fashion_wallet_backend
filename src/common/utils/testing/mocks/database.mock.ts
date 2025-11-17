import { v4 as uuidv4 } from 'uuid';

/**
 * Mock database repository for testing
 * Provides in-memory storage and common repository methods
 *
 * @example
 * ```typescript
 * const dbMock = new DatabaseMock();
 * const userRepo = dbMock.mockRepository<User>('User');
 *
 * await userRepo.save({ email: 'test@example.com' });
 * const user = await userRepo.findOne({ where: { email: 'test@example.com' } });
 * ```
 */
export class DatabaseMock {
  private data: Map<string, any[]> = new Map();

  /**
   * Create a mock repository for an entity
   */
  mockRepository<T extends Record<string, any>>(entityName: string) {
    if (!this.data.has(entityName)) {
      this.data.set(entityName, []);
    }

    const store = this.data.get(entityName)!;

    return {
      /**
       * Find all entities matching criteria
       */
      find: jest.fn(async (options?: any): Promise<T[]> => {
        let results = [...store];

        if (options?.where) {
          results = results.filter(item =>
            Object.entries(options.where).every(
              ([key, value]) => item[key] === value
            )
          );
        }

        if (options?.order) {
          const [[orderKey, orderDir]] = Object.entries(options.order);
          results.sort((a, b) => {
            const aVal = a[orderKey as string];
            const bVal = b[orderKey as string];
            const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            return orderDir === 'DESC' ? -comparison : comparison;
          });
        }

        if (options?.take) {
          results = results.slice(0, options.take);
        }

        if (options?.skip) {
          results = results.slice(options.skip);
        }

        return results;
      }),

      /**
       * Find one entity matching criteria
       */
      findOne: jest.fn(async (options: any): Promise<T | null> => {
        if (options?.where) {
          const result = store.find(item =>
            Object.entries(options.where).every(
              ([key, value]) => item[key] === value
            )
          );
          return result || null;
        }
        return store[0] || null;
      }),

      /**
       * Find entity by ID
       */
      findOneBy: jest.fn(async (criteria: any): Promise<T | null> => {
        const result = store.find(item =>
          Object.entries(criteria).every(
            ([key, value]) => item[key] === value
          )
        );
        return result || null;
      }),

      /**
       * Save entity or entities
       */
      save: jest.fn(async (entity: T | T[]): Promise<T | T[]> => {
        const entities = Array.isArray(entity) ? entity : [entity];
        const saved: T[] = [];

        for (const ent of entities) {
          if (!ent.id) {
            ent.id = uuidv4();
          }

          const existingIndex = store.findIndex(item => item.id === ent.id);
          if (existingIndex >= 0) {
            store[existingIndex] = { ...store[existingIndex], ...ent };
            saved.push(store[existingIndex]);
          } else {
            const newEntity = { ...ent };
            store.push(newEntity);
            saved.push(newEntity);
          }
        }

        return Array.isArray(entity) ? saved : saved[0];
      }),

      /**
       * Delete entities matching criteria
       */
      delete: jest.fn(async (criteria: any): Promise<{ affected?: number }> => {
        const initialLength = store.length;

        if (typeof criteria === 'string' || typeof criteria === 'number') {
          const index = store.findIndex(item => item.id === criteria);
          if (index >= 0) {
            store.splice(index, 1);
          }
        } else {
          for (let i = store.length - 1; i >= 0; i--) {
            const item = store[i];
            const matches = Object.entries(criteria).every(
              ([key, value]) => item[key] === value
            );
            if (matches) {
              store.splice(i, 1);
            }
          }
        }

        return { affected: initialLength - store.length };
      }),

      /**
       * Remove entity or entities
       */
      remove: jest.fn(async (entity: T | T[]): Promise<T | T[]> => {
        const entities = Array.isArray(entity) ? entity : [entity];

        for (const ent of entities) {
          const index = store.findIndex(item => item.id === ent.id);
          if (index >= 0) {
            store.splice(index, 1);
          }
        }

        return entity;
      }),

      /**
       * Count entities matching criteria
       */
      count: jest.fn(async (options?: any): Promise<number> => {
        if (!options?.where) {
          return store.length;
        }

        return store.filter(item =>
          Object.entries(options.where).every(
            ([key, value]) => item[key] === value
          )
        ).length;
      }),

      /**
       * Clear all entities
       */
      clear: jest.fn(async (): Promise<void> => {
        store.length = 0;
      }),

      /**
       * Create query builder (basic mock)
       */
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };
  }

  /**
   * Clear all data from all repositories
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get raw data for a repository (for debugging)
   */
  getData(entityName: string): any[] {
    return this.data.get(entityName) || [];
  }
}
