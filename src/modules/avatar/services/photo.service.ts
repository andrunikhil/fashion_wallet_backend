import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PhotoRepository } from '../repositories/photo.repository';
import { AvatarRepository } from '../repositories/avatar.repository';
import { StorageService } from './storage.service';
import { Photo } from '../../../infrastructure/database/entities/photo.entity';
import { AvatarStatus } from '../../../infrastructure/database/entities/avatar.entity';

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);

  constructor(
    private readonly photoRepo: PhotoRepository,
    private readonly avatarRepo: AvatarRepository,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all photos for an avatar
   */
  async getAvatarPhotos(avatarId: string, userId: string): Promise<Photo[]> {
    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    const photos = await this.photoRepo.findByAvatarId(avatarId);
    return photos;
  }

  /**
   * Get a single photo by ID
   */
  async getPhoto(avatarId: string, photoId: string, userId: string): Promise<Photo> {
    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    const photo = await this.photoRepo.findById(photoId);
    if (!photo) {
      throw new NotFoundException(`Photo with id ${photoId} not found`);
    }

    // Verify photo belongs to avatar
    if (photo.avatarId !== avatarId) {
      throw new BadRequestException('Photo does not belong to this avatar');
    }

    return photo;
  }

  /**
   * Delete a photo
   */
  async deletePhoto(avatarId: string, photoId: string, userId: string): Promise<void> {
    this.logger.log(`Deleting photo ${photoId} for avatar ${avatarId}`);

    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    // Cannot delete photos while avatar is processing
    if (avatar.status === AvatarStatus.PROCESSING) {
      throw new BadRequestException(
        'Cannot delete photos while avatar is being processed',
      );
    }

    const photo = await this.photoRepo.findById(photoId);
    if (!photo) {
      throw new NotFoundException(`Photo with id ${photoId} not found`);
    }

    // Verify photo belongs to avatar
    if (photo.avatarId !== avatarId) {
      throw new BadRequestException('Photo does not belong to this avatar');
    }

    // Delete from S3
    try {
      if (photo.originalS3Key) {
        await this.storageService.deleteFile(photo.originalS3Key);
      }
      if (photo.processedS3Key) {
        await this.storageService.deleteFile(photo.processedS3Key);
      }
    } catch (error) {
      this.logger.error(`Failed to delete photo files from S3: ${error.message}`);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete from database
    await this.photoRepo.delete(photoId);

    // Emit event
    this.eventEmitter.emit('avatar.photo.deleted', {
      avatarId,
      photoId,
      userId,
      photoType: photo.type,
      timestamp: new Date(),
    });

    this.logger.log(`Successfully deleted photo ${photoId}`);
  }

  /**
   * Get photo statistics for an avatar
   */
  async getPhotoStats(avatarId: string, userId: string) {
    // Verify avatar exists and user has access
    const avatar = await this.avatarRepo.findById(avatarId);
    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${avatarId} not found`);
    }

    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    const photos = await this.photoRepo.findByAvatarId(avatarId);

    const stats = {
      total: photos.length,
      byType: {
        front: photos.filter(p => p.type === 'front').length,
        side: photos.filter(p => p.type === 'side').length,
        back: photos.filter(p => p.type === 'back').length,
      },
      byStatus: {
        uploaded: photos.filter(p => p.status === 'uploaded').length,
        processing: photos.filter(p => p.status === 'processing').length,
        processed: photos.filter(p => p.status === 'processed').length,
        error: photos.filter(p => p.status === 'error').length,
      },
      totalSizeBytes: photos.reduce((sum, p) => sum + (p.fileSizeBytes || 0), 0),
    };

    return stats;
  }
}
