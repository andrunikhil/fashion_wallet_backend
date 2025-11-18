import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Layer } from '../entities/layer.entity';
import { LayerRepository } from '../repositories/layer.repository';
import { DesignRepository } from '../repositories/design.repository';
import { CollaboratorRepository } from '../repositories/collaborator.repository';
import { DesignCacheService } from './cache.service';
import { TierLimitsService } from './tier-limits.service';
import { CreateLayerDto } from '../dto/create-layer.dto';
import { UpdateLayerDto } from '../dto/update-layer.dto';
import { ReorderLayersDto } from '../dto/reorder-layers.dto';

/**
 * Layer Service
 * Manages layer CRUD operations, ordering, and grouping
 */
@Injectable()
export class LayerService {
  // Tier-based layer limits
  private readonly LAYER_LIMITS = {
    free: 10,
    pro: 50,
    enterprise: 200,
  };

  // Transform validation ranges
  private readonly TRANSFORM_LIMITS = {
    position: { min: -10000, max: 10000 },
    rotation: { min: 0, max: 360 },
    scale: { min: 0.01, max: 100 },
  };

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly layerRepo: LayerRepository,
    private readonly designRepo: DesignRepository,
    private readonly collaboratorRepo: CollaboratorRepository,
    private readonly cacheService: DesignCacheService,
    private readonly tierLimitsService: TierLimitsService,
  ) {}

  /**
   * Add a new layer to a design
   */
  async addLayer(
    designId: string,
    userId: string,
    user: any,
    createDto: CreateLayerDto,
  ): Promise<Layer> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'editor');

    // Check tier-based layer limits
    const userTier = this.tierLimitsService.getUserTier(user);
    await this.tierLimitsService.validateLayerAddition(designId, userTier);

    // TODO: Validate catalog item existence

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get next order index if not provided
      let orderIndex = createDto.orderIndex;
      if (orderIndex === undefined) {
        const maxOrder = await this.layerRepo.getMaxOrderIndex(designId);
        orderIndex = maxOrder + 1;
      }

      // Validate transform if provided
      if (createDto.transform) {
        this.validateTransform(createDto.transform);
      }

      // Create layer
      const layer = await this.layerRepo.create({
        designId,
        type: createDto.type,
        name: createDto.name || `${createDto.type} layer`,
        catalogItemId: createDto.catalogItemId,
        catalogItemType: createDto.catalogItemType,
        orderIndex,
        transform: createDto.transform || {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        },
        customization: createDto.customization || {},
        isVisible: createDto.isVisible ?? true,
        isLocked: createDto.isLocked ?? false,
        blendMode: createDto.blendMode || 'normal',
        opacity: createDto.opacity ?? 100,
        notes: createDto.notes,
      });

      // Update design's last edited timestamp
      await this.designRepo.update(designId, {
        lastEditedAt: new Date(),
      });

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.cacheService.invalidateLayers(designId);

      return layer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update layer properties
   */
  async updateLayer(
    layerId: string,
    userId: string,
    updateDto: UpdateLayerDto,
  ): Promise<Layer> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    // Check if layer is locked
    if (layer.isLocked) {
      throw new BadRequestException('Cannot update a locked layer');
    }

    // Validate transform if provided
    if (updateDto.transform) {
      this.validateTransform(updateDto.transform);
    }

    // Merge existing transform with updates if partial
    const updatedTransform = updateDto.transform
      ? {
          position: updateDto.transform.position || layer.transform.position,
          rotation: updateDto.transform.rotation || layer.transform.rotation,
          scale: updateDto.transform.scale || layer.transform.scale,
        }
      : layer.transform;

    // Update layer
    const updated = await this.layerRepo.update(layerId, {
      ...updateDto,
      transform: updatedTransform,
    });

    if (!updated) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Update design's last edited timestamp
    await this.designRepo.update(layer.designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(layer.designId);

    return updated;
  }

  /**
   * Delete a layer
   */
  async deleteLayer(layerId: string, userId: string): Promise<void> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    // Check if layer is locked
    if (layer.isLocked) {
      throw new BadRequestException('Cannot delete a locked layer');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete layer
      const success = await this.layerRepo.delete(layerId);

      if (!success) {
        throw new NotFoundException(`Layer with ID ${layerId} not found`);
      }

      // Reindex remaining layers to fill the gap
      const remainingLayers = await this.layerRepo.findByDesignId(layer.designId);
      const reindexUpdates = remainingLayers.map((l, index) => ({
        id: l.id,
        orderIndex: index,
      }));

      if (reindexUpdates.length > 0) {
        await this.layerRepo.reorderLayers(reindexUpdates);
      }

      // Update design's last edited timestamp
      await this.designRepo.update(layer.designId, {
        lastEditedAt: new Date(),
      });

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.cacheService.invalidateLayers(layer.designId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reorder layers with custom indices
   */
  async reorderLayers(
    designId: string,
    userId: string,
    reorderDto: ReorderLayersDto,
  ): Promise<Layer[]> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'editor');

    // Validate all layer IDs belong to this design
    const layerIds = reorderDto.layers.map((l) => l.id);
    const layers = await this.layerRepo.findByIds(layerIds);

    if (layers.length !== layerIds.length) {
      throw new BadRequestException('Some layer IDs are invalid');
    }

    const invalidLayers = layers.filter((l) => l.designId !== designId);
    if (invalidLayers.length > 0) {
      throw new BadRequestException(
        'All layers must belong to the same design',
      );
    }

    // Apply reordering
    await this.layerRepo.reorderLayers(reorderDto.layers);

    // Update design's last edited timestamp
    await this.designRepo.update(designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(designId);

    // Return updated layers
    return this.layerRepo.findByDesignId(designId);
  }

  /**
   * Move layer up by one position
   */
  async moveLayerUp(layerId: string, userId: string): Promise<Layer[]> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    if (layer.orderIndex === 0) {
      throw new BadRequestException('Layer is already at the top');
    }

    const allLayers = await this.layerRepo.findByDesignId(layer.designId);

    // Find the layer above (lower index)
    const layerAbove = allLayers.find(
      (l) => l.orderIndex === layer.orderIndex - 1,
    );

    if (!layerAbove) {
      throw new BadRequestException('Cannot move layer up');
    }

    // Swap order indices
    await this.layerRepo.reorderLayers([
      { id: layer.id, orderIndex: layerAbove.orderIndex },
      { id: layerAbove.id, orderIndex: layer.orderIndex },
    ]);

    // Update design's last edited timestamp
    await this.designRepo.update(layer.designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(layer.designId);

    // Return updated layers
    return this.layerRepo.findByDesignId(layer.designId);
  }

  /**
   * Move layer down by one position
   */
  async moveLayerDown(layerId: string, userId: string): Promise<Layer[]> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    const allLayers = await this.layerRepo.findByDesignId(layer.designId);
    const maxIndex = allLayers.length - 1;

    if (layer.orderIndex === maxIndex) {
      throw new BadRequestException('Layer is already at the bottom');
    }

    // Find the layer below (higher index)
    const layerBelow = allLayers.find(
      (l) => l.orderIndex === layer.orderIndex + 1,
    );

    if (!layerBelow) {
      throw new BadRequestException('Cannot move layer down');
    }

    // Swap order indices
    await this.layerRepo.reorderLayers([
      { id: layer.id, orderIndex: layerBelow.orderIndex },
      { id: layerBelow.id, orderIndex: layer.orderIndex },
    ]);

    // Update design's last edited timestamp
    await this.designRepo.update(layer.designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(layer.designId);

    // Return updated layers
    return this.layerRepo.findByDesignId(layer.designId);
  }

  /**
   * Move layer to top (index 0)
   */
  async moveLayerToTop(layerId: string, userId: string): Promise<Layer[]> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    if (layer.orderIndex === 0) {
      throw new BadRequestException('Layer is already at the top');
    }

    const allLayers = await this.layerRepo.findByDesignId(layer.designId);

    // Reindex: move target to 0, shift others down
    const reindexUpdates = allLayers.map((l) => {
      if (l.id === layerId) {
        return { id: l.id, orderIndex: 0 };
      } else if (l.orderIndex < layer.orderIndex) {
        return { id: l.id, orderIndex: l.orderIndex + 1 };
      } else {
        return { id: l.id, orderIndex: l.orderIndex };
      }
    });

    await this.layerRepo.reorderLayers(reindexUpdates);

    // Update design's last edited timestamp
    await this.designRepo.update(layer.designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(layer.designId);

    // Return updated layers
    return this.layerRepo.findByDesignId(layer.designId);
  }

  /**
   * Move layer to bottom (max index)
   */
  async moveLayerToBottom(layerId: string, userId: string): Promise<Layer[]> {
    const layer = await this.layerRepo.findById(layerId);

    if (!layer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(layer.designId, userId, 'editor');

    const allLayers = await this.layerRepo.findByDesignId(layer.designId);
    const maxIndex = allLayers.length - 1;

    if (layer.orderIndex === maxIndex) {
      throw new BadRequestException('Layer is already at the bottom');
    }

    // Reindex: move target to bottom, shift others up
    const reindexUpdates = allLayers.map((l) => {
      if (l.id === layerId) {
        return { id: l.id, orderIndex: maxIndex };
      } else if (l.orderIndex > layer.orderIndex) {
        return { id: l.id, orderIndex: l.orderIndex - 1 };
      } else {
        return { id: l.id, orderIndex: l.orderIndex };
      }
    });

    await this.layerRepo.reorderLayers(reindexUpdates);

    // Update design's last edited timestamp
    await this.designRepo.update(layer.designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate caches
    await this.cacheService.invalidateLayers(layer.designId);

    // Return updated layers
    return this.layerRepo.findByDesignId(layer.designId);
  }

  /**
   * Duplicate a layer
   */
  async duplicateLayer(layerId: string, userId: string): Promise<Layer> {
    const originalLayer = await this.layerRepo.findById(layerId);

    if (!originalLayer) {
      throw new NotFoundException(`Layer with ID ${layerId} not found`);
    }

    // Verify design access
    await this.verifyDesignAccess(originalLayer.designId, userId, 'editor');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get next order index
      const maxOrder = await this.layerRepo.getMaxOrderIndex(
        originalLayer.designId,
      );
      const newOrderIndex = maxOrder + 1;

      // Create duplicate layer
      const duplicatedLayer = await this.layerRepo.create({
        designId: originalLayer.designId,
        type: originalLayer.type,
        name: `${originalLayer.name || 'Layer'} (Copy)`,
        catalogItemId: originalLayer.catalogItemId,
        catalogItemType: originalLayer.catalogItemType,
        orderIndex: newOrderIndex,
        transform: { ...originalLayer.transform },
        customization: { ...originalLayer.customization },
        isVisible: originalLayer.isVisible,
        isLocked: false, // Unlock duplicated layer
        blendMode: originalLayer.blendMode,
        opacity: originalLayer.opacity,
        notes: originalLayer.notes,
      });

      // Update design's last edited timestamp
      await this.designRepo.update(originalLayer.designId, {
        lastEditedAt: new Date(),
      });

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.cacheService.invalidateLayers(originalLayer.designId);

      return duplicatedLayer;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all layers for a design
   */
  async getLayersByDesignId(
    designId: string,
    userId: string,
  ): Promise<Layer[]> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId, 'viewer');

    // Check cache first
    const cachedLayers = await this.cacheService.getLayers(designId);
    if (cachedLayers) {
      return cachedLayers;
    }

    // Fetch from database
    const layers = await this.layerRepo.findByDesignId(designId);

    // Cache for future requests
    await this.cacheService.cacheLayers(designId, layers);

    return layers;
  }

  /**
   * Validate catalog item compatibility with avatar
   * TODO: Implement when Catalog Service is available
   */
  async validateLayerCompatibility(
    catalogItemId: string,
    avatarId?: string,
  ): Promise<boolean> {
    // Placeholder implementation
    // Will integrate with Catalog Service to check:
    // - Item exists
    // - Item is compatible with avatar type
    // - Item meets tier restrictions
    return true;
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

    // Check collaborators table for shared designs
    if (design.visibility === 'shared') {
      const hasAccess = await this.collaboratorRepo.hasAccess(
        designId,
        userId,
        requiredRole,
      );

      if (hasAccess) {
        return;
      }
    }

    throw new ForbiddenException('You do not have access to this design');
  }

  /**
   * Validate transform values are within acceptable ranges
   */
  private validateTransform(transform: any): void {
    if (transform.position) {
      const { x, y, z } = transform.position;
      if (
        x < this.TRANSFORM_LIMITS.position.min ||
        x > this.TRANSFORM_LIMITS.position.max ||
        y < this.TRANSFORM_LIMITS.position.min ||
        y > this.TRANSFORM_LIMITS.position.max ||
        z < this.TRANSFORM_LIMITS.position.min ||
        z > this.TRANSFORM_LIMITS.position.max
      ) {
        throw new BadRequestException(
          `Position values must be between ${this.TRANSFORM_LIMITS.position.min} and ${this.TRANSFORM_LIMITS.position.max}`,
        );
      }
    }

    if (transform.rotation) {
      const { x, y, z } = transform.rotation;
      if (
        x < this.TRANSFORM_LIMITS.rotation.min ||
        x > this.TRANSFORM_LIMITS.rotation.max ||
        y < this.TRANSFORM_LIMITS.rotation.min ||
        y > this.TRANSFORM_LIMITS.rotation.max ||
        z < this.TRANSFORM_LIMITS.rotation.min ||
        z > this.TRANSFORM_LIMITS.rotation.max
      ) {
        throw new BadRequestException(
          `Rotation values must be between ${this.TRANSFORM_LIMITS.rotation.min} and ${this.TRANSFORM_LIMITS.rotation.max}`,
        );
      }
    }

    if (transform.scale) {
      const { x, y, z } = transform.scale;
      if (
        x < this.TRANSFORM_LIMITS.scale.min ||
        x > this.TRANSFORM_LIMITS.scale.max ||
        y < this.TRANSFORM_LIMITS.scale.min ||
        y > this.TRANSFORM_LIMITS.scale.max ||
        z < this.TRANSFORM_LIMITS.scale.min ||
        z > this.TRANSFORM_LIMITS.scale.max
      ) {
        throw new BadRequestException(
          `Scale values must be between ${this.TRANSFORM_LIMITS.scale.min} and ${this.TRANSFORM_LIMITS.scale.max}`,
        );
      }
    }
  }
}
