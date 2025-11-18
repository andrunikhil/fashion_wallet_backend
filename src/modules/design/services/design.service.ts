import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Design } from '../entities/design.entity';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { VersionRepository } from '../repositories/version.repository';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';
import { CollaboratorRepository } from '../repositories/collaborator.repository';
import { DesignCacheService } from './cache.service';
import { TierLimitsService } from './tier-limits.service';
import { CreateDesignDto } from '../dto/create-design.dto';
import { UpdateDesignDto } from '../dto/update-design.dto';
import { QueryDesignsDto } from '../dto/query-designs.dto';

@Injectable()
export class DesignService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly versionRepo: VersionRepository,
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
    private readonly collaboratorRepo: CollaboratorRepository,
    private readonly cacheService: DesignCacheService,
    private readonly tierLimitsService: TierLimitsService,
  ) {}

  /**
   * Create a new design
   */
  async createDesign(
    userId: string,
    user: any,
    createDto: CreateDesignDto,
  ): Promise<Design> {
    // Validate user permissions and tier limits
    const userTier = this.tierLimitsService.getUserTier(user);
    await this.tierLimitsService.validateDesignCreation(userId, userTier);

    // TODO: Validate avatar existence if avatarId provided

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create design record
      const design = await this.designRepo.create({
        userId,
        name: createDto.name,
        description: createDto.description,
        avatarId: createDto.avatarId,
        category: createDto.category,
        tags: createDto.tags || [],
        occasion: createDto.occasion || [],
        season: createDto.season || [],
        visibility: createDto.visibility || 'private',
        status: 'draft',
        version: 1,
      });

      // Initialize canvas settings with defaults
      await this.canvasSettingsRepo.createDefault(design.id);

      // Create initial version
      await this.versionRepo.create({
        designId: design.id,
        versionNumber: 1,
        message: 'Initial version',
        createdBy: userId,
      });

      await queryRunner.commitTransaction();

      // Cache the design state
      await this.cacheService.cacheDesign(design);
      await this.cacheService.cacheLayers(design.id, []);

      return design;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get design by ID
   */
  async getDesign(designId: string, userId: string): Promise<Design> {
    // Check cache first
    const cached = await this.cacheService.getDesign(designId);
    if (cached) {
      // Verify ownership/access
      await this.verifyAccess(designId, userId);
      return cached;
    }

    // Fetch from database
    const design = await this.designRepo.findByIdWithLayers(designId);

    if (!design) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Verify ownership/access
    await this.verifyAccess(designId, userId);

    // Cache for future requests
    await this.cacheService.cacheDesign(design);
    if (design.layers) {
      await this.cacheService.cacheLayers(designId, design.layers);
    }

    return design;
  }

  /**
   * Get design with full state (design + layers + canvas settings)
   */
  async getDesignWithFullState(designId: string, userId: string) {
    // Check cache for complete state
    const cachedState = await this.cacheService.getDesignState(designId);
    if (cachedState) {
      await this.verifyAccess(designId, userId);
      return cachedState;
    }

    // Fetch all components
    const design = await this.getDesign(designId, userId);
    const layers = await this.layerRepo.findByDesignId(designId);
    const canvasSettings = await this.canvasSettingsRepo.findByDesignId(designId);

    const state = {
      design,
      layers,
      canvasSettings: canvasSettings || undefined,
      cachedAt: new Date(),
    };

    // Cache complete state
    await this.cacheService.cacheDesignState(designId, state);

    return state;
  }

  /**
   * List designs for a user
   */
  async listDesigns(
    userId: string,
    query: QueryDesignsDto,
  ): Promise<{ designs: Design[]; total: number; limit: number; offset: number }> {
    const [designs, total] = await this.designRepo.findByUserId(userId, {
      status: query.status,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });

    return {
      designs,
      total,
      limit: query.limit || 20,
      offset: query.offset || 0,
    };
  }

  /**
   * Update design
   */
  async updateDesign(
    designId: string,
    userId: string,
    updateDto: UpdateDesignDto,
  ): Promise<Design> {
    await this.verifyAccess(designId, userId, 'editor');

    const updated = await this.designRepo.update(designId, {
      ...updateDto,
      lastEditedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Invalidate cache
    await this.cacheService.invalidateDesign(designId);

    // Cache updated design
    await this.cacheService.cacheDesign(updated);

    return updated;
  }

  /**
   * Publish design
   */
  async publishDesign(designId: string, userId: string): Promise<Design> {
    await this.verifyAccess(designId, userId, 'owner');

    const design = await this.designRepo.findById(designId);
    if (!design) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Validate design completeness before publishing
    await this.validateDesignCompleteness(designId, design);

    const updated = await this.designRepo.update(designId, {
      status: 'published',
      publishedAt: new Date(),
    });

    // Invalidate cache
    await this.cacheService.invalidateDesign(designId);

    return updated!;
  }

  /**
   * Unpublish design
   */
  async unpublishDesign(designId: string, userId: string): Promise<Design> {
    await this.verifyAccess(designId, userId, 'owner');

    const updated = await this.designRepo.update(designId, {
      status: 'draft',
      publishedAt: null as any,
    });

    // Invalidate cache
    await this.cacheService.invalidateDesign(designId);

    return updated!;
  }

  /**
   * Archive design
   */
  async archiveDesign(designId: string, userId: string): Promise<Design> {
    await this.verifyAccess(designId, userId, 'owner');

    const updated = await this.designRepo.update(designId, {
      status: 'archived',
    });

    // Invalidate cache
    await this.cacheService.invalidateDesign(designId);

    return updated!;
  }

  /**
   * Delete design (soft delete)
   */
  async deleteDesign(designId: string, userId: string): Promise<void> {
    await this.verifyAccess(designId, userId, 'owner');

    const success = await this.designRepo.softDelete(designId);

    if (!success) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Invalidate all caches
    await this.cacheService.invalidateDesign(designId);
  }

  /**
   * Fork (duplicate) a design
   */
  async forkDesign(
    designId: string,
    userId: string,
    newName?: string,
  ): Promise<Design> {
    const original = await this.designRepo.findByIdWithLayers(designId);

    if (!original) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Check if original is public or user has access
    if (original.visibility !== 'public' && original.userId !== userId) {
      throw new ForbiddenException('Cannot fork this design');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Clone design record
      const forkedDesign = await this.designRepo.create({
        userId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        avatarId: original.avatarId,
        category: original.category,
        tags: original.tags,
        occasion: original.occasion,
        season: original.season,
        visibility: 'private',
        status: 'draft',
        forkFrom: original.id,
        version: 1,
      });

      // Clone all layers
      if (original.layers && original.layers.length > 0) {
        const clonedLayers = original.layers.map(layer => ({
          designId: forkedDesign.id,
          type: layer.type,
          orderIndex: layer.orderIndex,
          name: layer.name,
          catalogItemId: layer.catalogItemId,
          catalogItemType: layer.catalogItemType,
          transform: layer.transform,
          customization: layer.customization,
          isVisible: layer.isVisible,
          isLocked: false, // Unlock all layers in fork
          blendMode: layer.blendMode,
          opacity: layer.opacity,
        }));

        await this.layerRepo.bulkCreate(clonedLayers);
      }

      // Copy canvas settings
      const originalCanvas = await this.canvasSettingsRepo.findByDesignId(original.id);
      if (originalCanvas) {
        await this.canvasSettingsRepo.create({
          designId: forkedDesign.id,
          camera: originalCanvas.camera,
          lighting: originalCanvas.lighting,
          background: originalCanvas.background,
          showGrid: originalCanvas.showGrid,
          showGuides: originalCanvas.showGuides,
          snapToGrid: originalCanvas.snapToGrid,
          gridSize: originalCanvas.gridSize,
          renderQuality: originalCanvas.renderQuality,
          antialiasing: originalCanvas.antialiasing,
          shadows: originalCanvas.shadows,
          ambientOcclusion: originalCanvas.ambientOcclusion,
        });
      } else {
        await this.canvasSettingsRepo.createDefault(forkedDesign.id);
      }

      // Create initial version
      await this.versionRepo.create({
        designId: forkedDesign.id,
        versionNumber: 1,
        message: `Forked from design ${original.id}`,
        createdBy: userId,
      });

      // Increment fork count on original
      await this.designRepo.incrementForkCount(original.id);

      await queryRunner.commitTransaction();

      return forkedDesign;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(designId: string): Promise<void> {
    await this.designRepo.incrementViewCount(designId);
    // Invalidate cache to reflect new count
    await this.cacheService.invalidateDesign(designId);
  }

  /**
   * Search designs by tags
   */
  async searchByTags(tags: string[], userId?: string): Promise<Design[]> {
    return this.designRepo.searchByTags(tags, userId);
  }

  /**
   * Get published designs (public gallery)
   */
  async getPublishedDesigns(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ designs: Design[]; total: number }> {
    const [designs, total] = await this.designRepo.getPublishedDesigns(limit, offset);

    return { designs, total };
  }

  /**
   * Validate design has minimum requirements for publishing
   */
  private async validateDesignCompleteness(
    designId: string,
    design: Design,
  ): Promise<void> {
    // Check basic metadata
    if (!design.name || design.name.trim().length === 0) {
      throw new BadRequestException(
        'Design must have a name before publishing',
      );
    }

    // Check if design has at least one layer
    const layers = await this.layerRepo.findByDesignId(designId);
    if (layers.length === 0) {
      throw new BadRequestException(
        'Design must have at least one layer before publishing',
      );
    }

    // Check if design has a valid avatar reference
    if (!design.avatarId) {
      throw new BadRequestException(
        'Design must have an avatar assigned before publishing',
      );
    }

    // Validate design has required metadata
    if (!design.category) {
      throw new BadRequestException(
        'Design must have a category before publishing',
      );
    }

    // Check if design has tags (optional but recommended)
    if (!design.tags || design.tags.length === 0) {
      // This is just a warning, not blocking
      // Could log a warning or send to analytics
    }

    // Ensure visibility is set appropriately
    if (design.visibility === 'private') {
      throw new BadRequestException(
        'Cannot publish a private design. Change visibility to "public" or "shared" first',
      );
    }
  }

  /**
   * Verify user has access to design
   */
  private async verifyAccess(
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
}
