import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import {
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
  CatalogFilterDto,
  PaginatedResultDto,
  CatalogItemType,
  SortField,
  SortOrder,
} from '../dto';
import { CatalogItem } from '../entities';
import {
  CatalogItemRepository,
  CatalogFlexibleRepository,
  BrandPartnerRepository,
} from '../repositories';
import { IPaginatedResult } from '../interfaces';
import { ElasticsearchService } from './elasticsearch.service';

@Injectable()
export class CatalogManagementService {
  private readonly logger = new Logger(CatalogManagementService.name);
  // Simple in-memory cache for demonstration
  // In production, use Redis or cache-manager
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly catalogItemRepository: CatalogItemRepository,
    private readonly catalogFlexibleRepository: CatalogFlexibleRepository,
    private readonly brandPartnerRepository: BrandPartnerRepository,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  /**
   * Create a new catalog item
   */
  async createCatalogItem(dto: CreateCatalogItemDto): Promise<CatalogItem> {
    this.logger.log(`Creating catalog item: ${dto.name} (${dto.type})`);

    // 1. Validate input
    await this.validateCatalogItem(dto);

    // 2. Use transaction for data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Create in PostgreSQL (exclude flexibleData as it goes to MongoDB)
      const { flexibleData, ...catalogData } = dto;
      const catalogItem = queryRunner.manager.create(CatalogItem, {
        ...catalogData,
        popularityScore: 0,
        viewCount: 0,
        useCount: 0,
        favoriteCount: 0,
      } as any);

      const savedItem = await queryRunner.manager.save(catalogItem);

      // 4. Create flexible data in MongoDB (if provided)
      if (dto.flexibleData) {
        await this.catalogFlexibleRepository.create({
          catalogId: savedItem.id,
          type: savedItem.type,
          data: dto.flexibleData,
          searchTerms: this.extractSearchTerms(dto),
          colorTags: this.extractColorTags(dto),
          analytics: {
            views: 0,
            uses: 0,
            favorites: 0,
            rating: 0,
            lastUpdated: new Date(),
          },
        });
      }

      await queryRunner.commitTransaction();

      // 5. Clear cache asynchronously
      this.clearCatalogCache().catch(err =>
        this.logger.error('Failed to clear cache', err.stack)
      );

      // 6. Index in Elasticsearch (Phase 3)
      this.indexCatalogItem(savedItem).catch(err =>
        this.logger.error('Failed to index catalog item', err.stack)
      );

      this.logger.log(`Successfully created catalog item: ${savedItem.id}`);
      return savedItem;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create catalog item: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get a catalog item by ID
   */
  async getCatalogItem(id: string): Promise<CatalogItem> {
    this.logger.debug(`Fetching catalog item: ${id}`);

    // 1. Check cache
    const cached = this.getFromCache<CatalogItem>(`catalog:item:${id}`);
    if (cached) {
      this.logger.debug(`Cache hit for item: ${id}`);
      return cached;
    }

    // 2. Fetch from database
    const item = await this.catalogItemRepository.findByIdWithRelations(id);
    if (!item) {
      throw new NotFoundException(`Catalog item with ID ${id} not found`);
    }

    // 3. Increment view count asynchronously
    this.catalogItemRepository
      .incrementViewCount(id)
      .catch(err => this.logger.error('Failed to increment view count', err.stack));

    // 4. Cache result (1 hour TTL)
    this.setCache(`catalog:item:${id}`, item, 3600);

    return item;
  }

  /**
   * Update a catalog item
   */
  async updateCatalogItem(
    id: string,
    dto: UpdateCatalogItemDto,
  ): Promise<CatalogItem> {
    this.logger.log(`Updating catalog item: ${id}`);

    // 1. Get existing item
    const existing = await this.getCatalogItem(id);

    // 2. Validate brand partner if changed
    if (dto.brandPartnerId && dto.brandPartnerId !== existing.brandPartnerId) {
      const partner = await this.brandPartnerRepository.findById(dto.brandPartnerId);
      if (!partner || !partner.isActive) {
        throw new BadRequestException('Invalid or inactive brand partner');
      }
    }

    // 3. Use transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4. Update in PostgreSQL (exclude flexibleData as it goes to MongoDB)
      const { flexibleData, ...catalogData } = dto;
      const updated = await queryRunner.manager.save(CatalogItem, {
        ...existing,
        ...catalogData,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      } as any);

      // 5. Update in MongoDB (if flexible data provided)
      if (dto.flexibleData) {
        await this.catalogFlexibleRepository.update(id, {
          data: dto.flexibleData,
          updatedAt: new Date(),
        });
      }

      await queryRunner.commitTransaction();

      // 6. Clear cache
      this.deleteFromCache(`catalog:item:${id}`);
      this.clearCatalogCache().catch(err =>
        this.logger.error('Failed to clear cache', err.stack)
      );

      // 7. Re-index in Elasticsearch (Phase 3)
      this.indexCatalogItem(updated).catch(err =>
        this.logger.error('Failed to re-index catalog item', err.stack)
      );

      this.logger.log(`Successfully updated catalog item: ${id}`);
      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update catalog item: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Soft delete a catalog item
   */
  async deleteCatalogItem(id: string): Promise<void> {
    this.logger.log(`Deleting catalog item: ${id}`);

    // 1. Verify item exists
    const item = await this.getCatalogItem(id);

    // 2. Soft delete
    await this.catalogItemRepository.softDelete(id);

    // 3. Clear cache
    this.deleteFromCache(`catalog:item:${id}`);
    this.clearCatalogCache().catch(err =>
      this.logger.error('Failed to clear cache', err.stack)
    );

    // 4. Remove from Elasticsearch (Phase 3)
    this.deleteFromElasticsearch(id).catch(err =>
      this.logger.error('Failed to delete from Elasticsearch', err.stack)
    );

    this.logger.log(`Successfully deleted catalog item: ${id}`);
  }

  /**
   * List catalog items with filters and pagination
   */
  async listCatalogItems(
    filters: CatalogFilterDto,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    this.logger.debug(`Listing catalog items with filters: ${JSON.stringify(filters)}`);

    // Build cache key
    const cacheKey = `catalog:list:${JSON.stringify(filters)}`;

    // Check cache
    const cached = this.getFromCache<PaginatedResultDto<CatalogItem>>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for catalog list');
      return cached;
    }

    // Fetch from database
    const { items, total } = await this.catalogItemRepository.findAllPaginated(
      filters.page || 1,
      filters.limit || 24,
      filters,
    );

    const result = new PaginatedResultDto(
      items,
      filters.page || 1,
      filters.limit || 24,
      total,
    );

    // Cache result (15 minutes TTL)
    this.setCache(cacheKey, result, 900);

    return result;
  }

  /**
   * Get catalog items by type
   */
  async getCatalogItemsByType(
    type: CatalogItemType,
    page: number = 1,
    limit: number = 24,
  ): Promise<PaginatedResultDto<CatalogItem>> {
    this.logger.debug(`Fetching catalog items of type: ${type}`);

    return this.listCatalogItems({
      type,
      page,
      limit,
      isActive: true,
    });
  }

  /**
   * Validate catalog item before creation
   */
  private async validateCatalogItem(dto: CreateCatalogItemDto): Promise<void> {
    // Check for duplicate names of the same type
    const existing = await this.catalogItemRepository.findOne({
      where: {
        name: dto.name,
        type: dto.type,
        deletedAt: IsNull(),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Catalog item with name "${dto.name}" already exists for type ${dto.type}`
      );
    }

    // Validate brand partner if provided
    if (dto.brandPartnerId) {
      const partner = await this.brandPartnerRepository.findById(dto.brandPartnerId);
      if (!partner || !partner.isActive) {
        throw new BadRequestException('Invalid or inactive brand partner');
      }
    }
  }

  /**
   * Extract search terms for MongoDB
   */
  private extractSearchTerms(dto: CreateCatalogItemDto): string[] {
    const terms = new Set<string>();

    // Add name and description words
    terms.add(dto.name.toLowerCase());
    if (dto.description) {
      dto.description
        .toLowerCase()
        .split(/\s+/)
        .forEach(word => {
          if (word.length > 2) {
            // Only add words longer than 2 characters
            terms.add(word);
          }
        });
    }

    // Add tags
    dto.tags?.forEach(tag => terms.add(tag.toLowerCase()));

    // Add category
    if (dto.category) terms.add(dto.category.toLowerCase());
    if (dto.subcategory) terms.add(dto.subcategory.toLowerCase());

    return Array.from(terms);
  }

  /**
   * Extract color tags from properties
   */
  private extractColorTags(dto: CreateCatalogItemDto): string[] {
    const colors = new Set<string>();

    if (dto.properties?.colors && Array.isArray(dto.properties.colors)) {
      dto.properties.colors.forEach((color: any) => {
        if (color.name) {
          colors.add(color.name.toLowerCase());
        }
      });
    }

    return Array.from(colors);
  }

  /**
   * Clear all catalog list caches
   */
  private async clearCatalogCache(): Promise<void> {
    const keysToDelete: string[] = [];
    this.cache.forEach((value, key) => {
      if (key.startsWith('catalog:list:')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.deleteFromCache(key));
    this.logger.debug(`Cleared ${keysToDelete.length} cache entries`);
  }

  /**
   * Simple cache get
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Simple cache set
   */
  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Simple cache delete
   */
  private deleteFromCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Index a catalog item in Elasticsearch
   */
  private async indexCatalogItem(item: CatalogItem): Promise<void> {
    try {
      const document = {
        id: item.id,
        type: item.type,
        name: item.name,
        description: item.description,
        category: item.category,
        subcategory: item.subcategory,
        tags: item.tags || [],
        colors: item.properties?.colors || [],
        occasions: item.properties?.occasions || [],
        seasons: item.properties?.seasons || [],
        styles: item.properties?.styles || [],
        brand_partner: item.brandPartnerId || null,
        is_active: item.isActive,
        is_featured: item.isFeatured,
        popularity_score: item.popularityScore || 0,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        price_range: item.properties?.priceRange || null,
      };

      await this.elasticsearchService.indexDocument(item.id, document);
      this.logger.debug(`Indexed catalog item in Elasticsearch: ${item.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to index catalog item ${item.id} in Elasticsearch: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Delete a catalog item from Elasticsearch
   */
  private async deleteFromElasticsearch(id: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteDocument(id);
      this.logger.debug(`Deleted catalog item from Elasticsearch: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete catalog item ${id} from Elasticsearch: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
