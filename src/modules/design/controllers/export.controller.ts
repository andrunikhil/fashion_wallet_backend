import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserId } from '../../../shared/decorators/current-user.decorator';
import { ExportService } from '../services/export.service';
import { ExportRequestDto } from '../dto/export-request.dto';

/**
 * Export Controller
 * Handles design export operations
 */
@ApiTags('Exports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Create a new export job
   * POST /api/designs/:designId/exports
   */
  @Post('designs/:designId/exports')
  @HttpCode(HttpStatus.CREATED)
  async createExport(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Body(ValidationPipe) exportDto: ExportRequestDto,
    @UserId() userId: string,
  ) {
    const exportRecord = await this.exportService.createExport(
      designId,
      userId,
      exportDto,
    );

    return {
      success: true,
      data: exportRecord,
    };
  }

  /**
   * Get export status and details
   * GET /api/exports/:exportId
   */
  @Get('exports/:exportId')
  async getExportStatus(
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @UserId() userId: string,
  ) {
    const exportRecord = await this.exportService.getExportStatus(
      exportId,
      userId,
    );

    return {
      success: true,
      data: exportRecord,
    };
  }

  /**
   * Download export file (redirects to file URL)
   * GET /api/exports/:exportId/download
   */
  @Get('exports/:exportId/download')
  async downloadExport(
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @UserId() userId: string,
  ) {
    const exportRecord = await this.exportService.getExportStatus(
      exportId,
      userId,
    );

    if (!exportRecord.fileUrl) {
      return {
        success: false,
        error: 'Export file not ready yet',
      };
    }

    // Return file URL for client to download
    // In production, this could generate a signed URL
    return {
      success: true,
      data: {
        url: exportRecord.fileUrl,
        fileName: exportRecord.fileName,
        fileSize: exportRecord.fileSize,
      },
    };
  }

  /**
   * Delete an export
   * DELETE /api/exports/:exportId
   */
  @Delete('exports/:exportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteExport(
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @UserId() userId: string,
  ) {
    await this.exportService.deleteExport(exportId, userId);
  }

  /**
   * List all exports for a design
   * GET /api/designs/:designId/exports
   */
  @Get('designs/:designId/exports')
  async listExports(
    @Param('designId', ParseUUIDPipe) designId: string,
    @UserId() userId: string,
  ) {
    const exports = await this.exportService.listExports(designId, userId);

    return {
      success: true,
      data: exports,
    };
  }

  /**
   * Cancel an export job
   * POST /api/exports/:exportId/cancel
   */
  @Post('exports/:exportId/cancel')
  async cancelExport(
    @Param('exportId', ParseUUIDPipe) exportId: string,
    @UserId() userId: string,
  ) {
    await this.exportService.cancelExport(exportId, userId);

    return {
      success: true,
      message: 'Export cancelled successfully',
    };
  }
}
