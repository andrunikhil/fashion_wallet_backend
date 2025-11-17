import { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Manages test database connection and lifecycle
 * Provides methods for setup, seeding, clearing, and teardown
 */
export class TestDatabaseManager {
  private dataSource: DataSource;

  /**
   * Setup test database connection
   * Creates a new connection with test database configuration
   * Automatically synchronizes schema and drops existing tables
   */
  async setup(): Promise<DataSource> {
    const options: DataSourceOptions = {
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5433'),
      username: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      database: process.env.TEST_DB_NAME || 'fashion_wallet_test',
      entities: [__dirname + '/../../../../**/*.entity{.ts,.js}'],
      synchronize: true,
      dropSchema: true,
      logging: process.env.TEST_DB_LOGGING === 'true',
    };

    this.dataSource = new DataSource(options);
    await this.dataSource.initialize();

    return this.dataSource;
  }

  /**
   * Seed database with fixture data
   * @param fixtures Record of entity names to data arrays
   */
  async seed(fixtures: Record<string, any[]>): Promise<void> {
    for (const [entityName, data] of Object.entries(fixtures)) {
      const repository = this.dataSource.getRepository(entityName);
      await repository.save(data);
    }
  }

  /**
   * Clear all data from database tables
   * Preserves schema, only removes data
   */
  async clear(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;

    // Disable foreign key checks temporarily
    await this.dataSource.query('SET session_replication_role = replica;');

    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.clear();
    }

    // Re-enable foreign key checks
    await this.dataSource.query('SET session_replication_role = DEFAULT;');
  }

  /**
   * Teardown database connection
   * Closes connection and cleans up resources
   */
  async teardown(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  /**
   * Get the current data source instance
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
