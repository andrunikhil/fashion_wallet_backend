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
  CreateCollectionDto,
  UpdateCollectionDto,
  AddCollectionItemDto,
  ReorderItemsDto,
  PaginatedResultDto,
} from '../dto';
import { Collection, CollectionItem } from '../entities';
import {
  CollectionRepository,
  CollectionItemRepository,
  CatalogItemRepository,
} from '../repositories';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  // Simple in-memory cache for demonstration
  private readonly cache = new Map<string, { data: any; expiry: number }>();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly collectionRepository: CollectionRepository,
    private readonly collectionItemRepository: CollectionItemRepository,
    private readonly catalogItemRepository: CatalogItemRepository,
  ) {}

  /**
   * Create a new collection
   */
  async createCollection(dto: CreateCollectionDto): Promise<Collection> {
    this.logger.log(`Creating collection: ${dto.name}`);

    // Check for duplicate name
    const existing = await this.collectionRepository.findOne({
      where: { name: dto.name, deletedAt: IsNull() },
    });

    if (existing) {
      throw new ConflictException(`Collection with name "${dto.name}" already exists`);
    }

    const collection = this.collectionRepository.create(dto);
    const saved = await this.collectionRepository.save(collection);

    // Clear featured collections cache if this is featured
    if (saved.isFeatured) {
      this.deleteFromCache('collections:featured');
    }

    this.logger.log(`Successfully created collection: ${saved.id}`);
    return saved;
  }

  /**
   * Get a collection by ID with items
   */
  async getCollection(id: string): Promise<Collection> {
    this.logger.debug(`Fetching collection: ${id}`);

    // Check cache
    const cached = this.getFromCache<Collection>(`collection:${id}`);
    if (cached) {
      this.logger.debug(`Cache hit for collection: ${id}`);
      return cached;
    }

    // Fetch from database with items
    const collection = await this.collectionRepository.findByIdWithItems(id);
    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Cache result (1 hour TTL)
    this.setCache(`collection:${id}`, collection, 3600);

    return collection;
  }

  /**
   * Update a collection
   */
  async updateCollection(id: string, dto: UpdateCollectionDto): Promise<Collection> {
    this.logger.log(`Updating collection: ${id}`);

    // Get existing collection
    const existing = await this.collectionRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!existing) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Check for duplicate name if changing name
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.collectionRepository.findOne({
        where: { name: dto.name, deletedAt: IsNull() },
      });

      if (duplicate) {
        throw new ConflictException(`Collection with name "${dto.name}" already exists`);
      }
    }

    // Update
    const updated = await this.collectionRepository.save({
      ...existing,
      ...dto,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    });

    // Clear caches
    this.deleteFromCache(`collection:${id}`);
    if (updated.isFeatured || existing.isFeatured) {
      this.deleteFromCache('collections:featured');
    }

    this.logger.log(`Successfully updated collection: ${id}`);
    return updated;
  }

  /**
   * Soft delete a collection
   */
  async deleteCollection(id: string): Promise<void> {
    this.logger.log(`Deleting collection: ${id}`);

    // Verify exists
    const collection = await this.collectionRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${id} not found`);
    }

    // Soft delete
    await this.collectionRepository.softDelete(id);

    // Clear caches
    this.deleteFromCache(`collection:${id}`);
    if (collection.isFeatured) {
      this.deleteFromCache('collections:featured');
    }

    this.logger.log(`Successfully deleted collection: ${id}`);
  }

  /**
   * List collections with pagination
   */
  async listCollections(
    page: number = 1,
    limit: number = 24,
    isPublic?: boolean,
  ): Promise<PaginatedResultDto<Collection>> {
    this.logger.debug(`Listing collections (page: ${page}, limit: ${limit}, public: ${isPublic})`);

    const cacheKey = `collections:list:${page}:${limit}:${isPublic}`;

    // Check cache
    const cached = this.getFromCache<PaginatedResultDto<Collection>>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for collections list');
      return cached;
    }

    let collections: Collection[];
    let total: number;

    if (isPublic !== undefined) {
      const result = await this.collectionRepository.findPublic(page, limit);
      collections = result.collections;
      total = result.total;
    } else {
      [collections, total] = await this.collectionRepository.findAndCount({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    const result = new PaginatedResultDto(collections, page, limit, total);

    // Cache result (15 minutes TTL)
    this.setCache(cacheKey, result, 900);

    return result;
  }

  /**
   * Add an item to a collection
   */
  async addItemToCollection(
    collectionId: string,
    dto: AddCollectionItemDto,
  ): Promise<CollectionItem> {
    this.logger.log(`Adding item ${dto.catalogItemId} to collection ${collectionId}`);

    // Verify collection exists
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId, deletedAt: IsNull() },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }

    // Verify catalog item exists
    const catalogItem = await this.catalogItemRepository.findOne({
      where: { id: dto.catalogItemId, deletedAt: IsNull() },
    });

    if (!catalogItem) {
      throw new NotFoundException(`Catalog item with ID ${dto.catalogItemId} not found`);
    }

    // Check if item already in collection
    const exists = await this.collectionItemRepository.existsInCollection(
      collectionId,
      dto.catalogItemId,
    );

    if (exists) {
      throw new ConflictException('Item already exists in this collection');
    }

    // Get current max order or use provided order
    let orderIndex = dto.orderIndex;
    if (orderIndex === undefined) {
      const maxOrder = await this.collectionItemRepository.getMaxOrder(collectionId);
      orderIndex = maxOrder + 1;
    }

    // Create collection item
    const collectionItem = this.collectionItemRepository.create({
      collectionId,
      catalogItemId: dto.catalogItemId,
      orderIndex,
    });

    const saved = await this.collectionItemRepository.save(collectionItem);

    // Clear collection cache
    this.deleteFromCache(`collection:${collectionId}`);

    this.logger.log(`Successfully added item to collection: ${saved.id}`);
    return saved;
  }

  /**
   * Remove an item from a collection
   */
  async removeItemFromCollection(
    collectionId: string,
    catalogItemId: string,
  ): Promise<void> {
    this.logger.log(`Removing item ${catalogItemId} from collection ${collectionId}`);

    // Find the collection item
    const collectionItem = await this.collectionItemRepository.findOne({
      where: { collectionId, catalogItemId },
    });

    if (!collectionItem) {
      throw new NotFoundException('Item not found in collection');
    }

    // Delete
    await this.collectionItemRepository.delete(collectionItem.id);

    // Clear collection cache
    this.deleteFromCache(`collection:${collectionId}`);

    this.logger.log('Successfully removed item from collection');
  }

  /**
   * Reorder items in a collection
   */
  async reorderCollectionItems(
    collectionId: string,
    dto: ReorderItemsDto,
  ): Promise<void> {
    this.logger.log(`Reordering items in collection ${collectionId}`);

    // Verify collection exists
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId, deletedAt: IsNull() },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with ID ${collectionId} not found`);
    }

    // Get all collection items
    const collectionItems = await this.collectionItemRepository.findByCollectionId(collectionId);

    // Validate that all items in the request exist in the collection
    const collectionItemIds = new Set(collectionItems.map(ci => ci.catalogItemId));
    for (const item of dto.items) {
      if (!collectionItemIds.has(item.catalogItemId)) {
        throw new BadRequestException(
          `Catalog item ${item.catalogItemId} not found in collection`
        );
      }
    }

    // Create mapping of catalog item ID to collection item ID
    const catalogToCollectionMap = new Map(
      collectionItems.map(ci => [ci.catalogItemId, ci.id])
    );

    // Prepare reorder data
    const itemOrders = dto.items.map(item => ({
      id: catalogToCollectionMap.get(item.catalogItemId)!,
      orderIndex: item.orderIndex,
    }));

    // Reorder
    await this.collectionItemRepository.reorderItems(collectionId, itemOrders);

    // Clear collection cache
    this.deleteFromCache(`collection:${collectionId}`);

    this.logger.log('Successfully reordered collection items');
  }

  /**
   * Get featured collections
   */
  async getFeaturedCollections(limit: number = 10): Promise<Collection[]> {
    this.logger.debug(`Fetching featured collections (limit: ${limit})`);

    // Check cache
    const cached = this.getFromCache<Collection[]>('collections:featured');
    if (cached) {
      this.logger.debug('Cache hit for featured collections');
      return cached;
    }

    // Fetch from database
    const collections = await this.collectionRepository.findFeatured(limit);

    // Cache for 1 hour
    this.setCache('collections:featured', collections, 3600);

    return collections;
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
}
