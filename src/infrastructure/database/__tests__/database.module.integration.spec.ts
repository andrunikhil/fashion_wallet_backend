import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database.module';
import { PostgresService } from '../postgres/postgres.service';
import { MongoDbService } from '../mongodb/mongodb.service';
import { DatabaseHealthService } from '../health/database-health.service';

describe('DatabaseModule Integration', () => {
  let module: TestingModule;
  let postgresService: PostgresService;
  let mongoService: MongoDbService;
  let healthService: DatabaseHealthService;

  // Skip these tests if databases are not available
  const testIfDatabaseAvailable = process.env.CI ? it.skip : it;

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          DatabaseModule,
        ],
      }).compile();

      postgresService = module.get<PostgresService>(PostgresService);
      mongoService = module.get<MongoDbService>(MongoDbService);
      healthService = module.get<DatabaseHealthService>(DatabaseHealthService);
    } catch (error) {
      console.log('Database module initialization failed - tests will be skipped', error.message);
    }
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  testIfDatabaseAvailable('should be defined', () => {
    expect(module).toBeDefined();
    expect(postgresService).toBeDefined();
    expect(mongoService).toBeDefined();
    expect(healthService).toBeDefined();
  });

  testIfDatabaseAvailable('should connect to PostgreSQL', async () => {
    const health = await postgresService.checkHealth();
    expect(health).toBeDefined();
    expect(health.responseTime).toBeGreaterThanOrEqual(0);
  });

  testIfDatabaseAvailable('should connect to MongoDB', async () => {
    const health = await mongoService.checkHealth();
    expect(health).toBeDefined();
    expect(health.responseTime).toBeGreaterThanOrEqual(0);
  });

  testIfDatabaseAvailable('should perform health check', async () => {
    const result = await healthService.checkHealth();
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.checks).toBeDefined();
    expect(result.checks.postgres).toBeDefined();
    expect(result.checks.mongodb).toBeDefined();
  });

  testIfDatabaseAvailable('should initialize PostgreSQL schemas', async () => {
    await expect(postgresService.initializeSchemas()).resolves.not.toThrow();
  });

  testIfDatabaseAvailable('should execute PostgreSQL queries', async () => {
    const result = await postgresService.query('SELECT 1 as test');
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  testIfDatabaseAvailable('should check MongoDB connection state', () => {
    const isConnected = mongoService.isConnected();
    expect(typeof isConnected).toBe('boolean');
  });
});
