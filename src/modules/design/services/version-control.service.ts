import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Version } from '../entities/version.entity';
import { Design } from '../entities/design.entity';
import { VersionRepository } from '../repositories/version.repository';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';
import { SnapshotRepository } from '../repositories/snapshot.repository';
import { DesignCacheService } from './cache.service';

export interface VersionDiff {
  designChanges: Record<string, any>;
  layersAdded: any[];
  layersRemoved: string[];
  layersModified: Record<string, any>[];
  canvasChanges: Record<string, any>;
}

/**
 * Version Control Service
 * Manages design versioning, snapshots, and restoration
 */
@Injectable()
export class VersionControlService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly versionRepo: VersionRepository,
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
    private readonly snapshotRepo: SnapshotRepository,
    private readonly cacheService: DesignCacheService,
  ) {}

  /**
   * Create an automatic snapshot (incremental)
   * Called internally after significant changes
   */
  async createSnapshot(
    designId: string,
    userId: string,
    message?: string,
  ): Promise<Version> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'editor');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get current design state
      const design = await this.designRepo.findById(designId);
      if (!design) {
        throw new NotFoundException(`Design with ID ${designId} not found`);
      }

      const layers = await this.layerRepo.findByDesignId(designId);
      const canvasSettings = await this.canvasSettingsRepo.findByDesignId(
        designId,
      );

      // Get next version number
      const nextVersionNumber = await this.versionRepo.getNextVersionNumber(
        designId,
      );

      // Get previous snapshot to calculate diff
      const previousVersion = await this.versionRepo.getLatestVersion(designId);
      let diff: Record<string, any> = {};

      if (previousVersion && previousVersion.snapshotRef) {
        const previousSnapshot = await this.snapshotRepo.findSnapshotByVersionId(
          previousVersion.id,
        );
        if (previousSnapshot) {
          diff = this.calculateDiff(
            previousSnapshot.snapshot,
            {
              design,
              layers,
              canvasSettings,
            },
          );
        }
      }

      // Create snapshot in MongoDB
      const snapshot = await this.snapshotRepo.createSnapshot({
        designId,
        versionId: '', // Will be updated after version creation
        snapshot: {
          design: {
            id: design.id,
            name: design.name,
            description: design.description,
            avatar_id: design.avatarId,
            category: design.category,
            tags: design.tags,
            occasion: design.occasion,
            season: design.season,
            status: design.status,
            visibility: design.visibility,
            version: design.version,
          },
          layers: layers.map((layer) => ({
            id: layer.id,
            type: layer.type,
            order_index: layer.orderIndex,
            name: layer.name,
            catalog_item_id: layer.catalogItemId,
            catalog_item_type: layer.catalogItemType,
            transform: layer.transform,
            customization: layer.customization,
            is_visible: layer.isVisible,
            is_locked: layer.isLocked,
            blend_mode: layer.blendMode,
            opacity: layer.opacity,
          })),
          canvasSettings: canvasSettings
            ? {
                camera: canvasSettings.camera,
                lighting: canvasSettings.lighting,
                background: canvasSettings.background,
                show_grid: canvasSettings.showGrid,
                show_guides: canvasSettings.showGuides,
                snap_to_grid: canvasSettings.snapToGrid,
                grid_size: canvasSettings.gridSize,
                render_quality: canvasSettings.renderQuality,
                antialiasing: canvasSettings.antialiasing,
                shadows: canvasSettings.shadows,
                ambient_occlusion: canvasSettings.ambientOcclusion,
              }
            : undefined,
        },
      });

      // Create version record in PostgreSQL
      const version = await this.versionRepo.create({
        designId,
        versionNumber: nextVersionNumber,
        message: message || `Auto-save at version ${nextVersionNumber}`,
        snapshotRef: snapshot._id.toString(),
        diff: Object.keys(diff).length > 0 ? diff : null,
        createdBy: userId,
      });

      // Update design version number
      await this.designRepo.update(designId, {
        version: nextVersionNumber,
      });

      await queryRunner.commitTransaction();

      return version;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Create a user checkpoint (manual save point)
   */
  async createCheckpoint(
    designId: string,
    userId: string,
    message: string,
  ): Promise<Version> {
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Checkpoint message is required');
    }

    return this.createSnapshot(designId, userId, message);
  }

  /**
   * Restore design to a previous version
   */
  async restoreVersion(
    designId: string,
    versionNumber: number,
    userId: string,
  ): Promise<Design> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'editor');

    // Find the version to restore
    const versionToRestore = await this.versionRepo.findByVersionNumber(
      designId,
      versionNumber,
    );

    if (!versionToRestore) {
      throw new NotFoundException(
        `Version ${versionNumber} not found for design ${designId}`,
      );
    }

    if (!versionToRestore.snapshotRef) {
      throw new BadRequestException(
        'This version does not have a snapshot reference',
      );
    }

    // Get the snapshot from MongoDB
    const snapshot = await this.snapshotRepo.findSnapshotByVersionId(
      versionToRestore.id,
    );

    if (!snapshot) {
      throw new NotFoundException(
        `Snapshot not found for version ${versionNumber}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restore design metadata
      const restoredDesign = await this.designRepo.update(designId, {
        name: snapshot.snapshot.design.name,
        description: snapshot.snapshot.design.description,
        avatarId: snapshot.snapshot.design.avatar_id,
        category: snapshot.snapshot.design.category,
        tags: snapshot.snapshot.design.tags,
        occasion: snapshot.snapshot.design.occasion,
        season: snapshot.snapshot.design.season,
        // Keep current status and visibility
        lastEditedAt: new Date(),
      });

      // Delete all current layers
      await this.layerRepo.deleteByDesignId(designId);

      // Restore layers from snapshot
      if (snapshot.snapshot.layers && snapshot.snapshot.layers.length > 0) {
        const layersToCreate = snapshot.snapshot.layers.map((layer) => ({
          designId,
          type: layer.type as any,
          orderIndex: layer.order_index,
          name: layer.name,
          catalogItemId: layer.catalog_item_id,
          catalogItemType: layer.catalog_item_type,
          transform: layer.transform,
          customization: layer.customization,
          isVisible: layer.is_visible,
          isLocked: layer.is_locked,
          blendMode: layer.blend_mode as any,
          opacity: layer.opacity,
        }));

        await this.layerRepo.bulkCreate(layersToCreate);
      }

      // Restore canvas settings
      if (snapshot.snapshot.canvasSettings) {
        const existingCanvas = await this.canvasSettingsRepo.findByDesignId(
          designId,
        );

        if (existingCanvas) {
          await this.canvasSettingsRepo.update(existingCanvas.id, {
            camera: snapshot.snapshot.canvasSettings.camera,
            lighting: snapshot.snapshot.canvasSettings.lighting,
            background: snapshot.snapshot.canvasSettings.background,
            showGrid: snapshot.snapshot.canvasSettings.show_grid,
            showGuides: snapshot.snapshot.canvasSettings.show_guides,
            snapToGrid: snapshot.snapshot.canvasSettings.snap_to_grid,
            gridSize: snapshot.snapshot.canvasSettings.grid_size,
            renderQuality: snapshot.snapshot.canvasSettings.render_quality,
            antialiasing: snapshot.snapshot.canvasSettings.antialiasing,
            shadows: snapshot.snapshot.canvasSettings.shadows,
            ambientOcclusion: snapshot.snapshot.canvasSettings.ambient_occlusion,
          });
        }
      }

      // Create a new version for the restoration
      const nextVersionNumber = await this.versionRepo.getNextVersionNumber(
        designId,
      );
      await this.versionRepo.create({
        designId,
        versionNumber: nextVersionNumber,
        message: `Restored to version ${versionNumber}`,
        snapshotRef: snapshot._id.toString(),
        createdBy: userId,
      });

      // Update design version number
      await this.designRepo.update(designId, {
        version: nextVersionNumber,
      });

      await queryRunner.commitTransaction();

      // Invalidate all caches
      await this.cacheService.invalidateDesign(designId);

      return restoredDesign!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Compare two versions and return differences
   */
  async compareVersions(
    designId: string,
    version1: number,
    version2: number,
  ): Promise<VersionDiff> {
    // Get both versions
    const v1 = await this.versionRepo.findByVersionNumber(designId, version1);
    const v2 = await this.versionRepo.findByVersionNumber(designId, version2);

    if (!v1 || !v2) {
      throw new NotFoundException('One or both versions not found');
    }

    if (!v1.snapshotRef || !v2.snapshotRef) {
      throw new BadRequestException(
        'Both versions must have snapshot references',
      );
    }

    // Get snapshots
    const snapshot1 = await this.snapshotRepo.findSnapshotByVersionId(v1.id);
    const snapshot2 = await this.snapshotRepo.findSnapshotByVersionId(v2.id);

    if (!snapshot1 || !snapshot2) {
      throw new NotFoundException('One or both snapshots not found');
    }

    // Calculate and return diff
    return this.calculateVersionDiff(
      snapshot1.snapshot,
      snapshot2.snapshot,
    );
  }

  /**
   * List all versions for a design
   */
  async listVersions(
    designId: string,
    userId: string,
    limit?: number,
  ): Promise<Version[]> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'viewer');

    return this.versionRepo.findByDesignId(designId, limit);
  }

  /**
   * Get the latest version
   */
  async getLatestVersion(designId: string): Promise<Version | null> {
    return this.versionRepo.getLatestVersion(designId);
  }

  /**
   * Calculate diff between snapshots (for incremental versioning)
   */
  private calculateDiff(
    oldSnapshot: any,
    newState: any,
  ): Record<string, any> {
    const diff: Record<string, any> = {};

    // Compare design metadata
    const designChanges: Record<string, any> = {};
    if (oldSnapshot.design.name !== newState.design.name) {
      designChanges.name = {
        old: oldSnapshot.design.name,
        new: newState.design.name,
      };
    }
    if (oldSnapshot.design.description !== newState.design.description) {
      designChanges.description = {
        old: oldSnapshot.design.description,
        new: newState.design.description,
      };
    }
    if (Object.keys(designChanges).length > 0) {
      diff.designChanges = designChanges;
    }

    // Compare layers
    const oldLayerIds = new Set(oldSnapshot.layers.map((l: any) => l.id));
    const newLayerIds = new Set(newState.layers.map((l: any) => l.id));

    const layersAdded = newState.layers.filter(
      (l: any) => !oldLayerIds.has(l.id),
    );
    const layersRemoved = oldSnapshot.layers.filter(
      (l: any) => !newLayerIds.has(l.id),
    );

    if (layersAdded.length > 0) {
      diff.layersAdded = layersAdded.map((l: any) => l.id);
    }
    if (layersRemoved.length > 0) {
      diff.layersRemoved = layersRemoved.map((l: any) => l.id);
    }

    return diff;
  }

  /**
   * Calculate detailed diff between two versions
   */
  private calculateVersionDiff(
    snapshot1: any,
    snapshot2: any,
  ): VersionDiff {
    const diff: VersionDiff = {
      designChanges: {},
      layersAdded: [],
      layersRemoved: [],
      layersModified: [],
      canvasChanges: {},
    };

    // Compare design metadata
    const designFields = ['name', 'description', 'category', 'tags', 'status'];
    designFields.forEach((field) => {
      if (
        JSON.stringify(snapshot1.design[field]) !==
        JSON.stringify(snapshot2.design[field])
      ) {
        diff.designChanges[field] = {
          old: snapshot1.design[field],
          new: snapshot2.design[field],
        };
      }
    });

    // Compare layers
    const oldLayersMap = new Map(
      snapshot1.layers.map((l: any) => [l.id, l]),
    );
    const newLayersMap = new Map(
      snapshot2.layers.map((l: any) => [l.id, l]),
    );

    // Find added layers
    snapshot2.layers.forEach((layer: any) => {
      if (!oldLayersMap.has(layer.id)) {
        diff.layersAdded.push(layer);
      }
    });

    // Find removed layers
    snapshot1.layers.forEach((layer: any) => {
      if (!newLayersMap.has(layer.id)) {
        diff.layersRemoved.push(layer.id);
      }
    });

    // Find modified layers
    snapshot2.layers.forEach((newLayer: any) => {
      const oldLayer = oldLayersMap.get(newLayer.id);
      if (oldLayer) {
        const layerChanges: Record<string, any> = {};
        const layerFields = [
          'name',
          'order_index',
          'transform',
          'customization',
          'is_visible',
          'opacity',
        ];

        layerFields.forEach((field) => {
          if (
            JSON.stringify(oldLayer[field]) !==
            JSON.stringify(newLayer[field])
          ) {
            layerChanges[field] = {
              old: oldLayer[field],
              new: newLayer[field],
            };
          }
        });

        if (Object.keys(layerChanges).length > 0) {
          diff.layersModified.push({
            id: newLayer.id,
            changes: layerChanges,
          });
        }
      }
    });

    // Compare canvas settings
    if (snapshot1.canvasSettings && snapshot2.canvasSettings) {
      const canvasFields = [
        'camera',
        'lighting',
        'background',
        'render_quality',
      ];
      canvasFields.forEach((field) => {
        if (
          JSON.stringify(snapshot1.canvasSettings[field]) !==
          JSON.stringify(snapshot2.canvasSettings[field])
        ) {
          diff.canvasChanges[field] = {
            old: snapshot1.canvasSettings[field],
            new: snapshot2.canvasSettings[field],
          };
        }
      });
    }

    return diff;
  }

  /**
   * Verify user has access to the design
   */
  private async verifyDesignAccess(
    designId: string,
    userId: string,
    requiredRole: 'viewer' | 'editor' | 'owner' = 'viewer',
  ): Promise<void> {
    const design = await this.designRepo.findById(designId);

    if (!design) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Owner always has full access
    if (design.userId === userId) {
      return;
    }

    // Check if design is public and user only needs viewer access
    if (design.visibility === 'public' && requiredRole === 'viewer') {
      return;
    }

    // TODO: Check collaborators table for shared designs

    throw new ForbiddenException('You do not have access to this design');
  }
}
