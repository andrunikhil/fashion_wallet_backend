import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CollectionService } from '../collection.service';
import {
  CollectionRepository,
  CollectionItemRepository,
  CatalogItemRepository,
} from '../../repositories';
import { Collection, CollectionItem } from '../../entities';

describe('CollectionService', () => {
  let service: CollectionService;
  let collectionRepository: jest.Mocked<CollectionRepository>;
  let collectionItemRepository: jest.Mocked<CollectionItemRepository>;
  let catalogItemRepository: jest.Mocked<CatalogItemRepository>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(),
          },
        },
        {
          provide: CollectionRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            findAndCount: jest.fn(),
            findByIdWithItems: jest.fn(),
            findFeatured: jest.fn(),
            findPublic: jest.fn(),
          },
        },
        {
          provide: CollectionItemRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            existsInCollection: jest.fn(),
            getMaxOrder: jest.fn(),
            findByCollectionId: jest.fn(),
            reorderItems: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: CatalogItemRepository,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
    collectionRepository = module.get(CollectionRepository);
    collectionItemRepository = module.get(CollectionItemRepository);
    catalogItemRepository = module.get(CatalogItemRepository);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  describe('createCollection', () => {
    const createDto = {
      name: 'Summer Collection 2024',
      description: 'Hot summer trends',
      category: 'seasonal',
      tags: ['summer', 'trending'],
      isPublic: true,
      isFeatured: true,
    };

    it('should create a collection successfully', async () => {
      // Arrange
      const mockCollection = { id: 'coll-1', ...createDto };
      collectionRepository.findOne.mockResolvedValue(null); // No duplicate
      collectionRepository.create = jest.fn().mockReturnValue(mockCollection);
      collectionRepository.save.mockResolvedValue(mockCollection as any);

      // Act
      const result = await service.createCollection(createDto);

      // Assert
      expect(result).toEqual(mockCollection);
      expect(collectionRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, deletedAt: null },
      });
      expect(collectionRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if collection name already exists', async () => {
      // Arrange
      const existingCollection = { id: 'existing', name: createDto.name };
      collectionRepository.findOne.mockResolvedValue(existingCollection as any);

      // Act & Assert
      await expect(service.createCollection(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createCollection(createDto)).rejects.toThrow(
        `Collection with name "${createDto.name}" already exists`,
      );
    });
  });

  describe('getCollection', () => {
    it('should return collection with items', async () => {
      // Arrange
      const mockCollection = {
        id: 'coll-1',
        name: 'Test Collection',
        items: [
          { id: 'item-1', catalogItemId: 'cat-1', orderIndex: 0 },
          { id: 'item-2', catalogItemId: 'cat-2', orderIndex: 1 },
        ],
      };
      collectionRepository.findByIdWithItems.mockResolvedValue(mockCollection as any);

      // Act
      const result = await service.getCollection('coll-1');

      // Assert
      expect(result).toEqual(mockCollection);
      expect(collectionRepository.findByIdWithItems).toHaveBeenCalledWith('coll-1');
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      // Arrange
      collectionRepository.findByIdWithItems.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCollection('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCollection('non-existent')).rejects.toThrow(
        'Collection with ID non-existent not found',
      );
    });
  });

  describe('updateCollection', () => {
    const updateDto = {
      name: 'Updated Collection',
      description: 'Updated description',
      isFeatured: false,
    };

    it('should update collection successfully', async () => {
      // Arrange
      const existingCollection = {
        id: 'coll-1',
        name: 'Original Name',
        description: 'Original description',
        isFeatured: true,
      };
      const updatedCollection = { ...existingCollection, ...updateDto };

      collectionRepository.findOne
        .mockResolvedValueOnce(existingCollection as any) // First call - get existing
        .mockResolvedValueOnce(null); // Second call - check duplicate

      collectionRepository.save.mockResolvedValue(updatedCollection as any);

      // Act
      const result = await service.updateCollection('coll-1', updateDto);

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(collectionRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      // Arrange
      collectionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateCollection('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new name already exists', async () => {
      // Arrange
      const existing = { id: 'coll-1', name: 'Original' };
      const duplicate = { id: 'coll-2', name: updateDto.name };

      collectionRepository.findOne
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(duplicate as any);

      // Act & Assert
      await expect(service.updateCollection('coll-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('deleteCollection', () => {
    it('should soft delete collection successfully', async () => {
      // Arrange
      const collection = {
        id: 'coll-1',
        name: 'Test Collection',
        isFeatured: true,
      };
      collectionRepository.findOne.mockResolvedValue(collection as any);
      collectionRepository.softDelete.mockResolvedValue(undefined);

      // Act
      await service.deleteCollection('coll-1');

      // Assert
      expect(collectionRepository.softDelete).toHaveBeenCalledWith('coll-1');
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      // Arrange
      collectionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteCollection('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listCollections', () => {
    it('should return paginated collections', async () => {
      // Arrange
      const mockCollections = [
        { id: 'coll-1', name: 'Collection 1' },
        { id: 'coll-2', name: 'Collection 2' },
      ];
      collectionRepository.findAndCount.mockResolvedValue([mockCollections as any, 2]);

      // Act
      const result = await service.listCollections(1, 10);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter public collections only', async () => {
      // Arrange
      const mockCollections = [{ id: 'coll-1', name: 'Public Collection', isPublic: true }];
      collectionRepository.findPublic.mockResolvedValue({
        collections: mockCollections as any,
        total: 1,
      });

      // Act
      const result = await service.listCollections(1, 10, true);

      // Assert
      expect(collectionRepository.findPublic).toHaveBeenCalledWith(1, 10);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('addItemToCollection', () => {
    const addItemDto = {
      catalogItemId: 'cat-1',
      orderIndex: 5,
    };

    it('should add item to collection successfully', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test Collection' };
      const catalogItem = { id: 'cat-1', name: 'Test Item' };
      const collectionItem = {
        id: 'ci-1',
        collectionId: 'coll-1',
        catalogItemId: 'cat-1',
        orderIndex: 5,
      };

      collectionRepository.findOne.mockResolvedValue(collection as any);
      catalogItemRepository.findOne.mockResolvedValue(catalogItem as any);
      collectionItemRepository.existsInCollection.mockResolvedValue(false);
      collectionItemRepository.create = jest.fn().mockReturnValue(collectionItem);
      collectionItemRepository.save.mockResolvedValue(collectionItem as any);

      // Act
      const result = await service.addItemToCollection('coll-1', addItemDto);

      // Assert
      expect(result).toEqual(collectionItem);
      expect(collectionItemRepository.save).toHaveBeenCalled();
    });

    it('should auto-increment order index if not provided', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test Collection' };
      const catalogItem = { id: 'cat-1', name: 'Test Item' };
      const dtoWithoutOrder = { catalogItemId: 'cat-1' };

      collectionRepository.findOne.mockResolvedValue(collection as any);
      catalogItemRepository.findOne.mockResolvedValue(catalogItem as any);
      collectionItemRepository.existsInCollection.mockResolvedValue(false);
      collectionItemRepository.getMaxOrder.mockResolvedValue(3);
      collectionItemRepository.create = jest.fn().mockReturnValue({
        id: 'ci-1',
        orderIndex: 4,
      });
      collectionItemRepository.save.mockResolvedValue({ id: 'ci-1', orderIndex: 4 } as any);

      // Act
      await service.addItemToCollection('coll-1', dtoWithoutOrder);

      // Assert
      expect(collectionItemRepository.getMaxOrder).toHaveBeenCalledWith('coll-1');
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      // Arrange
      collectionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addItemToCollection('non-existent', addItemDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if catalog item does not exist', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test' };
      collectionRepository.findOne.mockResolvedValue(collection as any);
      catalogItemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addItemToCollection('coll-1', addItemDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if item already in collection', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test' };
      const catalogItem = { id: 'cat-1', name: 'Item' };

      collectionRepository.findOne.mockResolvedValue(collection as any);
      catalogItemRepository.findOne.mockResolvedValue(catalogItem as any);
      collectionItemRepository.existsInCollection.mockResolvedValue(true);

      // Act & Assert
      await expect(service.addItemToCollection('coll-1', addItemDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.addItemToCollection('coll-1', addItemDto)).rejects.toThrow(
        'Item already exists in this collection',
      );
    });
  });

  describe('removeItemFromCollection', () => {
    it('should remove item from collection successfully', async () => {
      // Arrange
      const collectionItem = {
        id: 'ci-1',
        collectionId: 'coll-1',
        catalogItemId: 'cat-1',
      };
      collectionItemRepository.findOne.mockResolvedValue(collectionItem as any);
      collectionItemRepository.delete.mockResolvedValue(undefined);

      // Act
      await service.removeItemFromCollection('coll-1', 'cat-1');

      // Assert
      expect(collectionItemRepository.delete).toHaveBeenCalledWith('ci-1');
    });

    it('should throw NotFoundException if item not in collection', async () => {
      // Arrange
      collectionItemRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.removeItemFromCollection('coll-1', 'cat-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeItemFromCollection('coll-1', 'cat-1'),
      ).rejects.toThrow('Item not found in collection');
    });
  });

  describe('reorderCollectionItems', () => {
    const reorderDto = {
      items: [
        { catalogItemId: 'cat-1', orderIndex: 2 },
        { catalogItemId: 'cat-2', orderIndex: 0 },
        { catalogItemId: 'cat-3', orderIndex: 1 },
      ],
    };

    it('should reorder items successfully', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test' };
      const collectionItems = [
        { id: 'ci-1', catalogItemId: 'cat-1', orderIndex: 0 },
        { id: 'ci-2', catalogItemId: 'cat-2', orderIndex: 1 },
        { id: 'ci-3', catalogItemId: 'cat-3', orderIndex: 2 },
      ];

      collectionRepository.findOne.mockResolvedValue(collection as any);
      collectionItemRepository.findByCollectionId.mockResolvedValue(collectionItems as any);
      collectionItemRepository.reorderItems.mockResolvedValue(undefined);

      // Act
      await service.reorderCollectionItems('coll-1', reorderDto);

      // Assert
      expect(collectionItemRepository.reorderItems).toHaveBeenCalledWith('coll-1', [
        { id: 'ci-1', orderIndex: 2 },
        { id: 'ci-2', orderIndex: 0 },
        { id: 'ci-3', orderIndex: 1 },
      ]);
    });

    it('should throw NotFoundException if collection does not exist', async () => {
      // Arrange
      collectionRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.reorderCollectionItems('non-existent', reorderDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if item not in collection', async () => {
      // Arrange
      const collection = { id: 'coll-1', name: 'Test' };
      const collectionItems = [
        { id: 'ci-1', catalogItemId: 'cat-1', orderIndex: 0 },
        // cat-2 and cat-3 are missing!
      ];

      collectionRepository.findOne.mockResolvedValue(collection as any);
      collectionItemRepository.findByCollectionId.mockResolvedValue(collectionItems as any);

      // Act & Assert
      await expect(
        service.reorderCollectionItems('coll-1', reorderDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFeaturedCollections', () => {
    it('should return featured collections', async () => {
      // Arrange
      const featuredCollections = [
        { id: 'coll-1', name: 'Featured 1', isFeatured: true },
        { id: 'coll-2', name: 'Featured 2', isFeatured: true },
      ];
      collectionRepository.findFeatured.mockResolvedValue(featuredCollections as any);

      // Act
      const result = await service.getFeaturedCollections(10);

      // Assert
      expect(result).toEqual(featuredCollections);
      expect(collectionRepository.findFeatured).toHaveBeenCalledWith(10);
    });

    it('should use default limit if not provided', async () => {
      // Arrange
      collectionRepository.findFeatured.mockResolvedValue([]);

      // Act
      await service.getFeaturedCollections();

      // Assert
      expect(collectionRepository.findFeatured).toHaveBeenCalledWith(10);
    });
  });

  describe('caching', () => {
    it('should return cached collection on second call', async () => {
      // Arrange
      const mockCollection = { id: 'coll-1', name: 'Test' };
      collectionRepository.findByIdWithItems.mockResolvedValue(mockCollection as any);

      // Act
      const result1 = await service.getCollection('coll-1');
      const result2 = await service.getCollection('coll-1');

      // Assert
      expect(collectionRepository.findByIdWithItems).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(mockCollection);
    });

    it('should invalidate cache on update', async () => {
      // Arrange
      const existing = { id: 'coll-1', name: 'Original' };
      const updated = { id: 'coll-1', name: 'Updated' };

      collectionRepository.findByIdWithItems.mockResolvedValue(existing as any);
      collectionRepository.findOne.mockResolvedValue(existing as any);
      collectionRepository.save.mockResolvedValue(updated as any);

      // Act
      await service.getCollection('coll-1'); // Cache it
      await service.updateCollection('coll-1', { name: 'Updated' }); // Invalidate cache
      await service.getCollection('coll-1'); // Should fetch fresh

      // Assert - should have called repository twice (once for cache, once after invalidation)
      expect(collectionRepository.findByIdWithItems).toHaveBeenCalledTimes(2);
    });
  });
});
