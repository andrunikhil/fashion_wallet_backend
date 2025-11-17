/**
 * CatalogReindexService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogReindexService } from '../../services/catalog-reindex.service';
import { ElasticsearchService } from '../../services/elasticsearch.service';
import { CatalogItemRepository } from '../../repositories';

describe('CatalogReindexService', () => {
  let service: CatalogReindexService;
  let elasticsearchService: ElasticsearchService;
  let catalogItemRepository: CatalogItemRepository;

  const mockCatalogItems = [
    {
      id: '1',
      type: 'silhouette',
      name: 'Item 1',
      description: 'Test item 1',
      category: 'tops',
      isActive: true,
      properties: {
        colors: [{ name: 'red', hex: '#FF0000' }],
      },
    },
    {
      id: '2',
      type: 'fabric',
      name: 'Item 2',
      description: 'Test item 2',
      category: 'bottoms',
      isActive: true,
      properties: {},
    },
  ];

  const mockElasticsearchService = {
    bulkIndex: jest.fn(),
    refreshIndex: jest.fn(),
    deleteIndex: jest.fn(),
    createIndex: jest.fn(),
  };

  const mockCatalogItemRepository = {
    count: jest.fn(),
    findAllPaginated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogReindexService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: CatalogItemRepository,
          useValue: mockCatalogItemRepository,
        },
      ],
    }).compile();

    service = module.get<CatalogReindexService>(CatalogReindexService);
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService);
    catalogItemRepository = module.get<CatalogItemRepository>(
      CatalogItemRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reindexAll', () => {
    it('should reindex all active catalog items', async () => {
      mockCatalogItemRepository.count.mockResolvedValue(2);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockCatalogItems,
        total: 2,
      });
      mockElasticsearchService.bulkIndex.mockResolvedValue({
        success: 2,
        failed: 0,
        errors: [],
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const result = await service.reindexAll(100);

      expect(result.total).toBe(2);
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(elasticsearchService.bulkIndex).toHaveBeenCalledTimes(1);
      expect(elasticsearchService.refreshIndex).toHaveBeenCalledTimes(1);
    });

    it('should process items in batches', async () => {
      const manyItems = Array.from({ length: 250 }, (_, i) => ({
        ...mockCatalogItems[0],
        id: `${i + 1}`,
      }));

      mockCatalogItemRepository.count.mockResolvedValue(250);
      mockCatalogItemRepository.findAllPaginated
        .mockResolvedValueOnce({ items: manyItems.slice(0, 100), total: 250 })
        .mockResolvedValueOnce({ items: manyItems.slice(100, 200), total: 250 })
        .mockResolvedValueOnce({ items: manyItems.slice(200, 250), total: 250 });

      mockElasticsearchService.bulkIndex.mockResolvedValue({
        success: 100,
        failed: 0,
        errors: [],
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const result = await service.reindexAll(100);

      expect(elasticsearchService.bulkIndex).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(250);
    });

    it('should report failures', async () => {
      mockCatalogItemRepository.count.mockResolvedValue(2);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockCatalogItems,
        total: 2,
      });
      mockElasticsearchService.bulkIndex.mockResolvedValue({
        success: 1,
        failed: 1,
        errors: [{ id: '2', error: 'Indexing failed' }],
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const result = await service.reindexAll();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should prevent concurrent reindexing', async () => {
      mockCatalogItemRepository.count.mockResolvedValue(2);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockCatalogItems,
        total: 2,
      });
      mockElasticsearchService.bulkIndex.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: 2, failed: 0, errors: [] }), 100))
      );
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      // Start first reindex
      const firstReindex = service.reindexAll();

      // Try to start second reindex immediately
      await expect(service.reindexAll()).rejects.toThrow(
        'Re-indexing is already in progress'
      );

      // Wait for first to complete
      await firstReindex;
    });

    it('should reset isReindexing flag on error', async () => {
      mockCatalogItemRepository.count.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.reindexAll()).rejects.toThrow('Database error');

      // Should be able to start again
      mockCatalogItemRepository.count.mockResolvedValue(0);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: [],
        total: 0,
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      await expect(service.reindexAll()).resolves.toBeDefined();
    });
  });

  describe('reindexByType', () => {
    it('should reindex items of specific type', async () => {
      const silhouetteItems = mockCatalogItems.filter(
        item => item.type === 'silhouette'
      );

      mockCatalogItemRepository.count.mockResolvedValue(1);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: silhouetteItems,
        total: 1,
      });
      mockElasticsearchService.bulkIndex.mockResolvedValue({
        success: 1,
        failed: 0,
        errors: [],
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const result = await service.reindexByType('silhouette');

      expect(result.total).toBe(1);
      expect(result.success).toBe(1);
      expect(catalogItemRepository.findAllPaginated).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ type: 'silhouette', isActive: true })
      );
    });

    it('should prevent concurrent reindexing by type', async () => {
      mockCatalogItemRepository.count.mockResolvedValue(1);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: [mockCatalogItems[0]],
        total: 1,
      });
      mockElasticsearchService.bulkIndex.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: 1, failed: 0, errors: [] }), 100))
      );
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const firstReindex = service.reindexByType('silhouette');

      await expect(service.reindexByType('fabric')).rejects.toThrow(
        'Re-indexing is already in progress'
      );

      await firstReindex;
    });
  });

  describe('isInProgress', () => {
    it('should return false when not reindexing', () => {
      expect(service.isInProgress()).toBe(false);
    });

    it('should return true during reindexing', async () => {
      mockCatalogItemRepository.count.mockResolvedValue(2);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockCatalogItems,
        total: 2,
      });
      mockElasticsearchService.bulkIndex.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: 2, failed: 0, errors: [] }), 100))
      );
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const reindexPromise = service.reindexAll();

      // Check immediately
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(service.isInProgress()).toBe(true);

      await reindexPromise;
      expect(service.isInProgress()).toBe(false);
    });
  });

  describe('rebuildIndex', () => {
    it('should delete, create, and reindex', async () => {
      mockElasticsearchService.deleteIndex.mockResolvedValue(undefined);
      mockElasticsearchService.createIndex.mockResolvedValue(undefined);
      mockCatalogItemRepository.count.mockResolvedValue(2);
      mockCatalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockCatalogItems,
        total: 2,
      });
      mockElasticsearchService.bulkIndex.mockResolvedValue({
        success: 2,
        failed: 0,
        errors: [],
      });
      mockElasticsearchService.refreshIndex.mockResolvedValue(undefined);

      const result = await service.rebuildIndex();

      expect(elasticsearchService.deleteIndex).toHaveBeenCalledTimes(1);
      expect(elasticsearchService.createIndex).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(2);
    });

    it('should handle rebuild errors', async () => {
      mockElasticsearchService.deleteIndex.mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(service.rebuildIndex()).rejects.toThrow('Delete failed');
    });
  });
});
