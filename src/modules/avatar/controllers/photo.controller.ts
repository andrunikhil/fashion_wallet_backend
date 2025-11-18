import {
  Controller,
  Get,
  Delete,
  Param,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PhotoService } from '../services/photo.service';
import { PhotoSerializer } from '../serializers/photo.serializer';

// TODO: Add @UseGuards(JwtAuthGuard) and @CurrentUser() decorator once auth is setup
@ApiTags('Photos')
@Controller('api/v1/avatars/:id/photos')
export class PhotoController {
  private readonly logger = new Logger(PhotoController.name);

  constructor(
    private readonly photoService: PhotoService,
    private readonly photoSerializer: PhotoSerializer,
  ) {}

  /**
   * GET /api/v1/avatars/:id/photos
   * Get all photos for an avatar
   */
  @Get()
  @ApiOperation({
    summary: 'List avatar photos',
    description: 'Retrieve all photos associated with a specific avatar'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getAvatarPhotos(
    @Param('id', ParseUUIDPipe) avatarId: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Getting photos for avatar ${avatarId}`);

    const photos = await this.photoService.getAvatarPhotos(avatarId, userId);
    return this.photoSerializer.transformToListResponse(avatarId, photos);
  }

  /**
   * GET /api/v1/avatars/:id/photos/:photoId
   * Get a single photo by ID
   */
  @Get(':photoId')
  @ApiOperation({
    summary: 'Get photo by ID',
    description: 'Retrieve details of a specific photo'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPhoto(
    @Param('id', ParseUUIDPipe) avatarId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Getting photo ${photoId} for avatar ${avatarId}`);

    const photo = await this.photoService.getPhoto(avatarId, photoId, userId);
    return this.photoSerializer.transformToResponse(photo);
  }

  /**
   * DELETE /api/v1/avatars/:id/photos/:photoId
   * Delete a photo
   */
  @Delete(':photoId')
  @ApiOperation({
    summary: 'Delete photo',
    description: 'Delete a photo from an avatar. Also removes the file from storage.'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete while avatar is processing' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async deletePhoto(
    @Param('id', ParseUUIDPipe) avatarId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Deleting photo ${photoId} for avatar ${avatarId}`);

    await this.photoService.deletePhoto(avatarId, photoId, userId);

    return {
      message: 'Photo deleted successfully',
      photoId,
      avatarId,
    };
  }

  /**
   * GET /api/v1/avatars/:id/photos/stats
   * Get photo statistics for an avatar
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get photo statistics',
    description: 'Retrieve statistics about photos for an avatar (count by type, status, total size)'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getPhotoStats(
    @Param('id', ParseUUIDPipe) avatarId: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Getting photo stats for avatar ${avatarId}`);

    return this.photoService.getPhotoStats(avatarId, userId);
  }
}
