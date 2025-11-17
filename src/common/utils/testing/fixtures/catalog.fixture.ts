import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';

/**
 * Silhouette entity interface (to be replaced with actual Silhouette entity when available)
 */
export interface Silhouette {
  id?: string;
  name: string;
  category: string;
  subcategory: string;
  modelUrl: string;
  thumbnailUrl: string;
  fitType: string;
  tags?: string[];
  metadata?: Record<string, any>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fabric entity interface (to be replaced with actual Fabric entity when available)
 */
export interface Fabric {
  id?: string;
  name: string;
  type: string;
  diffuseMapUrl: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  properties?: Record<string, any>;
  colors?: string[];
  tags?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Pattern entity interface (to be replaced with actual Pattern entity when available)
 */
export interface Pattern {
  id?: string;
  name: string;
  type: string;
  textureUrl: string;
  thumbnailUrl: string;
  colors?: string[];
  tags?: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

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
 * const tshirt = catalogFixture.createSilhouette({ name: 'T-Shirt' });
 *
 * // Create fabric
 * const cotton = catalogFixture.createFabric({ name: 'Cotton' });
 *
 * // Create pattern
 * const stripes = catalogFixture.createPattern({ name: 'Stripes' });
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
   * Create a silhouette instance
   */
  createSilhouette(overrides: Partial<Silhouette> = {}): Silhouette {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      name: overrides.name || `Test Silhouette ${this.sequenceId}`,
      category: overrides.category || 'tops',
      subcategory: overrides.subcategory || 't-shirt',
      modelUrl: overrides.modelUrl || `https://cdn.example.com/models/silhouette-${uuidv4()}.gltf`,
      thumbnailUrl: overrides.thumbnailUrl || `https://cdn.example.com/thumbnails/silhouette-${uuidv4()}.jpg`,
      fitType: overrides.fitType || 'regular',
      tags: overrides.tags || ['casual', 'summer'],
      metadata: overrides.metadata || {},
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Create a fabric instance
   */
  createFabric(overrides: Partial<Fabric> = {}): Fabric {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      name: overrides.name || `Test Fabric ${this.sequenceId}`,
      type: overrides.type || 'solid',
      diffuseMapUrl: overrides.diffuseMapUrl || `https://cdn.example.com/fabrics/fabric-${uuidv4()}.jpg`,
      normalMapUrl: overrides.normalMapUrl,
      roughnessMapUrl: overrides.roughnessMapUrl,
      properties: overrides.properties || {
        shine: 0.2,
        stretch: 0.1,
        drape: 'medium'
      },
      colors: overrides.colors || ['#FFFFFF', '#000000', '#FF0000'],
      tags: overrides.tags || ['natural', 'breathable'],
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Create a pattern instance
   */
  createPattern(overrides: Partial<Pattern> = {}): Pattern {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      name: overrides.name || `Test Pattern ${this.sequenceId}`,
      type: overrides.type || 'geometric',
      textureUrl: overrides.textureUrl || `https://cdn.example.com/patterns/pattern-${uuidv4()}.jpg`,
      thumbnailUrl: overrides.thumbnailUrl || `https://cdn.example.com/thumbnails/pattern-${uuidv4()}.jpg`,
      colors: overrides.colors || ['#000000', '#FFFFFF'],
      tags: overrides.tags || ['modern', 'classic'],
      isActive: overrides.isActive ?? true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Create multiple silhouettes
   */
  createSilhouettes(count: number, overrides: Partial<Silhouette> = {}): Silhouette[] {
    return Array.from({ length: count }, () => this.createSilhouette(overrides));
  }

  /**
   * Create multiple fabrics
   */
  createFabrics(count: number, overrides: Partial<Fabric> = {}): Fabric[] {
    return Array.from({ length: count }, () => this.createFabric(overrides));
  }

  /**
   * Create multiple patterns
   */
  createPatterns(count: number, overrides: Partial<Pattern> = {}): Pattern[] {
    return Array.from({ length: count }, () => this.createPattern(overrides));
  }

  /**
   * Save silhouette to database
   */
  async saveSilhouette(overrides: Partial<Silhouette> = {}): Promise<Silhouette> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const silhouette = this.createSilhouette(overrides);
    const repository = this.dataSource.getRepository('Silhouette');
    return await repository.save(silhouette);
  }

  /**
   * Save fabric to database
   */
  async saveFabric(overrides: Partial<Fabric> = {}): Promise<Fabric> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const fabric = this.createFabric(overrides);
    const repository = this.dataSource.getRepository('Fabric');
    return await repository.save(fabric);
  }

  /**
   * Save pattern to database
   */
  async savePattern(overrides: Partial<Pattern> = {}): Promise<Pattern> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const pattern = this.createPattern(overrides);
    const repository = this.dataSource.getRepository('Pattern');
    return await repository.save(pattern);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }
}
