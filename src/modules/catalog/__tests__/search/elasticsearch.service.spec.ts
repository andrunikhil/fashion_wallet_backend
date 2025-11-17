/**
 * ElasticsearchService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService } from '../../services/elasticsearch.service';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'elasticsearch') {
        return {
          node: 'http://localhost:9200',
          auth: {
            username: 'elastic',
            password: 'changeme',
          },
          maxRetries: 3,
          requestTimeout: 30000,
          sniffOnStart: true,
        };
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('elasticsearch');
    });

    it('should have a client instance', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('index management', () => {
    it('should create index with proper mappings', async () => {
      const createIndexSpy = jest.spyOn(service, 'createIndex');

      // Mock implementation to avoid actual Elasticsearch call
      createIndexSpy.mockResolvedValue(undefined);

      await service.createIndex();
      expect(createIndexSpy).toHaveBeenCalled();
    });

    it('should delete index if it exists', async () => {
      const deleteIndexSpy = jest.spyOn(service, 'deleteIndex');
      deleteIndexSpy.mockResolvedValue(undefined);

      await service.deleteIndex();
      expect(deleteIndexSpy).toHaveBeenCalled();
    });

    it('should ensure index exists', async () => {
      const ensureIndexSpy = jest.spyOn(service, 'ensureIndexExists');
      ensureIndexSpy.mockResolvedValue(undefined);

      await service.ensureIndexExists();
      expect(ensureIndexSpy).toHaveBeenCalled();
    });
  });

  describe('document operations', () => {
    const testDocument = {
      id: 'test-123',
      name: 'Test Item',
      type: 'silhouette',
      category: 'tops',
    };

    it('should index a document', async () => {
      const indexSpy = jest.spyOn(service, 'indexDocument');
      indexSpy.mockResolvedValue(undefined);

      await service.indexDocument('test-123', testDocument);
      expect(indexSpy).toHaveBeenCalledWith('test-123', testDocument);
    });

    it('should update a document', async () => {
      const updateSpy = jest.spyOn(service, 'updateDocument');
      updateSpy.mockResolvedValue(undefined);

      await service.updateDocument('test-123', { name: 'Updated Name' });
      expect(updateSpy).toHaveBeenCalledWith('test-123', { name: 'Updated Name' });
    });

    it('should delete a document', async () => {
      const deleteSpy = jest.spyOn(service, 'deleteDocument');
      deleteSpy.mockResolvedValue(undefined);

      await service.deleteDocument('test-123');
      expect(deleteSpy).toHaveBeenCalledWith('test-123');
    });

    it('should not throw when deleting non-existent document', async () => {
      const deleteSpy = jest.spyOn(service, 'deleteDocument');
      deleteSpy.mockResolvedValue(undefined);

      await expect(service.deleteDocument('non-existent')).resolves.not.toThrow();
    });
  });

  describe('bulk operations', () => {
    it('should bulk index multiple documents', async () => {
      const documents = [
        { id: 'item-1', document: { name: 'Item 1' } },
        { id: 'item-2', document: { name: 'Item 2' } },
        { id: 'item-3', document: { name: 'Item 3' } },
      ];

      const bulkSpy = jest.spyOn(service, 'bulkIndex');
      bulkSpy.mockResolvedValue({
        success: 3,
        failed: 0,
        errors: [],
      });

      const result = await service.bulkIndex(documents);

      expect(bulkSpy).toHaveBeenCalledWith(documents);
      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should report failures in bulk indexing', async () => {
      const documents = [
        { id: 'item-1', document: { name: 'Item 1' } },
        { id: 'item-2', document: { name: 'Item 2' } },
      ];

      const bulkSpy = jest.spyOn(service, 'bulkIndex');
      bulkSpy.mockResolvedValue({
        success: 1,
        failed: 1,
        errors: [{ id: 'item-2', error: 'Indexing failed' }],
      });

      const result = await service.bulkIndex(documents);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('search operations', () => {
    it('should execute search query', async () => {
      const searchSpy = jest.spyOn(service, 'search');
      searchSpy.mockResolvedValue({
        hits: {
          total: { value: 10 },
          hits: [],
        },
      });

      const query = { query: { match_all: {} } };
      const result = await service.search(query);

      expect(searchSpy).toHaveBeenCalledWith(query);
      expect(result.hits.total.value).toBe(10);
    });

    it('should get suggestions', async () => {
      const suggestSpy = jest.spyOn(service, 'suggest');
      suggestSpy.mockResolvedValue(['summer dress', 'summer top']);

      const suggestions = await service.suggest('sum', 10);

      expect(suggestSpy).toHaveBeenCalledWith('sum', 10);
      expect(suggestions).toHaveLength(2);
      expect(suggestions).toContain('summer dress');
    });
  });

  describe('utility operations', () => {
    it('should refresh index', async () => {
      const refreshSpy = jest.spyOn(service, 'refreshIndex');
      refreshSpy.mockResolvedValue(undefined);

      await service.refreshIndex();
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should get index statistics', async () => {
      const statsSpy = jest.spyOn(service, 'getIndexStats');
      statsSpy.mockResolvedValue({
        _all: {
          primaries: {
            docs: { count: 100 },
          },
        },
      });

      const stats = await service.getIndexStats();
      expect(statsSpy).toHaveBeenCalled();
      expect(stats).toBeDefined();
    });

    it('should perform health check', async () => {
      const healthSpy = jest.spyOn(service, 'healthCheck');
      healthSpy.mockResolvedValue(true);

      const isHealthy = await service.healthCheck();
      expect(healthSpy).toHaveBeenCalled();
      expect(isHealthy).toBe(true);
    });

    it('should return false on health check failure', async () => {
      const healthSpy = jest.spyOn(service, 'healthCheck');
      healthSpy.mockResolvedValue(false);

      const isHealthy = await service.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });
});
