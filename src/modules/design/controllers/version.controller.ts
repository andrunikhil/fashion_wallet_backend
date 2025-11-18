import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserId } from '../../../shared/decorators/current-user.decorator';
import { VersionControlService } from '../services/version-control.service';
import { CreateVersionDto } from '../dto/create-version.dto';

/**
 * Version Controller
 * Handles design version control and restoration
 *
 * All routes are nested under /api/designs/:designId/versions
 */
@ApiTags('Versions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/designs/:designId/versions')
export class VersionController {
  constructor(
    private readonly versionControlService: VersionControlService,
  ) {}

  /**
   * Create a checkpoint (manual save point)
   * POST /api/designs/:designId/versions
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCheckpoint(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Body(ValidationPipe) createDto: CreateVersionDto,
    @UserId() userId: string,
  ) {
    const version = await this.versionControlService.createCheckpoint(
      designId,
      userId,
      createDto.message,
    );

    return {
      success: true,
      data: version,
    };
  }

  /**
   * List all versions for a design
   * GET /api/designs/:designId/versions
   */
  @Get()
  async listVersions(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @UserId() userId: string,
  ) {
    const versions = await this.versionControlService.listVersions(
      designId,
      userId,
      limit,
    );

    return {
      success: true,
      data: versions,
    };
  }

  /**
   * Get a specific version by version number
   * GET /api/designs/:designId/versions/:versionNumber
   */
  @Get(':versionNumber')
  async getVersion(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @UserId() userId: string,
  ) {
    // Get all versions and find the specific one
    const versions = await this.versionControlService.listVersions(
      designId,
      userId,
    );
    const version = versions.find((v) => v.versionNumber === versionNumber);

    if (!version) {
      return {
        success: false,
        error: 'Version not found',
      };
    }

    return {
      success: true,
      data: version,
    };
  }

  /**
   * Restore design to a specific version
   * POST /api/designs/:designId/versions/:versionNumber/restore
   */
  @Post(':versionNumber/restore')
  async restoreVersion(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @UserId() userId: string,
  ) {
    const design = await this.versionControlService.restoreVersion(
      designId,
      versionNumber,
      userId,
    );

    return {
      success: true,
      data: design,
      message: `Design restored to version ${versionNumber}`,
    };
  }

  /**
   * Compare two versions
   * GET /api/designs/:designId/versions/compare?v1=1&v2=2
   */
  @Get('compare/diff')
  async compareVersions(
    @Param('designId', ParseUUIDPipe) designId: string,
    @Query('v1', ParseIntPipe) version1: number,
    @Query('v2', ParseIntPipe) version2: number,
    // TODO: @CurrentUser() user: User,
  ) {
    const diff = await this.versionControlService.compareVersions(
      designId,
      version1,
      version2,
    );

    return {
      success: true,
      data: diff,
    };
  }
}
