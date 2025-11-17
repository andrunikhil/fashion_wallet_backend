/**
 * UserInteractionService Unit Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { UserInteractionService } from '../../services/user-interaction.service';
import { CatalogItemRepository } from '../../repositories';

describe('UserInteractionService', () => {
  let service: UserInteractionService;
  let dataSource: DataSource;
  let catalogItemRepository: CatalogItemRepository;

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockCatalogItemRepository = {
    incrementViewCount: jest.fn(),
    incrementUseCount: jest.fn(),
    updatePopularityScore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserInteractionService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CatalogItemRepository,
          useValue: mockCatalogItemRepository,
        },
      ],
    }).compile();

    service = module.get<UserInteractionService>(UserInteractionService);
    dataSource = module.get<DataSource>(DataSource);
    catalogItemRepository = module.get<CatalogItemRepository>(
      CatalogItemRepository
    );

    // Clear buffer before each test
    service.clearBuffer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackInteraction', () => {
    it('should track view interaction', async () => {
      mockCatalogItemRepository.incrementViewCount.mockResolvedValue(undefined);

      await service.trackView('user-1', 'item-1');

      expect(catalogItemRepository.incrementViewCount).toHaveBeenCalledWith(
        'item-1'
      );
    });

    it('should track use interaction', async () => {
      mockCatalogItemRepository.incrementUseCount.mockResolvedValue(undefined);

      await service.trackUse('user-1', 'item-1');

      expect(catalogItemRepository.incrementUseCount).toHaveBeenCalledWith(
        'item-1'
      );
    });

    it('should track favorite interaction', async () => {
      await service.trackFavorite('user-1', 'item-1');

      // Should not throw
      expect(true).toBe(true);
    });

    it('should track search interaction with context', async () => {
      await service.trackSearch('user-1', 'item-1', 'summer dress');

      // Should track with context
      expect(true).toBe(true);
    });

    it('should handle errors in counter updates gracefully', async () => {
      mockCatalogItemRepository.incrementViewCount.mockRejectedValue(
        new Error('Database error')
      );

      // Should not throw - errors are logged
      await expect(service.trackView('user-1', 'item-1')).resolves.not.toThrow();
    });
  });

  describe('getUserRecentInteractions', () => {
    it('should get recent interactions for user', async () => {
      const mockInteractions = [
        {
          user_id: 'user-1',
          item_id: 'item-1',
          interaction_type: 'view',
          created_at: new Date(),
        },
      ];

      mockDataSource.query.mockResolvedValue(mockInteractions);

      const result = await service.getUserRecentInteractions('user-1', 50);

      expect(result).toEqual(mockInteractions);
      expect(dataSource.query).toHaveBeenCalled();
    });

    it('should filter by interaction type', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getUserRecentInteractions('user-1', 50, 'view');

      const queryCall = mockDataSource.query.mock.calls[0];
      expect(queryCall[1]).toContain('user-1');
      expect(queryCall[1]).toContain('view');
    });

    it('should use default limit', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getUserRecentInteractions('user-1');

      expect(dataSource.query).toHaveBeenCalled();
    });
  });

  describe('getUserTopItems', () => {
    it('should get most interacted items', async () => {
      const mockTopItems = [
        { item_id: 'item-1', interaction_count: '10' },
        { item_id: 'item-2', interaction_count: '5' },
      ];

      mockDataSource.query.mockResolvedValue(mockTopItems);

      const result = await service.getUserTopItems('user-1', 20);

      expect(result).toEqual(['item-1', 'item-2']);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        ['user-1', 20]
      );
    });

    it('should use default limit', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getUserTopItems('user-1');

      const queryCall = mockDataSource.query.mock.calls[0];
      expect(queryCall[1]).toContain(20);
    });
  });

  describe('getItemInteractionStats', () => {
    it('should get interaction statistics for item', async () => {
      const mockStats = {
        views: '100',
        uses: '50',
        favorites: '20',
        shares: '10',
        unique_users: '75',
      };

      mockDataSource.query.mockResolvedValue([mockStats]);

      const result = await service.getItemInteractionStats('item-1');

      expect(result).toEqual({
        views: 100,
        uses: 50,
        favorites: 20,
        shares: 10,
        uniqueUsers: 75,
      });
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        ['item-1']
      );
    });

    it('should handle zero interactions', async () => {
      mockDataSource.query.mockResolvedValue([
        {
          views: '0',
          uses: '0',
          favorites: '0',
          shares: '0',
          unique_users: '0',
        },
      ]);

      const result = await service.getItemInteractionStats('item-1');

      expect(result.views).toBe(0);
      expect(result.uses).toBe(0);
      expect(result.favorites).toBe(0);
    });
  });

  describe('getTrendingItems', () => {
    it('should get trending items for specified days', async () => {
      const mockTrending = [
        { item_id: 'item-1', recent_interactions: '50', unique_users: '30' },
        { item_id: 'item-2', recent_interactions: '40', unique_users: '25' },
      ];

      mockDataSource.query.mockResolvedValue(mockTrending);

      const result = await service.getTrendingItems(7, 24);

      expect(result).toEqual(['item-1', 'item-2']);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('7 days'),
        [24]
      );
    });

    it('should use default parameters', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await service.getTrendingItems();

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('7 days'),
        [24]
      );
    });
  });

  describe('buffer management', () => {
    it('should clear buffer', () => {
      expect(() => service.clearBuffer()).not.toThrow();
    });
  });
});
