import { v4 as uuidv4 } from 'uuid';
import { FixtureFactory } from './fixture.interface';
import { DataSource } from 'typeorm';

/**
 * Avatar entity interface (to be replaced with actual Avatar entity when available)
 */
export interface Avatar {
  id?: string;
  userId: string;
  name: string;
  status?: string;
  modelUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
  measurements?: AvatarMeasurements;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Avatar measurements interface
 */
export interface AvatarMeasurements {
  id?: string;
  avatarId: string;
  height: number;
  shoulderWidth: number;
  chestCircumference: number;
  waistCircumference: number;
  hipCircumference: number;
  inseamLength: number;
  armLength: number;
  neckCircumference: number;
  unit: 'metric' | 'imperial';
  confidence?: number;
  isManual?: boolean;
}

/**
 * Avatar fixture factory for generating test avatars
 *
 * Provides methods to create avatar test data with sensible defaults
 * Supports building avatars with or without measurements
 *
 * @example
 * ```typescript
 * const avatarFixture = new AvatarFixture();
 *
 * // Build avatar without measurements
 * const avatar = avatarFixture.build({ userId: 'user123' });
 *
 * // Build avatar with measurements
 * const avatarWithMeasurements = avatarFixture.buildWithMeasurements();
 *
 * // Create and save avatar to database
 * const savedAvatar = await avatarFixture.create({ name: 'My Avatar' });
 * ```
 */
export class AvatarFixture implements FixtureFactory<Avatar> {
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
   * Build an avatar instance without persisting to database
   */
  build(overrides: Partial<Avatar> = {}): Avatar {
    this.sequenceId++;
    return {
      id: overrides.id || uuidv4(),
      userId: overrides.userId || uuidv4(),
      name: overrides.name || `Avatar ${this.sequenceId}`,
      status: overrides.status || 'ready',
      modelUrl: overrides.modelUrl ||
        `https://cdn.example.com/avatars/${uuidv4()}.gltf`,
      thumbnailUrl: overrides.thumbnailUrl ||
        `https://cdn.example.com/thumbnails/${uuidv4()}.jpg`,
      metadata: overrides.metadata || {
        height: 175,
        weight: 70,
        bodyType: 'athletic'
      },
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Build avatar with measurements
   */
  buildWithMeasurements(overrides: Partial<Avatar> = {}): Avatar {
    const avatar = this.build(overrides);
    avatar.measurements = {
      id: uuidv4(),
      avatarId: avatar.id!,
      height: 175,
      shoulderWidth: 45,
      chestCircumference: 95,
      waistCircumference: 80,
      hipCircumference: 98,
      inseamLength: 80,
      armLength: 65,
      neckCircumference: 38,
      unit: 'metric',
      confidence: 0.92,
      isManual: false
    };
    return avatar;
  }

  /**
   * Build multiple avatar instances without persisting
   */
  buildMany(count: number, overrides: Partial<Avatar> = {}): Avatar[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Create and persist an avatar to database
   */
  async create(overrides: Partial<Avatar> = {}): Promise<Avatar> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const avatar = this.build(overrides);
    const repository = this.dataSource.getRepository('Avatar');
    return await repository.save(avatar);
  }

  /**
   * Create and persist multiple avatars to database
   */
  async createMany(count: number, overrides: Partial<Avatar> = {}): Promise<Avatar[]> {
    if (!this.dataSource) {
      throw new Error('DataSource not set. Call setDataSource() first or pass it to constructor.');
    }

    const avatars = this.buildMany(count, overrides);
    const repository = this.dataSource.getRepository('Avatar');
    return await repository.save(avatars);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }

  /**
   * Build avatar in processing status
   */
  buildProcessing(overrides: Partial<Avatar> = {}): Avatar {
    return this.build({
      status: 'processing',
      modelUrl: undefined,
      thumbnailUrl: undefined,
      ...overrides
    });
  }

  /**
   * Build avatar in failed status
   */
  buildFailed(overrides: Partial<Avatar> = {}): Avatar {
    return this.build({
      status: 'failed',
      metadata: {
        error: 'Processing failed',
        ...overrides.metadata
      },
      ...overrides
    });
  }
}
