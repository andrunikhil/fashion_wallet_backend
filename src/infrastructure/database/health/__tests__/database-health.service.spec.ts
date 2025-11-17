import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthService } from '../database-health.service';
import { PostgresService } from '../../postgres/postgres.service';
import { MongoDbService } from '../../mongodb/mongodb.service';

describe('DatabaseHealthService', () => {
  let service: DatabaseHealthService;
  let postgresService: jest.Mocked<PostgresService>;
  let mongoService: jest.Mocked<MongoDbService>;

  beforeEach(async () => {
    const mockPostgresService = {
      checkHealth: jest.fn(),
    };

    const mockMongoService = {
      checkHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthService,
        {
          provide: PostgresService,
          useValue: mockPostgresService,
        },
        {
          provide: MongoDbService,
          useValue: mockMongoService,
        },
      ],
    }).compile();

    service = module.get<DatabaseHealthService>(DatabaseHealthService);
    postgresService = module.get(PostgresService);
    mongoService = module.get(MongoDbService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when both databases are healthy', async () => {
      postgresService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 5,
        connections: {
          total: 10,
          active: 2,
          idle: 8,
        },
      });

      mongoService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 3,
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.postgres.healthy).toBe(true);
      expect(result.checks.mongodb.healthy).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should return unhealthy status when postgres is down', async () => {
      postgresService.checkHealth.mockResolvedValue({
        healthy: false,
        error: 'Connection failed',
        responseTime: 100,
      });

      mongoService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 3,
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.postgres.healthy).toBe(false);
      expect(result.checks.postgres.error).toBe('Connection failed');
    });

    it('should return unhealthy status when mongodb is down', async () => {
      postgresService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 5,
        connections: {
          total: 10,
          active: 2,
          idle: 8,
        },
      });

      mongoService.checkHealth.mockResolvedValue({
        healthy: false,
        error: 'Connection timeout',
        responseTime: 200,
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.mongodb.healthy).toBe(false);
      expect(result.checks.mongodb.error).toBe('Connection timeout');
    });

    it('should handle errors gracefully', async () => {
      postgresService.checkHealth.mockRejectedValue(new Error('Database error'));
      mongoService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 3,
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.postgres.healthy).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return true when all databases are healthy', async () => {
      postgresService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 5,
      });

      mongoService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 3,
      });

      const result = await service.isHealthy();

      expect(result).toBe(true);
    });

    it('should return false when any database is unhealthy', async () => {
      postgresService.checkHealth.mockResolvedValue({
        healthy: false,
        error: 'Connection failed',
        responseTime: 100,
      });

      mongoService.checkHealth.mockResolvedValue({
        healthy: true,
        responseTime: 3,
      });

      const result = await service.isHealthy();

      expect(result).toBe(false);
    });
  });
});
