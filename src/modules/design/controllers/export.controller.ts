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
} from '@nestjs/common';
import { ExportService } from '../services/export.service';
import { ExportRequestDto } from '../dto/export-request.dto';

/**
 * Export Controller
 * Handles design export operations
 *
 * TODO: Add authentication guards (@UseGuards(AuthGuard))
 * TODO: Add user context decorator (@CurrentUser())
 */
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
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

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
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

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
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

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
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

    await this.exportService.deleteExport(exportId, userId);
  }

  /**
   * List all exports for a design
   * GET /api/designs/:designId/exports
   */
  @Get('designs/:designId/exports')
  async listExports(
    @Param('designId', ParseUUIDPipe) designId: string,
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

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
    // TODO: @CurrentUser() user: User,
  ) {
    // TODO: Extract userId from authenticated user
    const userId = 'temp-user-id'; // Placeholder

    await this.exportService.cancelExport(exportId, userId);

    return {
      success: true,
      message: 'Export cancelled successfully',
    };
  }
}
