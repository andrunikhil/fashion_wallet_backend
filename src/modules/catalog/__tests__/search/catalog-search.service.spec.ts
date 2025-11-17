/**
 * CatalogSearchService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogSearchService } from '../../services/catalog-search.service';
import { ElasticsearchService } from '../../services/elasticsearch.service';
import { SearchRequestDto } from '../../dto/search.dto';
import { SortField } from '../../dto/catalog-filter.dto';

describe('CatalogSearchService', () => {
  let service: CatalogSearchService;
  let elasticsearchService: ElasticsearchService;

  const mockElasticsearchService = {
    search: jest.fn(),
    suggest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogSearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
      ],
    }).compile();

    service = module.get<CatalogSearchService>(CatalogSearchService);
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    const mockEsResponse = {
      hits: {
        total: { value: 100 },
        hits: [
          {
            _id: '1',
            _score: 1.5,
            _source: {
              id: '1',
              name: 'Summer Dress',
              type: 'silhouette',
              category: 'dresses',
            },
          },
          {
            _id: '2',
            _score: 1.2,
            _source: {
              id: '2',
              name: 'Summer Top',
              type: 'silhouette',
              category: 'tops',
            },
          },
        ],
      },
      aggregations: {
        categories: {
          buckets: [
            { key: 'dresses', doc_count: 50 },
            { key: 'tops', doc_count: 50 },
          ],
        },
        colors: {
          color_names: {
            buckets: [
              { key: 'red', doc_count: 30 },
              { key: 'blue', doc_count: 25 },
            ],
          },
        },
        occasions: { buckets: [] },
        seasons: { buckets: [] },
        styles: { buckets: [] },
        brands: { buckets: [] },
        price_stats: {
          count: 100,
          min: 10,
          max: 500,
          avg: 125.5,
        },
      },
    };

    it('should perform basic search', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        query: 'summer',
        page: 1,
        limit: 24,
      };

      const result = await service.search(searchRequest);

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(24);
      expect(result.took).toBeGreaterThanOrEqual(0);
    });

    it('should include facets when requested', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        query: 'dress',
        includeFacets: true,
      };

      const result = await service.search(searchRequest);

      expect(result.facets).toBeDefined();
      expect(result.facets.categories).toHaveLength(2);
      expect(result.facets.colors).toHaveLength(2);
      expect(result.facets.priceRange).toBeDefined();
      expect(result.facets.priceRange.min).toBe(10);
      expect(result.facets.priceRange.max).toBe(500);
      expect(result.facets.priceRange.avg).toBe(126); // rounded
    });

    it('should filter by category', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        category: ['dresses', 'tops'],
      };

      await service.search(searchRequest);

      expect(mockElasticsearchService.search).toHaveBeenCalled();
      const esQuery = mockElasticsearchService.search.mock.calls[0][0];

      // Check that category filter is included
      const hasTermsFilter = esQuery.query.bool.filter.some(
        (f: any) => f.terms && f.terms.category
      );
      expect(hasTermsFilter).toBe(true);
    });

    it('should filter by tags', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        tags: ['casual', 'summer'],
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      const hasTagsFilter = esQuery.query.bool.filter.some(
        (f: any) => f.terms && f.terms.tags
      );
      expect(hasTagsFilter).toBe(true);
    });

    it('should filter by price range', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        priceRange: {
          min: 50,
          max: 200,
        },
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      const hasPriceFilter = esQuery.query.bool.filter.some(
        (f: any) => f.range && f.range['price_range.gte']
      );
      expect(hasPriceFilter).toBe(true);
    });

    it('should sort by relevance when query is provided', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        query: 'summer dress',
        sortBy: SortField.RELEVANCE,
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      expect(esQuery.sort).toBeDefined();
      expect(esQuery.sort[0]).toHaveProperty('_score');
    });

    it('should sort by popularity when no query', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        sortBy: SortField.POPULARITY,
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      expect(esQuery.sort).toBeDefined();
      expect(esQuery.sort[0]).toHaveProperty('popularity_score');
    });

    it('should sort by newest', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        sortBy: SortField.NEWEST,
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      expect(esQuery.sort[0]).toHaveProperty('created_at');
    });

    it('should handle pagination correctly', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        page: 3,
        limit: 10,
      };

      await service.search(searchRequest);

      const esQuery = mockElasticsearchService.search.mock.calls[0][0];
      expect(esQuery.from).toBe(20); // (page 3 - 1) * 10
      expect(esQuery.size).toBe(10);
    });

    it('should use cache for repeated searches', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        query: 'test',
        page: 1,
        limit: 24,
      };

      // First call - should hit Elasticsearch
      await service.search(searchRequest);
      expect(mockElasticsearchService.search).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.search(searchRequest);
      expect(mockElasticsearchService.search).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should calculate pagination metadata correctly', async () => {
      mockElasticsearchService.search.mockResolvedValue(mockEsResponse);

      const searchRequest: SearchRequestDto = {
        page: 2,
        limit: 24,
      };

      const result = await service.search(searchRequest);

      expect(result.pagination.totalPages).toBe(5); // 100 / 24 = ~5
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockElasticsearchService.search.mockRejectedValue(
        new Error('Elasticsearch connection failed')
      );

      const searchRequest: SearchRequestDto = {
        query: 'test',
      };

      await expect(service.search(searchRequest)).rejects.toThrow(
        'Elasticsearch connection failed'
      );
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const mockSuggestions = ['summer dress', 'summer top', 'summer skirt'];
      mockElasticsearchService.suggest.mockResolvedValue(mockSuggestions);

      const result = await service.autocomplete('sum', 10);

      expect(result).toEqual(mockSuggestions);
      expect(mockElasticsearchService.suggest).toHaveBeenCalledWith('sum', 10);
    });

    it('should handle suggestion errors gracefully', async () => {
      mockElasticsearchService.suggest.mockRejectedValue(
        new Error('Connection error')
      );

      const result = await service.autocomplete('test');

      expect(result).toEqual([]);
    });

    it('should default to 10 suggestions', async () => {
      mockElasticsearchService.suggest.mockResolvedValue([]);

      await service.autocomplete('test');

      expect(mockElasticsearchService.suggest).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });
});
