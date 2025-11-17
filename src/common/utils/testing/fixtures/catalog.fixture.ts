import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import { CatalogItem } from '@/infrastructure/database/entities/catalog-item.entity';

/**
 * Catalog fixture factory for generating test catalog items
 *
 * Provides methods to create silhouettes, fabrics, and patterns for testing
 *
 * @example
 * ```typescript
 * const catalogFixture = new CatalogFixture();
 *
 * // Create silhouette
 * const tshirt = catalogFixture.buildSilhouette({ name: 'T-Shirt' });
 *
 * // Create fabric
 * const cotton = catalogFixture.buildFabric({ name: 'Cotton' });
 *
 * // Create pattern
 * const stripes = catalogFixture.buildPattern({ name: 'Stripes' });
 * ```
 */
export class CatalogFixture {
  private sequenceId = 0;
  private dataSource?: DataSource;

  constructor(dataSource?: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Set the data source for database operations
   */
  setDataSource(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * Build a catalog item
   */
  build(overrides: Partial<CatalogItem> = {}): CatalogItem {
    this.sequenceId++;

    const item = new CatalogItem();
    item.id = overrides.id || uuidv4();
    item.name = overrides.name || `Test Item ${this.sequenceId}`;
    item.description = overrides.description || `Description for test item ${this.sequenceId}`;
    item.type = overrides.type || 'silhouette';
    item.category = overrides.category || 'top';
    item.properties = overrides.properties || {};
    item.assetUrl = overrides.assetUrl || null;
    item.thumbnailUrl = overrides.thumbnailUrl || null;
    item.isPremium = overrides.isPremium ?? false;
    item.isActive = overrides.isActive ?? true;
    item.price = overrides.price ?? 0;
    item.createdAt = overrides.createdAt || new Date();
    item.updatedAt = overrides.updatedAt || new Date();
    item.deletedAt = overrides.deletedAt || null;

    return item;
  }

  /**
   * Build a silhouette catalog item
   */
  buildSilhouette(overrides: Partial<CatalogItem> = {}): CatalogItem {
    return this.build({
      type: 'silhouette',
      category: 'top',
      properties: {
        tags: ['casual', 'everyday'],
        ...overrides.properties
      },
      ...overrides
    });
  }

  /**
   * Build a fabric catalog item
   */
  buildFabric(overrides: Partial<CatalogItem> = {}): CatalogItem {
    return this.build({
      type: 'fabric',
      properties: {
        material: 'cotton',
        tags: ['soft', 'breathable'],
        ...overrides.properties
      },
      ...overrides
    });
  }

  /**
   * Build a pattern catalog item
   */
  buildPattern(overrides: Partial<CatalogItem> = {}): CatalogItem {
    return this.build({
      type: 'pattern',
      properties: {
        patternType: 'geometric',
        tags: ['modern', 'classic'],
        ...overrides.properties
      },
      ...overrides
    });
  }

  /**
   * Build premium catalog item
   */
  buildPremium(overrides: Partial<CatalogItem> = {}): CatalogItem {
    return this.build({
      isPremium: true,
      price: 1000,
      properties: {
        tags: ['premium', 'designer'],
        ...overrides.properties
      },
      ...overrides
    });
  }

  /**
   * Build multiple catalog items
   */
  buildMany(count: number, overrides: Partial<CatalogItem> = {}): CatalogItem[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build multiple silhouettes
   */
  buildSilhouettes(count: number, overrides: Partial<CatalogItem> = {}): CatalogItem[] {
    return Array.from({ length: count }, () => this.buildSilhouette(overrides));
  }

  /**
   * Build multiple fabrics
   */
  buildFabrics(count: number, overrides: Partial<CatalogItem> = {}): CatalogItem[] {
    return Array.from({ length: count }, () => this.buildFabric(overrides));
  }

  /**
   * Build multiple patterns
   */
  buildPatterns(count: number, overrides: Partial<CatalogItem> = {}): CatalogItem[] {
    return Array.from({ length: count }, () => this.buildPattern(overrides));
  }

  /**
   * Save catalog item to database
   */
  async save(overrides: Partial<CatalogItem> = {}): Promise<CatalogItem> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const item = this.build(overrides);
    const repository = this.dataSource.getRepository(CatalogItem);
    return await repository.save(item);
  }

  /**
   * Save silhouette to database
   */
  async saveSilhouette(overrides: Partial<CatalogItem> = {}): Promise<CatalogItem> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const silhouette = this.buildSilhouette(overrides);
    const repository = this.dataSource.getRepository(CatalogItem);
    return await repository.save(silhouette);
  }

  /**
   * Save fabric to database
   */
  async saveFabric(overrides: Partial<CatalogItem> = {}): Promise<CatalogItem> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const fabric = this.buildFabric(overrides);
    const repository = this.dataSource.getRepository(CatalogItem);
    return await repository.save(fabric);
  }

  /**
   * Save pattern to database
   */
  async savePattern(overrides: Partial<CatalogItem> = {}): Promise<CatalogItem> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const pattern = this.buildPattern(overrides);
    const repository = this.dataSource.getRepository(CatalogItem);
    return await repository.save(pattern);
  }

  /**
   * Save multiple catalog items
   */
  async saveMany(count: number, overrides: Partial<CatalogItem> = {}): Promise<CatalogItem[]> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const items = this.buildMany(count, overrides);
    const repository = this.dataSource.getRepository(CatalogItem);
    return await repository.save(items);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }
}
