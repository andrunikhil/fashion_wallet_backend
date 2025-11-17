import { v4 as uuidv4 } from 'uuid';
import { FixtureFactory } from './fixture.interface';
import { DataSource } from 'typeorm';

/**
 * Design layer interface
 */
export interface DesignLayer {
  id?: string;
  designId: string;
  type: 'silhouette' | 'fabric' | 'pattern' | 'accessory';
  order: number;
  data: {
    itemId: string;
    transform?: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      scale: { x: number; y: number; z: number };
    };
    properties?: Record<string, any>;
  };
  isVisible?: boolean;
  isLocked?: boolean;
}

/**
 * Design entity interface (to be replaced with actual Design entity when available)
 */
export interface Design {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  avatarId: string;
  layers?: DesignLayer[];
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'private' | 'public' | 'unlisted';
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Design fixture factory for generating test designs
 *
 * Provides methods to create design test data with layers and configurations
 *
 * @example
 * ```typescript
 * const designFixture = new DesignFixture();
 *
 * // Build design without layers
 * const design = designFixture.build({ name: 'Summer Outfit' });
 *
 * // Build design with layers
 * const designWithLayers = designFixture.buildWithLayers(3);
 *
 * // Create and save design to database
 * const savedDesign = await designFixture.create({ status: 'published' });
 * ```
 */
export class DesignFixture implements FixtureFactory<Design> {
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
   * Build a design instance without persisting to database
   */
  build(overrides: Partial<Design> = {}): Design {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Design ${this.sequenceId}`,
      description: overrides.description || `Test design description ${this.sequenceId}`,
      avatarId: overrides.avatarId || uuidv4(),
      layers: overrides.layers || [],
      status: overrides.status || 'draft',
      visibility: overrides.visibility || 'private',
      metadata: overrides.metadata || {},
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Build design with layers
   * @param layerCount Number of layers to create (default: 3)
   * @param overrides Design overrides
   */
  buildWithLayers(layerCount: number = 3, overrides: Partial<Design> = {}): Design {
    const design = this.build(overrides);
    design.layers = Array.from({ length: layerCount }, (_, index) => ({
      id: uuidv4(),
      designId: design.id!,
      type: this.getLayerType(index),
      order: index,
      data: {
        itemId: uuidv4(),
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 }
        },
        properties: {}
      },
      isVisible: true,
      isLocked: false
    }));
    return design;
  }

  /**
   * Get layer type based on index
   */
  private getLayerType(index: number): DesignLayer['type'] {
    const types: DesignLayer['type'][] = ['silhouette', 'fabric', 'pattern', 'accessory'];
    return types[index % types.length];
  }

  /**
   * Build multiple design instances without persisting
   */
  buildMany(count: number, overrides: Partial<Design> = {}): Design[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist a design to database
   */
  async create(overrides: Partial<Design> = {}): Promise<Design> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const design = this.build(overrides);
    const repository = this.dataSource.getRepository('Design');
    return await repository.save(design);
  }

  /**
   * Create and persist multiple designs to database
   */
  async createMany(count: number, overrides: Partial<Design> = {}): Promise<Design[]> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const designs = this.buildMany(count, overrides);
    const repository = this.dataSource.getRepository('Design');
    return await repository.save(designs);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }

  /**
   * Build a published design
   */
  buildPublished(overrides: Partial<Design> = {}): Design {
    return this.build({
      status: 'published',
      visibility: 'public',
      ...overrides
    });
  }

  /**
   * Build a draft design
   */
  buildDraft(overrides: Partial<Design> = {}): Design {
    return this.build({
      status: 'draft',
      visibility: 'private',
      ...overrides
    });
  }

  /**
   * Create a published design
   */
  async createPublished(overrides: Partial<Design> = {}): Promise<Design> {
    return this.create({
      status: 'published',
      visibility: 'public',
      ...overrides
    });
  }

  /**
   * Create a draft design
   */
  async createDraft(overrides: Partial<Design> = {}): Promise<Design> {
    return this.create({
      status: 'draft',
      visibility: 'private',
      ...overrides
    });
  }
}
