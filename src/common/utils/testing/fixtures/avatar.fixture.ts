import { v4 as uuidv4 } from 'uuid';
import { FixtureFactory } from './fixture.interface';
import { DataSource } from 'typeorm';
import { Avatar } from '@/infrastructure/database/entities/avatar.entity';

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
 * // Build avatar
 * const avatar = avatarFixture.build({ userId: 'user123' });
 *
 * // Build avatar with custom measurements
 * const avatarWithMeasurements = avatarFixture.build({
 *   measurements: { height: 180, chest: 100 }
 * });
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

    const avatar = new Avatar();
    avatar.id = overrides.id || uuidv4();
    avatar.userId = overrides.userId || uuidv4();
    avatar.name = overrides.name || `Avatar ${this.sequenceId}`;
    avatar.gender = overrides.gender || 'unisex';
    avatar.measurements = overrides.measurements || {
      height: 170,
      weight: 65,
      chest: 90,
      waist: 75,
      hips: 95,
      shoulderWidth: 40
    };
    avatar.modelUrl = overrides.modelUrl || null;
    avatar.thumbnailUrl = overrides.thumbnailUrl || null;
    avatar.isDefault = overrides.isDefault ?? false;
    avatar.createdAt = overrides.createdAt || new Date();
    avatar.updatedAt = overrides.updatedAt || new Date();
    avatar.deletedAt = overrides.deletedAt || null;

    return avatar;
  }

  /**
   * Build male avatar
   */
  buildMale(overrides: Partial<Avatar> = {}): Avatar {
    return this.build({
      gender: 'male',
      measurements: {
        height: 180,
        weight: 75,
        chest: 100,
        waist: 85,
        hips: 95,
        shoulderWidth: 45
      },
      ...overrides
    });
  }

  /**
   * Build female avatar
   */
  buildFemale(overrides: Partial<Avatar> = {}): Avatar {
    return this.build({
      gender: 'female',
      measurements: {
        height: 165,
        weight: 60,
        chest: 85,
        waist: 68,
        hips: 92,
        shoulderWidth: 38
      },
      ...overrides
    });
  }

  /**
   * Build default avatar
   */
  buildDefault(overrides: Partial<Avatar> = {}): Avatar {
    return this.build({
      isDefault: true,
      name: 'Default Avatar',
      ...overrides
    });
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
    const repository = this.dataSource.getRepository(Avatar);
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
    const repository = this.dataSource.getRepository(Avatar);
    return await repository.save(avatars);
  }

  /**
   * Reset the sequence counter
   */
  reset(): void {
    this.sequenceId = 0;
  }
}
