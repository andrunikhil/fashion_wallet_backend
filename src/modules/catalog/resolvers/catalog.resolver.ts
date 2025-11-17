import { Resolver, Query, Mutation, Args, ID, Subscription } from '@nestjs/graphql';
import { Logger, NotFoundException } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { CatalogManagementService } from '../services/catalog-management.service';
import { CollectionService } from '../services/collection.service';
import { BrandPartnerService } from '../services/brand-partner.service';
import {
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
  CatalogFilterDto,
} from '../dto';

const pubSub = new PubSub();

/**
 * GraphQL Resolver for Catalog operations
 * Provides GraphQL API for catalog items, collections, and brand partners
 */
@Resolver('CatalogItem')
export class CatalogResolver {
  private readonly logger = new Logger(CatalogResolver.name);

  constructor(
    private readonly catalogManagementService: CatalogManagementService,
    private readonly collectionService: CollectionService,
    private readonly brandPartnerService: BrandPartnerService
  ) {}

  /**
   * Get catalog item by ID
   */
  @Query('catalogItem')
  async getCatalogItem(@Args('id', { type: () => ID }) id: string) {
    this.logger.debug(`GraphQL query: getCatalogItem(${id})`);

    const item = await this.catalogManagementService.getCatalogItem(id);
    if (!item) {
      throw new NotFoundException(`Catalog item with ID ${id} not found`);
    }

    return item;
  }

  /**
   * List catalog items with filters
   */
  @Query('catalogItems')
  async getCatalogItems(@Args('filters', { nullable: true }) filters?: CatalogFilterDto) {
    this.logger.debug('GraphQL query: getCatalogItems');

    return this.catalogManagementService.listCatalogItems(filters || {});
  }

  /**
   * Get catalog items by type
   */
  @Query('catalogItemsByType')
  async getCatalogItemsByType(
    @Args('type') type: string,
    @Args('page', { type: () => Number, nullable: true, defaultValue: 1 })
    page: number,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 24 })
    limit: number
  ) {
    this.logger.debug(`GraphQL query: getCatalogItemsByType(${type})`);

    return this.catalogManagementService.getCatalogItemsByType(type as any, page, limit);
  }

  /**
   * Get collection by ID
   */
  @Query('collection')
  async getCollection(@Args('id', { type: () => ID }) id: string) {
    this.logger.debug(`GraphQL query: getCollection(${id})`);

    return this.collectionService.getCollection(id);
  }

  /**
   * List collections
   */
  @Query('collections')
  async getCollections(
    @Args('page', { type: () => Number, nullable: true, defaultValue: 1 })
    page: number,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 24 })
    limit: number
  ) {
    this.logger.debug('GraphQL query: getCollections');

    return this.collectionService.listCollections(page, limit);
  }

  /**
   * Get featured collections
   */
  @Query('featuredCollections')
  async getFeaturedCollections() {
    this.logger.debug('GraphQL query: getFeaturedCollections');

    return this.collectionService.getFeaturedCollections();
  }

  /**
   * Get brand partner by ID
   */
  @Query('brandPartner')
  async getBrandPartner(@Args('id', { type: () => ID }) id: string) {
    this.logger.debug(`GraphQL query: getBrandPartner(${id})`);

    return this.brandPartnerService.getBrandPartner(id);
  }

  /**
   * List brand partners
   */
  @Query('brandPartners')
  async getBrandPartners(
    @Args('page', { type: () => Number, nullable: true, defaultValue: 1 })
    page: number,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 24 })
    limit: number
  ) {
    this.logger.debug('GraphQL query: getBrandPartners');

    return this.brandPartnerService.listBrandPartners(page, limit);
  }

  /**
   * Create catalog item (admin only)
   */
  @Mutation('createCatalogItem')
  async createCatalogItem(@Args('input') input: CreateCatalogItemDto) {
    this.logger.log('GraphQL mutation: createCatalogItem');

    const item = await this.catalogManagementService.createCatalogItem(input);

    // Publish to subscribers
    pubSub.publish('catalogItemCreated', { catalogItemCreated: item });

    return item;
  }

  /**
   * Update catalog item (admin only)
   */
  @Mutation('updateCatalogItem')
  async updateCatalogItem(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCatalogItemDto
  ) {
    this.logger.log(`GraphQL mutation: updateCatalogItem(${id})`);

    const item = await this.catalogManagementService.updateCatalogItem(id, input);

    // Publish to subscribers
    pubSub.publish('catalogItemUpdated', { catalogItemUpdated: item });

    return item;
  }

  /**
   * Delete catalog item (admin only)
   */
  @Mutation('deleteCatalogItem')
  async deleteCatalogItem(@Args('id', { type: () => ID }) id: string) {
    this.logger.log(`GraphQL mutation: deleteCatalogItem(${id})`);

    await this.catalogManagementService.deleteCatalogItem(id);

    // Publish to subscribers
    pubSub.publish('catalogItemDeleted', { catalogItemDeleted: { id } });

    return { success: true, id };
  }

  /**
   * Subscribe to catalog item creation
   */
  @Subscription('catalogItemCreated', {
    resolve: (payload) => payload.catalogItemCreated,
  })
  catalogItemCreated() {
    this.logger.debug('GraphQL subscription: catalogItemCreated');
    return pubSub.asyncIterator('catalogItemCreated');
  }

  /**
   * Subscribe to catalog item updates
   */
  @Subscription('catalogItemUpdated', {
    resolve: (payload) => payload.catalogItemUpdated,
  })
  catalogItemUpdated() {
    this.logger.debug('GraphQL subscription: catalogItemUpdated');
    return pubSub.asyncIterator('catalogItemUpdated');
  }

  /**
   * Subscribe to catalog item deletion
   */
  @Subscription('catalogItemDeleted', {
    resolve: (payload) => payload.catalogItemDeleted,
  })
  catalogItemDeleted() {
    this.logger.debug('GraphQL subscription: catalogItemDeleted');
    return pubSub.asyncIterator('catalogItemDeleted');
  }
}
