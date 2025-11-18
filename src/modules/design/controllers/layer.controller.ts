import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserId } from '../../../shared/decorators/current-user.decorator';
import { LayerService } from '../services/layer.service';
import { CreateLayerDto } from '../dto/create-layer.dto';
import { UpdateLayerDto } from '../dto/update-layer.dto';
import { ReorderLayersDto } from '../dto/reorder-layers.dto';

/**
 * Layer Controller
 * Handles layer management within designs
 *
 * All routes are nested under /api/designs/:designId/layers
 */
@ApiTags('Layers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/designs/:designId/layers')
export class LayerController {
  constructor(private readonly layerService: LayerService) {}

  /**
   * Add a layer to a design
   * POST /api/designs/:designId/layers
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addLayer(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Body(ValidationPipe) createDto: CreateLayerDto,
    @UserId() userId: string,
  ) {
    const layer = await this.layerService.addLayer(designId, userId, createDto);

    return {
      success: true,
      data: layer,
    };
  }

  /**
   * Get all layers for a design
   * GET /api/designs/:designId/layers
   */
  @Get()
  async getLayers(
    @Param('designId', ParseUUIDPipe) designId: string,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.getLayersByDesignId(
      designId,
      userId,
    );

    return {
      success: true,
      data: layers,
    };
  }

  /**
   * Get a specific layer by ID
   * GET /api/designs/:designId/layers/:layerId
   */
  @Get(':layerId')
  async getLayer(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    // Get all layers and find the specific one
    const layers = await this.layerService.getLayersByDesignId(
      designId,
      userId,
    );
    const layer = layers.find((l) => l.id === layerId);

    if (!layer) {
      return {
        success: false,
        error: 'Layer not found',
      };
    }

    return {
      success: true,
      data: layer,
    };
  }

  /**
   * Update a layer
   * PUT /api/designs/:designId/layers/:layerId
   */
  @Put(':layerId')
  async updateLayer(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @Body(ValidationPipe) updateDto: UpdateLayerDto,
    @UserId() userId: string,
  ) {
    const layer = await this.layerService.updateLayer(
      layerId,
      userId,
      updateDto,
    );

    return {
      success: true,
      data: layer,
    };
  }

  /**
   * Delete a layer
   * DELETE /api/designs/:designId/layers/:layerId
   */
  @Delete(':layerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLayer(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    await this.layerService.deleteLayer(layerId, userId);
  }

  /**
   * Duplicate a layer
   * POST /api/designs/:designId/layers/:layerId/duplicate
   */
  @Post(':layerId/duplicate')
  async duplicateLayer(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    const layer = await this.layerService.duplicateLayer(layerId, userId);

    return {
      success: true,
      data: layer,
    };
  }

  /**
   * Reorder layers (bulk update)
   * PATCH /api/designs/:designId/layers/reorder
   */
  @Patch('reorder')
  async reorderLayers(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Body(ValidationPipe) reorderDto: ReorderLayersDto,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.reorderLayers(
      designId,
      userId,
      reorderDto,
    );

    return {
      success: true,
      data: layers,
    };
  }

  /**
   * Move layer up by one position
   * POST /api/designs/:designId/layers/:layerId/move-up
   */
  @Post(':layerId/move-up')
  async moveLayerUp(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.moveLayerUp(layerId, userId);

    return {
      success: true,
      data: layers,
    };
  }

  /**
   * Move layer down by one position
   * POST /api/designs/:designId/layers/:layerId/move-down
   */
  @Post(':layerId/move-down')
  async moveLayerDown(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.moveLayerDown(layerId, userId);

    return {
      success: true,
      data: layers,
    };
  }

  /**
   * Move layer to top (index 0)
   * POST /api/designs/:designId/layers/:layerId/move-to-top
   */
  @Post(':layerId/move-to-top')
  async moveLayerToTop(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.moveLayerToTop(layerId, userId);

    return {
      success: true,
      data: layers,
    };
  }

  /**
   * Move layer to bottom (max index)
   * POST /api/designs/:designId/layers/:layerId/move-to-bottom
   */
  @Post(':layerId/move-to-bottom')
  async moveLayerToBottom(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('layerId', ParseUUIDPipe) layerId: string,
    @UserId() userId: string,
  ) {
    const layers = await this.layerService.moveLayerToBottom(layerId, userId);

    return {
      success: true,
      data: layers,
    };
  }
}
