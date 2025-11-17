/**
 * RecommendationController Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationController } from '../../controllers/recommendation.controller';
import { RecommendationService } from '../../services/recommendation.service';
import { UserInteractionService } from '../../services/user-interaction.service';
import {
  RecommendationType,
  RecommendationRequestDto,
  RecommendationResponseDto,
} from '../../dto/recommendation.dto';

describe('RecommendationController', () => {
  let controller: RecommendationController;
  let recommendationService: RecommendationService;
  let userInteractionService: UserInteractionService;

  const mockRecommendationResponse: RecommendationResponseDto = {
    items: [
      {
        item: { id: '1', name: 'Summer Dress' },
        score: 85.5,
        reason: 'Based on your browsing history',
        algorithm: 'collaborative_filtering',
      },
      {
        item: { id: '2', name: 'Denim Jacket' },
        score: 80.0,
        reason: 'Popular in your favorites',
        algorithm: 'content_based',
      },
    ],
    type: RecommendationType.PERSONALIZED,
    took: 150,
    total: 2,
  };

  const mockRecommendationService = {
    getRecommendations: jest.fn(),
    clearCache: jest.fn(),
  };

  const mockUserInteractionService = {
    trackInteraction: jest.fn(),
    getUserRecentInteractions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationController],
      providers: [
        {
          provide: RecommendationService,
          useValue: mockRecommendationService,
        },
        {
          provide: UserInteractionService,
          useValue: mockUserInteractionService,
        },
      ],
    }).compile();

    controller = module.get<RecommendationController>(RecommendationController);
    recommendationService = module.get<RecommendationService>(
      RecommendationService
    );
    userInteractionService = module.get<UserInteractionService>(
      UserInteractionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /catalog/recommendations', () => {
    it('should get recommendations with full request', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(
        mockRecommendationResponse
      );

      const request: RecommendationRequestDto = {
        type: RecommendationType.PERSONALIZED,
        userId: 'user-1',
        limit: 12,
      };

      const result = await controller.getRecommendations(request);

      expect(result).toEqual(mockRecommendationResponse);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        request
      );
    });

    it('should handle different recommendation types', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.TRENDING,
      });

      const request: RecommendationRequestDto = {
        type: RecommendationType.TRENDING,
        limit: 12,
      };

      await controller.getRecommendations(request);

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        request
      );
    });
  });

  describe('GET /catalog/recommendations/personalized/:userId', () => {
    it('should get personalized recommendations', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(
        mockRecommendationResponse
      );

      const result = await controller.getPersonalized('user-1', 12);

      expect(result).toEqual(mockRecommendationResponse);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.PERSONALIZED,
          userId: 'user-1',
          limit: 12,
        })
      );
    });

    it('should use default limit when not provided', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(
        mockRecommendationResponse
      );

      await controller.getPersonalized('user-1');

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 12,
        })
      );
    });
  });

  describe('GET /catalog/recommendations/trending', () => {
    it('should get trending items', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.TRENDING,
      });

      const result = await controller.getTrending(12);

      expect(result.type).toBe(RecommendationType.TRENDING);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.TRENDING,
          limit: 12,
        })
      );
    });

    it('should filter by category', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue(
        mockRecommendationResponse
      );

      await controller.getTrending(12, 'dresses');

      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ['dresses'],
        })
      );
    });
  });

  describe('GET /catalog/recommendations/similar/:itemId', () => {
    it('should get similar items', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.SIMILAR,
      });

      const result = await controller.getSimilar('item-1', 12);

      expect(result.type).toBe(RecommendationType.SIMILAR);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.SIMILAR,
          itemId: 'item-1',
          limit: 12,
        })
      );
    });
  });

  describe('GET /catalog/recommendations/complementary/:itemId', () => {
    it('should get complementary items', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.COMPLEMENTARY,
      });

      const result = await controller.getComplementary('item-1', 12);

      expect(result.type).toBe(RecommendationType.COMPLEMENTARY);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.COMPLEMENTARY,
          itemId: 'item-1',
          limit: 12,
        })
      );
    });
  });

  describe('GET /catalog/recommendations/popular', () => {
    it('should get popular items', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.POPULAR,
      });

      const result = await controller.getPopular(12);

      expect(result.type).toBe(RecommendationType.POPULAR);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.POPULAR,
          limit: 12,
        })
      );
    });
  });

  describe('GET /catalog/recommendations/new-arrivals', () => {
    it('should get new arrivals', async () => {
      mockRecommendationService.getRecommendations.mockResolvedValue({
        ...mockRecommendationResponse,
        type: RecommendationType.NEW_ARRIVALS,
      });

      const result = await controller.getNewArrivals(12);

      expect(result.type).toBe(RecommendationType.NEW_ARRIVALS);
      expect(recommendationService.getRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          type: RecommendationType.NEW_ARRIVALS,
          limit: 12,
        })
      );
    });
  });

  describe('POST /catalog/recommendations/track', () => {
    it('should track user interaction', async () => {
      mockUserInteractionService.trackInteraction.mockResolvedValue(undefined);

      const interaction = {
        userId: 'user-1',
        itemId: 'item-1',
        interactionType: 'view' as const,
      };

      await controller.trackInteraction(interaction);

      expect(userInteractionService.trackInteraction).toHaveBeenCalledWith(
        interaction
      );
    });
  });

  describe('GET /catalog/recommendations/interactions/:userId', () => {
    it('should get user interactions', async () => {
      const mockInteractions = [
        {
          userId: 'user-1',
          itemId: 'item-1',
          interactionType: 'view',
          timestamp: new Date(),
        },
      ];

      mockUserInteractionService.getUserRecentInteractions.mockResolvedValue(
        mockInteractions
      );

      const result = await controller.getUserInteractions('user-1', 50);

      expect(result).toEqual(mockInteractions);
      expect(
        userInteractionService.getUserRecentInteractions
      ).toHaveBeenCalledWith('user-1', 50, undefined);
    });

    it('should filter by interaction type', async () => {
      mockUserInteractionService.getUserRecentInteractions.mockResolvedValue([]);

      await controller.getUserInteractions('user-1', 50, 'view');

      expect(
        userInteractionService.getUserRecentInteractions
      ).toHaveBeenCalledWith('user-1', 50, 'view');
    });
  });

  describe('error handling', () => {
    it('should propagate service errors', async () => {
      mockRecommendationService.getRecommendations.mockRejectedValue(
        new Error('Service error')
      );

      const request: RecommendationRequestDto = {
        type: RecommendationType.POPULAR,
        limit: 12,
      };

      await expect(controller.getRecommendations(request)).rejects.toThrow(
        'Service error'
      );
    });
  });
});
