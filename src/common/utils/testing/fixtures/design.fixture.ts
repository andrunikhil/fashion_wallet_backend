import { v4 as uuidv4 } from 'uuid';
import { Model } from 'mongoose';
import { Design, DesignDocument } from '@/infrastructure/database/schemas/design.schema';

/**
 * Design fixture factory for generating test designs
 *
 * Provides methods to create design test data with layers and configurations
 * Note: Design uses MongoDB/Mongoose, not TypeORM
 *
 * @example
 * ```typescript
 * const designFixture = new DesignFixture(designModel);
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
export class DesignFixture {
  private sequenceId = 0;
  private model?: Model<DesignDocument>;

  constructor(model?: Model<DesignDocument>) {
    this.model = model;
  }

  /**
   * Set the Mongoose model for database operations
   */
  setModel(model: Model<DesignDocument>): void {
    this.model = model;
  }

  /**
   * Build a design instance without persisting to database
   */
  build(overrides: Partial<Design> = {}): Partial<Design> {
    this.sequenceId++;

    return {
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Design ${this.sequenceId}`,
      status: overrides.status || 'draft',
      layers: overrides.layers || [],
      metadata: overrides.metadata || {},
      avatarId: overrides.avatarId,
      catalogItemIds: overrides.catalogItemIds || [],
      version: overrides.version || 1,
      ...overrides
    };
  }

  /**
   * Build design with layers
   * @param layerCount Number of layers to create (default: 3)
   * @param overrides Design overrides
   */
  buildWithLayers(layerCount: number = 3, overrides: Partial<Design> = {}): Partial<Design> {
    const design = this.build(overrides);
    design.layers = Array.from({ length: layerCount }, (_, index) => ({
      id: uuidv4(),
      type: this.getLayerType(index),
      itemId: uuidv4(),
      position: { x: 0, y: 0, z: index },
      rotation: 0,
      scale: { x: 1, y: 1 },
      visible: true
    }));

    // Extract catalog item IDs from layers
    design.catalogItemIds = design.layers
      .filter(layer => layer.itemId)
      .map(layer => layer.itemId!);

    return design;
  }

  /**
   * Get layer type based on index
   */
  private getLayerType(index: number): string {
    const types = ['silhouette', 'fabric', 'pattern'];
    return types[index % types.length];
  }

  /**
   * Build multiple design instances without persisting
   */
  buildMany(count: number, overrides: Partial<Design> = {}): Partial<Design>[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist a design to database
   */
  async create(overrides: Partial<Design> = {}): Promise<DesignDocument> {
    if (!this.model) {
      throw new Error('Model not set. Call setModel() first or pass it to constructor.');
    }

    const design = this.build(overrides);
    const doc = new this.model(design);
    return await doc.save();
  }

  /**
   * Create and persist multiple designs to database
   */
  async createMany(count: number, overrides: Partial<Design> = {}): Promise<DesignDocument[]> {
    if (!this.model) {
      throw new Error('Model not set. Call setModel() first or pass it to constructor.');
    }

    const designs = this.buildMany(count, overrides);
    return await this.model.insertMany(designs);
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
  buildPublished(overrides: Partial<Design> = {}): Partial<Design> {
    return this.build({
      status: 'published',
      ...overrides
    });
  }

  /**
   * Build a draft design
   */
  buildDraft(overrides: Partial<Design> = {}): Partial<Design> {
    return this.build({
      status: 'draft',
      ...overrides
    });
  }

  /**
   * Build an archived design
   */
  buildArchived(overrides: Partial<Design> = {}): Partial<Design> {
    return this.build({
      status: 'archived',
      ...overrides
    });
  }

  /**
   * Create a published design
   */
  async createPublished(overrides: Partial<Design> = {}): Promise<DesignDocument> {
    return this.create({
      status: 'published',
      ...overrides
    });
  }

  /**
   * Create a draft design
   */
  async createDraft(overrides: Partial<Design> = {}): Promise<DesignDocument> {
    return this.create({
      status: 'draft',
      ...overrides
    });
  }
}
