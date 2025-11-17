/**
 * RecommendationService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RecommendationService } from '../../services/recommendation.service';
import { CatalogItemRepository, UserFavoriteRepository } from '../../repositories';
import {
  RecommendationType,
  RecommendationRequestDto,
} from '../../dto/recommendation.dto';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let catalogItemRepository: CatalogItemRepository;
  let userFavoriteRepository: UserFavoriteRepository;
  let dataSource: DataSource;

  const mockCatalogItems = [
    {
      id: '1',
      name: 'Summer Dress',
      type: 'silhouette',
      category: 'dresses',
      tags: ['casual', 'summer'],
      isActive: true,
      popularityScore: 85,
      properties: {
        colors: [{ name: 'red', hex: '#FF0000' }],
        occasions: ['casual'],
        seasons: ['summer'],
      },
    },
    {
      id: '2',
      name: 'Denim Jacket',
      type: 'silhouette',
      category: 'outerwear',
      tags: ['casual', 'versatile'],
      isActive: true,
      popularityScore: 90,
      properties: {
        colors: [{ name: 'blue', hex: '#0000FF' }],
        occasions: ['casual'],
        seasons: ['spring', 'fall'],
      },
    },
  ];

  const mockDataSource = {
    query: jest.fn(),
    createQueryRunner: jest.fn(),
  };

  const mockCatalogItemRepository = {
    findOne: jest.fn(),
    findByIds: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockCatalogItems),
    })),
  };

  const mockUserFavoriteRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CatalogItemRepository,
          useValue: mockCatalogItemRepository,
        },
        {
          provide: UserFavoriteRepository,
          useValue: mockUserFavoriteRepository,
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    dataSource = module.get<DataSource>(DataSource);
    catalogItemRepository = module.get<CatalogItemRepository>(
      CatalogItemRepository
    );
    userFavoriteRepository = module.get<UserFavoriteRepository>(
      UserFavoriteRepository
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should get personalized recommendations', async () => {
      mockUserFavoriteRepository.find.mockResolvedValue([
        {
          userId: 'user-1',
          catalogItemId: '1',
          catalogItem: mockCatalogItems[0],
        },
      ]);
      mockDataSource.query.mockResolvedValue([]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.PERSONALIZED,
        userId: 'user-1',
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.PERSONALIZED);
      expect(result.items).toBeDefined();
      expect(result.took).toBeGreaterThanOrEqual(0);
    });

    it('should get trending recommendations', async () => {
      mockDataSource.query.mockResolvedValue([
        { ...mockCatalogItems[0], trend_score: 100 },
        { ...mockCatalogItems[1], trend_score: 80 },
      ]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.TRENDING,
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.TRENDING);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].algorithm).toBe('trending');
    });

    it('should get similar recommendations', async () => {
      mockCatalogItemRepository.findOne.mockResolvedValue(mockCatalogItems[0]);
      mockCatalogItemRepository.findByIds.mockResolvedValue([mockCatalogItems[1]]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.SIMILAR,
        itemId: '1',
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.SIMILAR);
      expect(catalogItemRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should get complementary recommendations', async () => {
      mockCatalogItemRepository.findOne.mockResolvedValue(mockCatalogItems[0]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.COMPLEMENTARY,
        itemId: '1',
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.COMPLEMENTARY);
    });

    it('should get popular recommendations', async () => {
      const request: RecommendationRequestDto = {
        type: RecommendationType.POPULAR,
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.POPULAR);
      expect(result.items).toBeDefined();
    });

    it('should get new arrivals', async () => {
      const request: RecommendationRequestDto = {
        type: RecommendationType.NEW_ARRIVALS,
        limit: 12,
      };

      const result = await service.getRecommendations(request);

      expect(result.type).toBe(RecommendationType.NEW_ARRIVALS);
      expect(result.items).toBeDefined();
    });

    it('should use cache for repeated requests', async () => {
      mockDataSource.query.mockResolvedValue([]);
      mockUserFavoriteRepository.find.mockResolvedValue([]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.TRENDING,
        limit: 12,
      };

      // First call
      await service.getRecommendations(request);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await service.getRecommendations(request);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should apply diversity when requested', async () => {
      mockDataSource.query.mockResolvedValue([
        { ...mockCatalogItems[0], trend_score: 100 },
        { ...mockCatalogItems[0], id: '3', trend_score: 99 },
        { ...mockCatalogItems[1], trend_score: 80 },
      ]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.TRENDING,
        limit: 2,
        includeDiversity: true,
      };

      const result = await service.getRecommendations(request);

      expect(result.items.length).toBeLessThanOrEqual(2);
    });

    it('should throw error for similar recommendations without itemId', async () => {
      const request: RecommendationRequestDto = {
        type: RecommendationType.SIMILAR,
        limit: 12,
      };

      await expect(service.getRecommendations(request)).rejects.toThrow(
        'itemId is required for similar recommendations'
      );
    });

    it('should throw error for complementary recommendations without itemId', async () => {
      const request: RecommendationRequestDto = {
        type: RecommendationType.COMPLEMENTARY,
        limit: 12,
      };

      await expect(service.getRecommendations(request)).rejects.toThrow(
        'itemId is required for complementary recommendations'
      );
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      expect(() => service.clearCache()).not.toThrow();
    });
  });

  describe('recommendation algorithms', () => {
    it('should calculate similarity correctly', async () => {
      const referenceItem = mockCatalogItems[0];
      mockCatalogItemRepository.findOne.mockResolvedValue(referenceItem);
      mockCatalogItemRepository.findByIds.mockResolvedValue([mockCatalogItems[1]]);

      const request: RecommendationRequestDto = {
        type: RecommendationType.SIMILAR,
        itemId: '1',
        limit: 5,
      };

      const result = await service.getRecommendations(request);

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].score).toBeGreaterThan(0);
    });

    it('should find complementary categories', async () => {
      const dressItem = { ...mockCatalogItems[0], category: 'dresses' };
      mockCatalogItemRepository.findOne.mockResolvedValue(dressItem);

      const request: RecommendationRequestDto = {
        type: RecommendationType.COMPLEMENTARY,
        itemId: '1',
        limit: 5,
      };

      await service.getRecommendations(request);

      // Should query for complementary categories
      expect(mockCatalogItemRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
