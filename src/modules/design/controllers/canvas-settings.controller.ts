import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserId } from '../../../shared/decorators/current-user.decorator';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';
import { DesignRepository } from '../repositories/design.repository';
import { DesignCacheService } from '../services/cache.service';
import {
  CameraSettings,
  LightingSettings,
  BackgroundSettings,
} from '../entities/canvas-settings.entity';

/**
 * Update Canvas Settings DTO
 */
class UpdateCanvasSettingsDto {
  camera?: CameraSettings;
  lighting?: LightingSettings;
  background?: BackgroundSettings;
  showGrid?: boolean;
  showGuides?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  renderQuality?: string;
  antialiasing?: boolean;
  shadows?: boolean;
  ambientOcclusion?: boolean;
}

/**
 * Canvas Settings Controller
 * Handles canvas/viewport settings for designs
 *
 * All routes are nested under /api/designs/:designId/canvas
 *
 * TODO: Add validation decorators to UpdateCanvasSettingsDto
 */
@ApiTags('Canvas Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/designs/:designId/canvas')
export class CanvasSettingsController {
  constructor(
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
    private readonly designRepo: DesignRepository,
    private readonly cacheService: DesignCacheService,
  ) {}

  /**
   * Get canvas settings for a design
   * GET /api/designs/:designId/canvas
   */
  @Get()
  async getCanvasSettings(
    @Param('designId', ParseUUIDPipe) designId: string,
    @UserId() userId: string,
  ) {
    // Verify design access
    await this.verifyDesignAccess(designId, userId);

    // Check cache first
    const cached = await this.cacheService.getCanvasSettings(designId);
    if (cached) {
      return {
        success: true,
        data: cached,
      };
    }

    // Fetch from database
    const settings = await this.canvasSettingsRepo.findByDesignId(designId);

    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await this.canvasSettingsRepo.createDefault(
        designId,
      );

      // Cache settings
      await this.cacheService.cacheCanvasSettings(designId, defaultSettings);

      return {
        success: true,
        data: defaultSettings,
      };
    }

    // Cache settings
    await this.cacheService.cacheCanvasSettings(designId, settings);

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Update canvas settings
   * PATCH /api/designs/:designId/canvas
   */
  @Patch()
  async updateCanvasSettings(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Body() updateDto: UpdateCanvasSettingsDto,
    @UserId() userId: string,
  ) {
    // Verify design access (editor role required)
    await this.verifyDesignAccess(designId, userId, 'editor');

    // Get existing settings or create defaults
    let existingSettings = await this.canvasSettingsRepo.findByDesignId(
      designId,
    );

    if (!existingSettings) {
      existingSettings = await this.canvasSettingsRepo.createDefault(designId);
    }

    // Update settings
    const updated = await this.canvasSettingsRepo.update(
      designId,
      updateDto,
    );

    if (!updated) {
      throw new NotFoundException(
        `Canvas settings not found for design ${designId}`,
      );
    }

    // Update design's last edited timestamp
    await this.designRepo.update(designId, {
      lastEditedAt: new Date(),
    });

    // Invalidate cache
    await this.cacheService.invalidateCanvas(designId);

    // Cache updated settings
    await this.cacheService.cacheCanvasSettings(designId, updated);

    return {
      success: true,
      data: updated,
    };
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
