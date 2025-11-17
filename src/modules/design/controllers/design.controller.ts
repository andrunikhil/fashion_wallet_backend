import {
  UseGuards,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserId } from '../../../shared/decorators/current-user.decorator';
import { DesignService } from '../services/design.service';
import { CreateDesignDto } from '../dto/create-design.dto';
import { UpdateDesignDto } from '../dto/update-design.dto';
import { QueryDesignsDto } from '../dto/query-designs.dto';

/**
 * Design Controller
 * Handles all design-related HTTP requests
 *
 * TODO: Add authentication guards (@UseGuards(AuthGuard))
 * TODO: Add user context decorator (@CurrentUser())
 */
@ApiTags('Designs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/designs')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  /**
   * Create a new design
   * POST /api/designs
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDesign(
    @Body(ValidationPipe) createDto: CreateDesignDto,
    @UserId() userId: string,
  ) {



    const design = await this.designService.createDesign(userId, createDto);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * List designs for current user with filters
   * GET /api/designs
   */
  @Get()
  async listDesigns(
    @Query(ValidationPipe) query: QueryDesignsDto,
    @UserId() userId: string,
  ) {



    const result = await this.designService.listDesigns(userId, query);

    return {
      success: true,
      data: result.designs,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    };
  }

  /**
   * Get a specific design by ID
   * GET /api/designs/:id
   */
  @Get(':id')
  async getDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    const design = await this.designService.getDesign(id, userId);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Get complete design state (design + layers + canvas)
   * GET /api/designs/:id/state
   */
  @Get(':id/state')
  async getDesignState(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    const state = await this.designService.getDesignWithFullState(id, userId);

    return {
      success: true,
      data: state,
    };
  }

  /**
   * Update design metadata
   * PATCH /api/designs/:id
   */
  @Patch(':id')
  async updateDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateDesignDto,
    @UserId() userId: string,
  ) {



    const design = await this.designService.updateDesign(id, userId, updateDto);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Delete design (soft delete)
   * DELETE /api/designs/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    await this.designService.deleteDesign(id, userId);
  }

  /**
   * Publish a design
   * POST /api/designs/:id/publish
   */
  @Post(':id/publish')
  async publishDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    const design = await this.designService.publishDesign(id, userId);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Unpublish a design
   * POST /api/designs/:id/unpublish
   */
  @Post(':id/unpublish')
  async unpublishDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    const design = await this.designService.unpublishDesign(id, userId);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Archive a design
   * POST /api/designs/:id/archive
   */
  @Post(':id/archive')
  async archiveDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @UserId() userId: string,
  ) {



    const design = await this.designService.archiveDesign(id, userId);

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Fork (duplicate) a design
   * POST /api/designs/:id/fork
   */
  @Post(':id/fork')
  async forkDesign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { name?: string },
    @UserId() userId: string,
  ) {



    const design = await this.designService.forkDesign(
      id,
      userId,
      body?.name,
    );

    return {
      success: true,
      data: design,
    };
  }

  /**
   * Get published designs (public gallery)
   * GET /api/designs/public
   */
  @Get('public/gallery')
  async getPublicDesigns(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.designService.getPublishedDesigns(
      limit || 20,
      offset || 0,
    );

    return {
      success: true,
      data: result.designs,
      meta: {
        total: result.total,
        limit: limit || 20,
        offset: offset || 0,
      },
    };
  }

  /**
   * Search designs by tags
   * GET /api/designs/search
   */
  @Get('search/tags')
  async searchDesigns(
    @Query('tags') tags: string,
    // TODO: @CurrentUser() user?: User,
  ) {
    // Parse comma-separated tags
    const tagArray = tags.split(',').map((tag) => tag.trim());

    // TODO: Extract userId from authenticated user (optional for public search)
    const userId = undefined; // Placeholder

    const designs = await this.designService.searchByTags(tagArray, userId);

    return {
      success: true,
      data: designs,
    };
  }

  /**
   * Increment view count (analytics)
   * POST /api/designs/:id/view
   */
  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async incrementViewCount(@Param('id', ParseUUIDPipe) id: string) {
    await this.designService.incrementViewCount(id);
  }
}
