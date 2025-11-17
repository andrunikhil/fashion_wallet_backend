import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BrandPartnerService } from '../brand-partner.service';
import {
  BrandPartnerRepository,
  CatalogItemRepository,
} from '../../repositories';
import { PartnershipType } from '../../dto';

describe('BrandPartnerService', () => {
  let service: BrandPartnerService;
  let brandPartnerRepository: jest.Mocked<BrandPartnerRepository>;
  let catalogItemRepository: jest.Mocked<CatalogItemRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandPartnerService,
        {
          provide: BrandPartnerRepository,
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            findById: jest.fn(),
            findActive: jest.fn(),
            findByPartnershipType: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: CatalogItemRepository,
          useValue: {
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BrandPartnerService>(BrandPartnerService);
    brandPartnerRepository = module.get(BrandPartnerRepository);
    catalogItemRepository = module.get(CatalogItemRepository);

    jest.clearAllMocks();
  });

  describe('createBrandPartner', () => {
    const createDto = {
      name: 'Fashion House Inc.',
      description: 'Premium fashion brand',
      logoUrl: 'https://example.com/logo.png',
      websiteUrl: 'https://fashionhouse.com',
      partnershipType: PartnershipType.STANDARD,
      contactName: 'John Doe',
      contactEmail: 'john@fashionhouse.com',
      isActive: true,
      isFeatured: false,
    };

    it('should create a brand partner successfully', async () => {
      // Arrange
      const mockPartner = { id: 'partner-1', ...createDto };
      brandPartnerRepository.findOne.mockResolvedValue(null); // No duplicate
      brandPartnerRepository.create = jest.fn().mockReturnValue(mockPartner);
      brandPartnerRepository.save.mockResolvedValue(mockPartner as any);

      // Act
      const result = await service.createBrandPartner(createDto);

      // Assert
      expect(result).toEqual(mockPartner);
      expect(brandPartnerRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, deletedAt: null },
      });
      expect(brandPartnerRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if brand name already exists', async () => {
      // Arrange
      const existingPartner = { id: 'existing', name: createDto.name };
      brandPartnerRepository.findOne.mockResolvedValue(existingPartner as any);

      // Act & Assert
      await expect(service.createBrandPartner(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createBrandPartner(createDto)).rejects.toThrow(
        `Brand partner with name "${createDto.name}" already exists`,
      );
    });
  });

  describe('getBrandPartner', () => {
    it('should return brand partner by ID', async () => {
      // Arrange
      const mockPartner = {
        id: 'partner-1',
        name: 'Fashion House',
        partnershipType: PartnershipType.STANDARD,
      };
      brandPartnerRepository.findById.mockResolvedValue(mockPartner as any);

      // Act
      const result = await service.getBrandPartner('partner-1');

      // Assert
      expect(result).toEqual(mockPartner);
      expect(brandPartnerRepository.findById).toHaveBeenCalledWith('partner-1');
    });

    it('should throw NotFoundException if partner does not exist', async () => {
      // Arrange
      brandPartnerRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getBrandPartner('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getBrandPartner('non-existent')).rejects.toThrow(
        'Brand partner with ID non-existent not found',
      );
    });

    it('should cache brand partner on first call', async () => {
      // Arrange
      const mockPartner = { id: 'partner-1', name: 'Test' };
      brandPartnerRepository.findById.mockResolvedValue(mockPartner as any);

      // Act
      await service.getBrandPartner('partner-1');
      await service.getBrandPartner('partner-1');

      // Assert - should only call repository once
      expect(brandPartnerRepository.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateBrandPartner', () => {
    const updateDto = {
      name: 'Updated Fashion House',
      description: 'Updated description',
      isFeatured: true,
    };

    it('should update brand partner successfully', async () => {
      // Arrange
      const existing = {
        id: 'partner-1',
        name: 'Original Name',
        description: 'Original description',
      };
      const updated = { ...existing, ...updateDto };

      brandPartnerRepository.findOne
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(null); // No duplicate for new name

      brandPartnerRepository.save.mockResolvedValue(updated as any);

      // Act
      const result = await service.updateBrandPartner('partner-1', updateDto);

      // Assert
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(brandPartnerRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if partner does not exist', async () => {
      // Arrange
      brandPartnerRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateBrandPartner('non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already exists', async () => {
      // Arrange
      const existing = { id: 'partner-1', name: 'Original' };
      const duplicate = { id: 'partner-2', name: updateDto.name };

      brandPartnerRepository.findOne
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(duplicate as any);

      // Act & Assert
      await expect(service.updateBrandPartner('partner-1', updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateBrandPartner('partner-1', updateDto)).rejects.toThrow(
        `Brand partner with name "${updateDto.name}" already exists`,
      );
    });

    it('should clear cache after update', async () => {
      // Arrange
      const existing = { id: 'partner-1', name: 'Original' };
      const updated = { ...existing, name: 'Updated' };

      brandPartnerRepository.findById.mockResolvedValue(existing as any);
      brandPartnerRepository.findOne.mockResolvedValue(existing as any);
      brandPartnerRepository.save.mockResolvedValue(updated as any);

      // Act
      await service.getBrandPartner('partner-1'); // Cache it
      await service.updateBrandPartner('partner-1', { name: 'Updated' });
      await service.getBrandPartner('partner-1'); // Should fetch fresh

      // Assert - repository called twice (once for cache, once after update)
      expect(brandPartnerRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteBrandPartner', () => {
    it('should soft delete brand partner successfully', async () => {
      // Arrange
      const partner = { id: 'partner-1', name: 'Test Partner' };
      brandPartnerRepository.findOne.mockResolvedValue(partner as any);
      brandPartnerRepository.softDelete.mockResolvedValue(undefined);

      // Act
      await service.deleteBrandPartner('partner-1');

      // Assert
      expect(brandPartnerRepository.softDelete).toHaveBeenCalledWith('partner-1');
    });

    it('should throw NotFoundException if partner does not exist', async () => {
      // Arrange
      brandPartnerRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteBrandPartner('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should clear cache after deletion', async () => {
      // Arrange
      const partner = { id: 'partner-1', name: 'Test' };
      brandPartnerRepository.findById.mockResolvedValue(partner as any);
      brandPartnerRepository.findOne.mockResolvedValue(partner as any);
      brandPartnerRepository.softDelete.mockResolvedValue(undefined);

      // Act
      await service.getBrandPartner('partner-1'); // Cache it
      await service.deleteBrandPartner('partner-1'); // Should clear cache

      // Wait a bit for async cache clear
      await new Promise(resolve => setTimeout(resolve, 10));

      // The cache should be cleared
      const cacheValue = (service as any).getFromCache('brand-partner:partner-1');
      expect(cacheValue).toBeNull();
    });
  });

  describe('listBrandPartners', () => {
    it('should return paginated brand partners', async () => {
      // Arrange
      const mockPartners = [
        { id: 'partner-1', name: 'Partner 1' },
        { id: 'partner-2', name: 'Partner 2' },
      ];
      brandPartnerRepository.findAndCount.mockResolvedValue([mockPartners as any, 2]);

      // Act
      const result = await service.listBrandPartners(1, 10, false);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter active partners only when activeOnly is true', async () => {
      // Arrange
      const activePartners = [{ id: 'partner-1', name: 'Active', isActive: true }];
      brandPartnerRepository.findAndCount.mockResolvedValue([activePartners as any, 1]);

      // Act
      const result = await service.listBrandPartners(1, 10, true);

      // Assert
      expect(brandPartnerRepository.findAndCount).toHaveBeenCalledWith({
        where: { deletedAt: null, isActive: true },
        order: { name: 'ASC' },
        skip: 0,
        take: 10,
      });
    });

    it('should use default pagination values', async () => {
      // Arrange
      brandPartnerRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.listBrandPartners();

      // Assert
      expect(brandPartnerRepository.findAndCount).toHaveBeenCalledWith({
        where: { deletedAt: null },
        order: { name: 'ASC' },
        skip: 0,
        take: 24,
      });
    });
  });

  describe('getActiveBrandPartners', () => {
    it('should return active brand partners', async () => {
      // Arrange
      const activePartners = [
        { id: 'partner-1', name: 'Active 1', isActive: true },
        { id: 'partner-2', name: 'Active 2', isActive: true },
      ];
      brandPartnerRepository.findActive.mockResolvedValue(activePartners as any);

      // Act
      const result = await service.getActiveBrandPartners();

      // Assert
      expect(result).toEqual(activePartners);
      expect(brandPartnerRepository.findActive).toHaveBeenCalled();
    });

    it('should cache active partners', async () => {
      // Arrange
      const activePartners = [{ id: 'partner-1', name: 'Active', isActive: true }];
      brandPartnerRepository.findActive.mockResolvedValue(activePartners as any);

      // Act
      await service.getActiveBrandPartners();
      await service.getActiveBrandPartners();

      // Assert - should only call repository once
      expect(brandPartnerRepository.findActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBrandCatalogItems', () => {
    it('should return paginated catalog items for brand', async () => {
      // Arrange
      const partner = { id: 'partner-1', name: 'Test Brand' };
      const catalogItems = [
        { id: 'item-1', name: 'Item 1', brandPartnerId: 'partner-1' },
        { id: 'item-2', name: 'Item 2', brandPartnerId: 'partner-1' },
      ];

      brandPartnerRepository.findById.mockResolvedValue(partner as any);
      catalogItemRepository.findAndCount.mockResolvedValue([catalogItems as any, 2]);

      // Act
      const result = await service.getBrandCatalogItems('partner-1', 1, 10);

      // Assert
      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(catalogItemRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          brandPartnerId: 'partner-1',
          isActive: true,
          deletedAt: null,
        },
        relations: ['brandPartner'],
        order: {
          popularityScore: 'DESC',
          createdAt: 'DESC',
        },
        skip: 0,
        take: 10,
      });
    });

    it('should throw NotFoundException if brand partner does not exist', async () => {
      // Arrange
      brandPartnerRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getBrandCatalogItems('non-existent', 1, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use default pagination values', async () => {
      // Arrange
      const partner = { id: 'partner-1', name: 'Test' };
      brandPartnerRepository.findById.mockResolvedValue(partner as any);
      catalogItemRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.getBrandCatalogItems('partner-1');

      // Assert
      expect(catalogItemRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 24,
        }),
      );
    });
  });

  describe('getBrandPartnersByType', () => {
    it('should return brand partners by partnership type', async () => {
      // Arrange
      const exclusivePartners = [
        { id: 'partner-1', name: 'Exclusive 1', partnershipType: PartnershipType.EXCLUSIVE },
        { id: 'partner-2', name: 'Exclusive 2', partnershipType: PartnershipType.EXCLUSIVE },
      ];
      brandPartnerRepository.findByPartnershipType.mockResolvedValue(
        exclusivePartners as any,
      );

      // Act
      const result = await service.getBrandPartnersByType(PartnershipType.EXCLUSIVE);

      // Assert
      expect(result).toEqual(exclusivePartners);
      expect(brandPartnerRepository.findByPartnershipType).toHaveBeenCalledWith(
        PartnershipType.EXCLUSIVE,
      );
    });

    it('should cache partners by type', async () => {
      // Arrange
      const featuredPartners = [
        { id: 'partner-1', partnershipType: PartnershipType.FEATURED },
      ];
      brandPartnerRepository.findByPartnershipType.mockResolvedValue(
        featuredPartners as any,
      );

      // Act
      await service.getBrandPartnersByType(PartnershipType.FEATURED);
      await service.getBrandPartnersByType(PartnershipType.FEATURED);

      // Assert - should only call repository once
      expect(brandPartnerRepository.findByPartnershipType).toHaveBeenCalledTimes(1);
    });

    it('should handle all partnership types', async () => {
      // Arrange
      brandPartnerRepository.findByPartnershipType.mockResolvedValue([]);

      // Act & Assert - should not throw for any type
      await expect(
        service.getBrandPartnersByType(PartnershipType.EXCLUSIVE),
      ).resolves.toBeDefined();
      await expect(
        service.getBrandPartnersByType(PartnershipType.FEATURED),
      ).resolves.toBeDefined();
      await expect(
        service.getBrandPartnersByType(PartnershipType.STANDARD),
      ).resolves.toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should clear active partners cache on create', async () => {
      // Arrange
      const createDto = {
        name: 'New Partner',
        partnershipType: PartnershipType.STANDARD,
      };
      brandPartnerRepository.findOne.mockResolvedValue(null);
      brandPartnerRepository.create = jest.fn().mockReturnValue({ id: 'new' });
      brandPartnerRepository.save.mockResolvedValue({ id: 'new' } as any);
      brandPartnerRepository.findActive.mockResolvedValue([]);

      // Act
      await service.getActiveBrandPartners(); // Cache it
      await service.createBrandPartner(createDto as any); // Should clear cache
      await service.getActiveBrandPartners(); // Should fetch fresh

      // Assert - repository called twice
      expect(brandPartnerRepository.findActive).toHaveBeenCalledTimes(2);
    });

    it('should handle cache expiry', async () => {
      // Arrange
      const partner = { id: 'partner-1', name: 'Test' };
      brandPartnerRepository.findById.mockResolvedValue(partner as any);

      // Act
      await service.getBrandPartner('partner-1'); // Cache it

      // Manually expire the cache by accessing private method
      const cache = (service as any).cache;
      const cacheKey = 'brand-partner:partner-1';
      if (cache.has(cacheKey)) {
        const entry = cache.get(cacheKey);
        entry.expiry = Date.now() - 1000; // Set expiry to past
      }

      await service.getBrandPartner('partner-1'); // Should fetch fresh

      // Assert - repository called twice (initial + after expiry)
      expect(brandPartnerRepository.findById).toHaveBeenCalledTimes(2);
    });
  });
});
