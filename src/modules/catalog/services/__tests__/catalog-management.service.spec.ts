import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CatalogManagementService } from '../catalog-management.service';
import {
  CatalogItemRepository,
  CatalogFlexibleRepository,
  BrandPartnerRepository,
} from '../../repositories';
import { CatalogItemType } from '../../dto';

describe('CatalogManagementService', () => {
  let service: CatalogManagementService;
  let catalogItemRepository: jest.Mocked<CatalogItemRepository>;
  let catalogFlexibleRepository: jest.Mocked<CatalogFlexibleRepository>;
  let brandPartnerRepository: jest.Mocked<BrandPartnerRepository>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogManagementService,
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
        {
          provide: CatalogItemRepository,
          useValue: {
            findByIdWithRelations: jest.fn(),
            findOne: jest.fn(),
            softDelete: jest.fn(),
            findAllPaginated: jest.fn(),
            incrementViewCount: jest.fn(),
          },
        },
        {
          provide: CatalogFlexibleRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: BrandPartnerRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CatalogManagementService>(CatalogManagementService);
    catalogItemRepository = module.get(CatalogItemRepository);
    catalogFlexibleRepository = module.get(CatalogFlexibleRepository);
    brandPartnerRepository = module.get(BrandPartnerRepository);
    dataSource = module.get(DataSource);

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('createCatalogItem', () => {
    const createDto = {
      type: CatalogItemType.SILHOUETTE,
      name: 'Test Silhouette',
      description: 'Test description',
      category: 'tops',
      tags: ['casual', 'summer'],
      properties: {
        garmentType: 'shirt',
        fitType: 'regular',
        silhouetteStyle: 'classic',
        sizes: ['S', 'M', 'L'],
      },
    };

    it('should create a catalog item successfully', async () => {
      // Arrange
      const mockCatalogItem = { id: 'test-id', ...createDto };
      catalogItemRepository.findOne.mockResolvedValue(null); // No duplicate
      mockQueryRunner.manager.create.mockReturnValue(mockCatalogItem);
      mockQueryRunner.manager.save.mockResolvedValue(mockCatalogItem);

      // Act
      const result = await service.createCatalogItem(createDto);

      // Assert
      expect(result).toEqual(mockCatalogItem);
      expect(catalogItemRepository.findOne).toHaveBeenCalledWith({
        where: {
          name: createDto.name,
          type: createDto.type,
          deletedAt: null,
        },
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if duplicate name exists', async () => {
      // Arrange
      const existingItem = { id: 'existing-id', name: createDto.name };
      catalogItemRepository.findOne.mockResolvedValue(existingItem as any);

      // Act & Assert
      await expect(service.createCatalogItem(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      // Arrange
      catalogItemRepository.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(service.createCatalogItem(createDto)).rejects.toThrow('DB Error');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getCatalogItem', () => {
    it('should return catalog item from repository', async () => {
      // Arrange
      const mockItem = {
        id: 'test-id',
        name: 'Test Item',
        type: CatalogItemType.SILHOUETTE,
      };
      catalogItemRepository.findByIdWithRelations.mockResolvedValue(mockItem as any);

      // Act
      const result = await service.getCatalogItem('test-id');

      // Assert
      expect(result).toEqual(mockItem);
      expect(catalogItemRepository.findByIdWithRelations).toHaveBeenCalledWith('test-id');
      expect(catalogItemRepository.incrementViewCount).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if item does not exist', async () => {
      // Arrange
      catalogItemRepository.findByIdWithRelations.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getCatalogItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCatalogItem', () => {
    it('should soft delete catalog item', async () => {
      // Arrange
      const mockItem = { id: 'test-id', name: 'Test Item' };
      catalogItemRepository.findByIdWithRelations.mockResolvedValue(mockItem as any);
      catalogItemRepository.softDelete.mockResolvedValue(undefined);

      // Act
      await service.deleteCatalogItem('test-id');

      // Assert
      expect(catalogItemRepository.softDelete).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if item does not exist', async () => {
      // Arrange
      catalogItemRepository.findByIdWithRelations.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteCatalogItem('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listCatalogItems', () => {
    it('should return paginated catalog items', async () => {
      // Arrange
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      catalogItemRepository.findAllPaginated.mockResolvedValue({
        items: mockItems as any,
        total: 2,
      });

      // Act
      const result = await service.listCatalogItems({
        page: 1,
        limit: 24,
      });

      // Assert
      expect(result.items).toEqual(mockItems);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(24);
    });
  });

  describe('extractSearchTerms', () => {
    it('should extract search terms from catalog item', () => {
      // This is a private method, so we test it indirectly through createCatalogItem
      // or we can use TypeScript's bracket notation to test private methods
      const dto = {
        name: 'Summer Dress',
        description: 'A beautiful summer dress',
        category: 'dresses',
        tags: ['casual', 'beach'],
      };

      // Access private method for testing (TypeScript workaround)
      const terms = (service as any).extractSearchTerms(dto);

      expect(terms).toContain('summer dress');
      expect(terms).toContain('beautiful');
      expect(terms).toContain('dresses');
      expect(terms).toContain('casual');
      expect(terms).toContain('beach');
    });
  });
});
