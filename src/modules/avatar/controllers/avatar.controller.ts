import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFiles,
  UseInterceptors,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AvatarService } from '../services/avatar.service';
import { AvatarSerializer } from '../serializers/avatar.serializer';
import {
  CreateAvatarFromPhotosDto,
  PhotoFiles,
} from '../dto/create-avatar-from-photos.dto';
import { CreateAvatarFromMeasurementsDto } from '../dto/create-avatar-from-measurements.dto';
import { UpdateAvatarDto } from '../dto/update-avatar.dto';
import { ListAvatarsQueryDto } from '../dto/list-avatars-query.dto';

// TODO: Add @UseGuards(JwtAuthGuard) and @CurrentUser() decorator once auth is setup
@ApiTags('Avatars')
@Controller('api/v1/avatars')
export class AvatarController {
  private readonly logger = new Logger(AvatarController.name);

  constructor(
    private readonly avatarService: AvatarService,
    private readonly avatarSerializer: AvatarSerializer,
  ) {}

  @Post('photo-based')
  @ApiOperation({ summary: 'Create avatar from photos', description: 'Upload photos to create a 3D avatar with automatic measurement extraction' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Avatar creation initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid photo or request data' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'side', maxCount: 1 },
      { name: 'back', maxCount: 1 },
    ]),
  )
  async createFromPhotos(
    @UploadedFiles() files: PhotoFiles,
    @Body() dto: CreateAvatarFromPhotosDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Creating avatar from photos for user ${userId}`);

    const result = await this.avatarService.createFromPhotos(userId, files, dto);
    return this.avatarSerializer.transformToCreateResponse(result);
  }

  @Post('measurement-based')
  @ApiOperation({
    summary: 'Create avatar from measurements',
    description: 'Create a 3D avatar from manually entered body measurements'
  })
  @ApiResponse({ status: 201, description: 'Avatar creation initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid measurements' })
  async createFromMeasurements(
    @Body() dto: CreateAvatarFromMeasurementsDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Creating avatar from measurements for user ${userId}`);

    const result = await this.avatarService.createFromMeasurements(userId, dto);
    return this.avatarSerializer.transformToCreateResponse(result);
  }

  @Get()
  @ApiOperation({ summary: 'List avatars', description: 'Get paginated list of avatars for the current user' })
  @ApiResponse({ status: 200, description: 'List of avatars retrieved successfully' })
  async listAvatars(
    @Query() query: ListAvatarsQueryDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const result = await this.avatarService.listAvatars(userId, query);
    return this.avatarSerializer.transformToPaginatedResponse(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get avatar by ID', description: 'Retrieve detailed information about a specific avatar' })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Avatar retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const avatar = await this.avatarService.getAvatar(id, userId);
    return this.avatarSerializer.transformToResponse(avatar);
  }

  @Get(':id/with-measurements')
  async getAvatarWithMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const result = await this.avatarService.getAvatarWithMeasurements(id, userId);
    return this.avatarSerializer.transformToDetailResponse(result.avatar, result.measurements);
  }

  @Get(':id/status')
  async getProcessingStatus(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const result = await this.avatarService.getProcessingStatus(id, userId);
    return this.avatarSerializer.transformToProcessingStatusResponse(result);
  }

  @Patch(':id')
  async updateAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvatarDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const avatar = await this.avatarService.updateAvatar(id, userId, dto);
    return this.avatarSerializer.transformToResponse(avatar);
  }

  @Delete(':id')
  async deleteAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('hard') hard: boolean = false,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    await this.avatarService.deleteAvatar(id, userId, hard);

    return { message: 'Avatar deleted successfully' };
  }

  @Post(':id/set-default')
  async setDefaultAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const avatar = await this.avatarService.setDefaultAvatar(id, userId);
    return this.avatarSerializer.transformToResponse(avatar);
  }

  @Post(':id/retry')
  @ApiOperation({
    summary: 'Retry avatar processing',
    description: 'Retry processing for a failed avatar'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Processing restarted successfully' })
  @ApiResponse({ status: 400, description: 'Can only retry failed avatars' })
  async retryProcessing(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    const result = await this.avatarService.retryProcessing(id, userId);
    return this.avatarSerializer.transformToCreateResponse(result);
  }

  @Post(':id/regenerate-model')
  @ApiOperation({
    summary: 'Regenerate 3D model',
    description: 'Regenerate the 3D model for an avatar based on current measurements. Useful after updating measurements.'
  })
  @ApiParam({ name: 'id', description: 'Avatar ID' })
  @ApiResponse({ status: 200, description: 'Model regeneration initiated successfully' })
  @ApiResponse({ status: 400, description: 'Avatar is already processing or has no measurements' })
  @ApiResponse({ status: 404, description: 'Avatar not found' })
  async regenerateModel(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    this.logger.log(`Regenerating model for avatar ${id}`);

    const result = await this.avatarService.regenerateModel(id, userId);
    return this.avatarSerializer.transformToCreateResponse(result);
  }

  @Get('stats/me')
  @ApiOperation({
    summary: 'Get user avatar statistics',
    description: 'Retrieve statistics about avatars for the current user'
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getUserStats(
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.getUserStats(userId);
  }
}
