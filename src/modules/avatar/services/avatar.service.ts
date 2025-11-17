import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// DTOs
import {
  CreateAvatarFromPhotosDto,
  PhotoFiles,
} from '../dto/create-avatar-from-photos.dto';
import {
  CreateAvatarResponse,
  PaginatedResponse,
  AvatarWithMeasurements,
  ProcessingStatusResponse,
} from '../dto/response.dto';
import { UpdateAvatarDto } from '../dto/update-avatar.dto';
import { ListAvatarsQueryDto } from '../dto/list-avatars-query.dto';

// Entities
import { Avatar, AvatarStatus, AvatarSource } from '../../../infrastructure/database/entities/avatar.entity';
import { Photo, PhotoType } from '../../../infrastructure/database/entities/photo.entity';
import { ProcessingJobType } from '../../../infrastructure/database/entities/processing-job.entity';

// Repositories
import { AvatarRepository } from '../repositories/avatar.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { MeasurementRepository } from '../repositories/measurement.repository';
import { ProcessingJobRepository } from '../repositories/processing-job.repository';

// Services
import { StorageService } from './storage.service';
import { PhotoValidationService } from './photo-validation.service';
import { QueueService } from '../../queue/services/queue.service';

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);
  private readonly ESTIMATED_PROCESSING_TIME = 60; // seconds

  constructor(
    private readonly avatarRepository: AvatarRepository,
    private readonly photoRepository: PhotoRepository,
    private readonly measurementRepository: MeasurementRepository,
    private readonly processingJobRepository: ProcessingJobRepository,
    private readonly storageService: StorageService,
    private readonly photoValidationService: PhotoValidationService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create avatar from uploaded photos
   * Main entry point for avatar creation workflow
   */
  async createFromPhotos(
    userId: string,
    files: PhotoFiles,
    dto: CreateAvatarFromPhotosDto,
  ): Promise<CreateAvatarResponse> {
    this.logger.log(`Creating avatar from photos for user ${userId}`);

    // Step 1: Validate photos
    const validatedPhotos = await this.photoValidationService.validatePhotos(files);

    if (!validatedPhotos.isValid) {
      throw new BadRequestException({
        message: 'Photo validation failed',
        errors: validatedPhotos.errors,
        warnings: validatedPhotos.warnings,
      });
    }

    try {
      // Step 2: Create avatar record
      const avatar = await this.avatarRepository.create({
        userId,
        name: dto.name,
        status: AvatarStatus.PENDING,
        source: AvatarSource.PHOTO_BASED,
        processingProgress: 0,
        customization: dto.customization || null,
        metadata: {
          version: '1.0',
          unit: dto.unit,
        },
      });

      this.logger.log(`Avatar ${avatar.id} created for user ${userId}`);

      // Step 3: Upload photos to S3 and save photo records
      const photoUrls: string[] = [];
      const photoRecords: Photo[] = [];

      const photoTypes: Array<{ type: PhotoType; files: Express.Multer.File[] }> = [
        { type: PhotoType.FRONT, files: files.front || [] },
        { type: PhotoType.SIDE, files: files.side || [] },
        { type: PhotoType.BACK, files: files.back || [] },
      ];

      for (const { type, files: typeFiles } of photoTypes) {
        for (const file of typeFiles) {
          // Upload to S3
          const uploadResult = await this.storageService.uploadPhoto(
            avatar.id,
            type,
            file.buffer,
            file.mimetype,
            file.originalname,
          );

          photoUrls.push(uploadResult.url);

          // Save photo record
          const photo = await this.photoRepository.create({
            avatarId: avatar.id,
            type,
            originalUrl: uploadResult.url,
            originalS3Key: uploadResult.key,
            originalFilename: file.originalname,
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            validation: validatedPhotos.validations?.[type] || null,
          });

          photoRecords.push(photo);
          this.logger.log(`Photo ${photo.id} (${type}) uploaded for avatar ${avatar.id}`);
        }
      }

      // Step 4: Queue processing job
      const jobData = {
        avatarId: avatar.id,
        userId,
        photoUrls,
        customization: dto.customization,
        unit: dto.unit,
      };

      const job = await this.queueService.addProcessingJob(jobData);

      // Step 5: Create processing job record
      const processingJob = await this.processingJobRepository.create({
        id: job.id as string,
        avatarId: avatar.id,
        userId,
        jobType: ProcessingJobType.PHOTO_PROCESSING,
        priority: 5,
        inputData: {
          photoUrls,
          customization: dto.customization,
          unit: dto.unit,
        },
        metadata: {
          estimatedDuration: this.ESTIMATED_PROCESSING_TIME * 1000,
        },
      });

      this.logger.log(`Processing job ${job.id} created for avatar ${avatar.id}`);

      // Step 6: Emit event
      this.eventEmitter.emit('avatar.created', {
        avatarId: avatar.id,
        userId,
        jobId: job.id,
        timestamp: new Date(),
      });

      // Step 7: Return response
      return {
        avatarId: avatar.id,
        status: AvatarStatus.PENDING,
        estimatedCompletionTime: this.ESTIMATED_PROCESSING_TIME,
        processingJobId: job.id as string,
      };
    } catch (error) {
      this.logger.error(`Failed to create avatar for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get avatar by ID with ownership check
   */
  async getAvatar(id: string, userId: string): Promise<AvatarWithMeasurements> {
    const avatar = await this.avatarRepository.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar ${id} not found`);
    }

    // Ownership check
    if (avatar.userId !== userId && !avatar.isPublic) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    // Update view tracking
    await this.avatarRepository.incrementViewCount(id);

    // Get measurements if available
    const measurements = await this.measurementRepository.findByAvatarId(id);

    return {
      avatar,
      measurements: measurements || undefined,
    };
  }

  /**
   * List avatars for a user with pagination and filtering
   */
  async listAvatars(
    userId: string,
    query: ListAvatarsQueryDto,
  ): Promise<PaginatedResponse<Avatar>> {
    const {
      status,
      source,
      limit = 10,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = query;

    const filters: any = { userId };

    if (status) {
      filters.status = status;
    }

    if (source) {
      filters.source = source;
    }

    const [avatars, total] = await this.avatarRepository.findAll({
      where: filters,
      order: { [orderBy]: orderDirection },
      take: limit,
      skip: offset,
    });

    const page = Math.floor(offset / limit) + 1;

    return new PaginatedResponse(avatars, total, page, limit);
  }

  /**
   * Update avatar metadata
   */
  async updateAvatar(
    id: string,
    userId: string,
    dto: UpdateAvatarDto,
  ): Promise<Avatar> {
    const avatar = await this.avatarRepository.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar ${id} not found`);
    }

    // Ownership check
    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this avatar');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault === true) {
      await this.avatarRepository.unsetDefaultForUser(userId);
    }

    // Update avatar
    const updated = await this.avatarRepository.update(id, dto);

    this.logger.log(`Avatar ${id} updated`);

    // Emit event
    this.eventEmitter.emit('avatar.updated', {
      avatarId: id,
      userId,
      changes: dto,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Delete avatar (soft delete by default)
   */
  async deleteAvatar(id: string, userId: string, hard: boolean = false): Promise<void> {
    const avatar = await this.avatarRepository.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar ${id} not found`);
    }

    // Ownership check
    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this avatar');
    }

    if (hard) {
      // Hard delete: Remove from database and S3
      await this.avatarRepository.hardDelete(id);

      // Delete photos from S3
      const photos = await this.photoRepository.findByAvatarId(id);
      for (const photo of photos) {
        await this.storageService.deleteFile(photo.originalS3Key);
        if (photo.processedS3Key) {
          await this.storageService.deleteFile(photo.processedS3Key);
        }
      }

      // Delete model if exists
      if (avatar.modelUrl) {
        // Extract S3 key from URL and delete
        const s3Key = this.extractS3KeyFromUrl(avatar.modelUrl);
        if (s3Key) {
          await this.storageService.deleteFile(s3Key);
        }
      }

      this.logger.log(`Avatar ${id} hard deleted`);
    } else {
      // Soft delete
      await this.avatarRepository.softDelete(id);
      this.logger.log(`Avatar ${id} soft deleted`);
    }

    // Emit event
    this.eventEmitter.emit('avatar.deleted', {
      avatarId: id,
      userId,
      hard,
      timestamp: new Date(),
    });
  }

  /**
   * Set avatar as default for user
   */
  async setDefaultAvatar(id: string, userId: string): Promise<Avatar> {
    const avatar = await this.avatarRepository.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar ${id} not found`);
    }

    // Ownership check
    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have permission to set this avatar as default');
    }

    // Unset other defaults
    await this.avatarRepository.unsetDefaultForUser(userId);

    // Set as default
    const updated = await this.avatarRepository.update(id, { isDefault: true });

    this.logger.log(`Avatar ${id} set as default for user ${userId}`);

    return updated;
  }

  /**
   * Get processing status for an avatar
   */
  async getProcessingStatus(id: string, userId: string): Promise<ProcessingStatusResponse> {
    const avatar = await this.avatarRepository.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar ${id} not found`);
    }

    // Ownership check
    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    // Get latest processing job
    const job = await this.processingJobRepository.findLatestByAvatarId(id);

    const estimatedTimeRemaining = job
      ? this.calculateEstimatedTimeRemaining(avatar.processingProgress)
      : undefined;

    return {
      avatarId: id,
      status: avatar.status,
      progress: avatar.processingProgress,
      message: avatar.processingMessage || undefined,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get default avatar for user
   */
  async getDefaultAvatar(userId: string): Promise<Avatar | null> {
    return this.avatarRepository.findDefaultForUser(userId);
  }

  /**
   * Check if avatar belongs to user
   */
  async checkOwnership(id: string, userId: string): Promise<boolean> {
    const avatar = await this.avatarRepository.findById(id);
    return avatar?.userId === userId;
  }

  /**
   * Get avatar statistics for user
   */
  async getUserStats(userId: string): Promise<{
    total: number;
    ready: number;
    processing: number;
    error: number;
    totalStorage: number;
  }> {
    const [total, ready, processing, error] = await Promise.all([
      this.avatarRepository.countByUser(userId),
      this.avatarRepository.countByUserAndStatus(userId, AvatarStatus.READY),
      this.avatarRepository.countByUserAndStatus(userId, AvatarStatus.PROCESSING),
      this.avatarRepository.countByUserAndStatus(userId, AvatarStatus.ERROR),
    ]);

    const avatars = await this.avatarRepository.findByUserId(userId);
    const totalStorage = avatars.reduce((sum, avatar) => sum + (avatar.modelSizeBytes || 0), 0);

    return {
      total,
      ready,
      processing,
      error,
      totalStorage,
    };
  }

  // ===== Private Helper Methods =====

  private calculateEstimatedTimeRemaining(progress: number): number {
    if (progress >= 100) return 0;
    const remainingProgress = 100 - progress;
    return Math.ceil((remainingProgress / 100) * this.ESTIMATED_PROCESSING_TIME);
  }

  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Assuming URL format: https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      return pathParts.join('/');
    } catch {
      return null;
    }
  }
}
