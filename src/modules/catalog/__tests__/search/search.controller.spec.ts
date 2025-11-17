/**
 * SearchController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../../controllers/search.controller';
import { CatalogSearchService } from '../../services/catalog-search.service';
import { SearchRequestDto, SearchResponseDto } from '../../dto/search.dto';
import { SortField } from '../../dto/catalog-filter.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let catalogSearchService: CatalogSearchService;

  const mockSearchResponse: SearchResponseDto = {
    items: [
      {
        id: '1',
        name: 'Summer Dress',
        type: 'silhouette',
        category: 'dresses',
      },
      {
        id: '2',
        name: 'Summer Top',
        type: 'silhouette',
        category: 'tops',
      },
    ],
    pagination: {
      total: 100,
      page: 1,
      limit: 24,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    },
    facets: {
      categories: [
        { value: 'dresses', count: 50 },
        { value: 'tops', count: 50 },
      ],
      colors: [
        { value: 'red', count: 30 },
        { value: 'blue', count: 25 },
      ],
      occasions: [],
      seasons: [],
      brands: [],
      styles: [],
    },
    took: 45,
  };

  const mockCatalogSearchService = {
    search: jest.fn(),
    autocomplete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: CatalogSearchService,
          useValue: mockCatalogSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    catalogSearchService = module.get<CatalogSearchService>(CatalogSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /catalog/search', () => {
    it('should search with full search request', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchRequest: SearchRequestDto = {
        query: 'summer dress',
        page: 1,
        limit: 24,
        category: ['dresses'],
        includeFacets: true,
      };

      const result = await controller.search(searchRequest);

      expect(result).toEqual(mockSearchResponse);
      expect(catalogSearchService.search).toHaveBeenCalledWith(searchRequest);
    });

    it('should handle search with filters', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchRequest: SearchRequestDto = {
        query: 'dress',
        category: ['dresses', 'tops'],
        tags: ['casual', 'summer'],
        colors: ['red', 'blue'],
        priceRange: {
          min: 50,
          max: 200,
        },
      };

      const result = await controller.search(searchRequest);

      expect(result).toBeDefined();
      expect(catalogSearchService.search).toHaveBeenCalledWith(searchRequest);
    });

    it('should handle search without query (browse mode)', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchRequest: SearchRequestDto = {
        category: ['dresses'],
        page: 1,
        limit: 24,
      };

      const result = await controller.search(searchRequest);

      expect(result).toBeDefined();
      expect(catalogSearchService.search).toHaveBeenCalledWith(searchRequest);
    });

    it('should handle pagination', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchRequest: SearchRequestDto = {
        query: 'test',
        page: 3,
        limit: 10,
      };

      await controller.search(searchRequest);

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 3,
          limit: 10,
        })
      );
    });

    it('should handle sorting', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const searchRequest: SearchRequestDto = {
        query: 'test',
        sortBy: SortField.POPULARITY,
        sortOrder: 'desc',
      };

      await controller.search(searchRequest);

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: SortField.POPULARITY,
          sortOrder: 'desc',
        })
      );
    });
  });

  describe('GET /catalog/search/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const mockSuggestions = ['summer dress', 'summer top', 'summer skirt'];
      mockCatalogSearchService.autocomplete.mockResolvedValue(mockSuggestions);

      const result = await controller.autocomplete('sum', 10);

      expect(result.suggestions).toEqual(mockSuggestions);
      expect(result.took).toBeGreaterThanOrEqual(0);
      expect(catalogSearchService.autocomplete).toHaveBeenCalledWith('sum', 10);
    });

    it('should use default limit when not provided', async () => {
      mockCatalogSearchService.autocomplete.mockResolvedValue([]);

      await controller.autocomplete('test');

      expect(catalogSearchService.autocomplete).toHaveBeenCalledWith('test', 10);
    });

    it('should handle empty suggestions', async () => {
      mockCatalogSearchService.autocomplete.mockResolvedValue([]);

      const result = await controller.autocomplete('xyz');

      expect(result.suggestions).toEqual([]);
      expect(result.took).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /catalog/search (quick search)', () => {
    it('should perform quick search with query parameter', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      const result = await controller.quickSearch('summer dress');

      expect(result).toEqual(mockSearchResponse);
      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'summer dress',
          page: 1,
          limit: 24,
        })
      );
    });

    it('should handle pagination in quick search', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      await controller.quickSearch('test', 2, 12);

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 12,
        })
      );
    });

    it('should handle category filter in quick search', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      await controller.quickSearch('test', 1, 24, undefined, 'dresses,tops');

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ['dresses', 'tops'],
        })
      );
    });

    it('should handle tags filter in quick search', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      await controller.quickSearch(
        'test',
        1,
        24,
        undefined,
        undefined,
        'casual,summer'
      );

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['casual', 'summer'],
        })
      );
    });

    it('should handle sort parameter in quick search', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      await controller.quickSearch('test', 1, 24, 'popularity');

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'popularity',
        })
      );
    });

    it('should handle search without any parameters', async () => {
      mockCatalogSearchService.search.mockResolvedValue(mockSearchResponse);

      await controller.quickSearch();

      expect(catalogSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 24,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should propagate search service errors', async () => {
      mockCatalogSearchService.search.mockRejectedValue(
        new Error('Search failed')
      );

      const searchRequest: SearchRequestDto = {
        query: 'test',
      };

      await expect(controller.search(searchRequest)).rejects.toThrow(
        'Search failed'
      );
    });

    it('should propagate autocomplete errors', async () => {
      mockCatalogSearchService.autocomplete.mockRejectedValue(
        new Error('Autocomplete failed')
      );

      await expect(controller.autocomplete('test')).rejects.toThrow(
        'Autocomplete failed'
      );
    });
  });
});
