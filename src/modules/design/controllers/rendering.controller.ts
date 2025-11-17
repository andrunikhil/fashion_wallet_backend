import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RenderingService } from '../services/rendering.service';

/**
 * Rendering Controller
 * Manages design rendering requests and render cache
 *
 * TODO: Add authentication guards (@UseGuards(AuthGuard))
 * TODO: Add user context decorator (@CurrentUser())
 */
@ApiTags('Design Rendering')
@Controller('designs/:designId/render')
export class RenderingController {
  constructor(private readonly renderingService: RenderingService) {}

  /**
   * Render a design
   */
  @Post()
  @ApiOperation({ summary: 'Render a design' })
  @ApiParam({ name: 'designId', description: 'Design ID' })
  @ApiResponse({ status: 200, description: 'Render initiated or retrieved from cache' })
  @ApiResponse({ status: 404, description: 'Design not found' })
  async renderDesign(
    @Param('designId') designId: string,
    @Body()
    body: {
      preset?: 'thumbnail' | 'preview' | 'highres';
      width?: number;
      height?: number;
      format?: 'png' | 'jpeg' | 'webp';
      background?: string;
    },
  ) {
    const result = await this.renderingService.renderDesign(
      designId,
      body.preset || 'preview',
      {
        width: body.width,
        height: body.height,
        format: body.format,
        background: body.background,
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get render job status
   */
  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get render job status' })
  @ApiParam({ name: 'designId', description: 'Design ID' })
  @ApiParam({ name: 'jobId', description: 'Render job ID' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getRenderJobStatus(
    @Param('designId') designId: string,
    @Param('jobId') jobId: string,
  ) {
    const status = await this.renderingService.getRenderJobStatus(jobId);

    return {
      success: true,
      data: status,
    };
  }

  /**
   * Cancel a render job
   */
  @Delete('jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a render job' })
  @ApiParam({ name: 'designId', description: 'Design ID' })
  @ApiParam({ name: 'jobId', description: 'Render job ID' })
  @ApiResponse({ status: 204, description: 'Job cancelled' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async cancelRenderJob(
    @Param('designId') designId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.renderingService.cancelRenderJob(jobId);
  }

  /**
   * Invalidate render cache for a design
   */
  @Delete('cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate render cache for a design' })
  @ApiParam({ name: 'designId', description: 'Design ID' })
  @ApiResponse({ status: 204, description: 'Cache invalidated' })
  async invalidateRenderCache(@Param('designId') designId: string) {
    await this.renderingService.invalidateDesignRenderCache(designId);
  }

  /**
   * Get render queue statistics
   */
  @Get('/queue/stats')
  @ApiOperation({ summary: 'Get render queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved' })
  async getRenderQueueStats() {
    const stats = await this.renderingService.getRenderQueueStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Warm cache for popular designs
   */
  @Post('/cache/warm')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Warm cache for multiple designs' })
  @ApiResponse({ status: 202, description: 'Cache warming initiated' })
  async warmCache(
    @Body() body: { designIds: string[] },
  ) {
    // Run in background without waiting
    this.renderingService.warmCache(body.designIds).catch(err => {
      console.error('Error warming cache:', err);
    });

    return {
      success: true,
      message: `Cache warming initiated for ${body.designIds.length} designs`,
    };
  }
}
