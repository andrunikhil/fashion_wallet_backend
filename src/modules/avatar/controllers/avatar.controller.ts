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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AvatarService } from '../services/avatar.service';
import {
  CreateAvatarFromPhotosDto,
  PhotoFiles,
} from '../dto/create-avatar-from-photos.dto';
import { UpdateAvatarDto } from '../dto/update-avatar.dto';
import { ListAvatarsQueryDto } from '../dto/list-avatars-query.dto';

// TODO: Add @UseGuards(JwtAuthGuard) and @CurrentUser() decorator once auth is setup
@Controller('api/v1/avatars')
export class AvatarController {
  private readonly logger = new Logger(AvatarController.name);

  constructor(private readonly avatarService: AvatarService) {}

  @Post('photo-based')
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

    return this.avatarService.createFromPhotos(userId, files, dto);
  }

  @Get()
  async listAvatars(
    @Query() query: ListAvatarsQueryDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.listAvatars(userId, query);
  }

  @Get(':id')
  async getAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.getAvatar(id, userId);
  }

  @Get(':id/with-measurements')
  async getAvatarWithMeasurements(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.getAvatarWithMeasurements(id, userId);
  }

  @Get(':id/status')
  async getProcessingStatus(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.getProcessingStatus(id, userId);
  }

  @Patch(':id')
  async updateAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvatarDto,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.updateAvatar(id, userId, dto);
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

    return this.avatarService.setDefaultAvatar(id, userId);
  }

  @Post(':id/retry')
  async retryProcessing(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.retryProcessing(id, userId);
  }

  @Get('stats/me')
  async getUserStats(
    // @CurrentUser() user: User, // TODO: Add when auth is ready
  ) {
    // Temporary: Use hardcoded userId until auth is implemented
    const userId = '00000000-0000-0000-0000-000000000000';

    return this.avatarService.getUserStats(userId);
  }
}
