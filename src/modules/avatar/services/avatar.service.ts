import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AvatarRepository } from '../repositories/avatar.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { MeasurementRepository } from '../repositories/measurement.repository';
import { ProcessingJobRepository } from '../repositories/processing-job.repository';
import { StorageService } from './storage.service';
import { PhotoValidationService } from './photo-validation.service';
import { QueueService } from '../../queue/services/queue.service';
import {
  CreateAvatarFromPhotosDto,
  PhotoFiles,
} from '../dto/create-avatar-from-photos.dto';
import { UpdateAvatarDto } from '../dto/update-avatar.dto';
import { ListAvatarsQueryDto } from '../dto/list-avatars-query.dto';
import {
  Avatar,
  AvatarStatus,
  AvatarSource,
} from '../../../infrastructure/database/entities/avatar.entity';
import { PhotoStatus, PhotoType } from '../../../infrastructure/database/entities/photo.entity';

export interface CreateAvatarResponse {
  avatarId: string;
  status: string;
  estimatedCompletionTime: number;
  processingJobId: string | undefined;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);

  constructor(
    private readonly avatarRepo: AvatarRepository,
    private readonly photoRepo: PhotoRepository,
    private readonly measurementRepo: MeasurementRepository,
    private readonly processingJobRepo: ProcessingJobRepository,
    private readonly storageService: StorageService,
    private readonly photoValidationService: PhotoValidationService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create avatar from uploaded photos
   */
  async createFromPhotos(
    userId: string,
    files: PhotoFiles,
    dto: CreateAvatarFromPhotosDto,
  ): Promise<CreateAvatarResponse> {
    this.logger.log(`Creating avatar from photos for user ${userId}`);

    try {
      // 1. Validate that we have at least one photo
      const hasPhotos =
        (files.front && files.front.length > 0) ||
        (files.side && files.side.length > 0) ||
        (files.back && files.back.length > 0);

      if (!hasPhotos) {
        throw new BadRequestException('At least one photo is required');
      }

      // 2. Validate each photo
      const photosToValidate: Express.Multer.File[] = [];
      if (files.front?.[0]) photosToValidate.push(files.front[0]);
      if (files.side?.[0]) photosToValidate.push(files.side[0]);
      if (files.back?.[0]) photosToValidate.push(files.back[0]);

      for (const file of photosToValidate) {
        await this.photoValidationService.validatePhoto(file);
      }

      // 3. Create avatar record
      const avatar = await this.avatarRepo.create({
        userId,
        name: dto.name,
        status: AvatarStatus.PENDING,
        source: AvatarSource.PHOTO_BASED,
        customization: dto.customization || null,
        processingProgress: 0,
        metadata: {
          version: '1.0',
          unit: dto.unit,
        },
      });

      this.logger.log(`Created avatar record: ${avatar.id}`);

      // 4. Upload photos to S3
      const photoRecords: Array<{
        type: PhotoType;
        upload: any;
        file: Express.Multer.File;
      }> = [];

      if (files.front?.[0]) {
        const upload = await this.storageService.uploadPhoto(
          avatar.id,
          files.front[0],
          'front',
        );
        photoRecords.push({ type: PhotoType.FRONT, upload, file: files.front[0] });
      }

      if (files.side?.[0]) {
        const upload = await this.storageService.uploadPhoto(
          avatar.id,
          files.side[0],
          'side',
        );
        photoRecords.push({ type: PhotoType.SIDE, upload, file: files.side[0] });
      }

      if (files.back?.[0]) {
        const upload = await this.storageService.uploadPhoto(
          avatar.id,
          files.back[0],
          'back',
        );
        photoRecords.push({ type: PhotoType.BACK, upload, file: files.back[0] });
      }

      this.logger.log(`Uploaded ${photoRecords.length} photos for avatar ${avatar.id}`);

      // 5. Save photo records to database
      const photoUrls: { front?: string; side?: string; back?: string } = {};

      for (const record of photoRecords) {
        await this.photoRepo.create({
          avatarId: avatar.id,
          type: record.type,
          status: PhotoStatus.UPLOADED,
          originalUrl: record.upload.url,
          originalS3Key: record.upload.key,
          originalFilename: record.file.originalname,
          fileSizeBytes: record.upload.size,
          mimeType: record.file.mimetype,
          width: null,
          height: null,
        });

        // Build photoUrls object for job data
        if (record.type === PhotoType.FRONT) photoUrls.front = record.upload.url;
        if (record.type === PhotoType.SIDE) photoUrls.side = record.upload.url;
        if (record.type === PhotoType.BACK) photoUrls.back = record.upload.url;
      }

      // 6. Queue processing job
      const job = await this.queueService.addProcessingJob(
        {
          avatarId: avatar.id,
          userId,
          photoUrls,
          unit: dto.unit,
          customization: dto.customization,
        },
        5, // Normal priority
      );

      this.logger.log(`Queued processing job ${job.id} for avatar ${avatar.id}`);

      // 7. Update avatar status to processing
      await this.avatarRepo.update(avatar.id, {
        status: AvatarStatus.PROCESSING,
        processingProgress: 0,
        processingMessage: 'Queued for processing',
      });

      // 8. Emit event
      this.eventEmitter.emit('avatar.created', {
        avatarId: avatar.id,
        userId,
        jobId: job.id,
        timestamp: new Date(),
      });

      return {
        avatarId: avatar.id,
        status: 'processing',
        estimatedCompletionTime: 60,
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
  async getAvatar(id: string, userId: string): Promise<Avatar> {
    const avatar = await this.avatarRepo.findById(id);

    if (!avatar) {
      throw new NotFoundException(`Avatar with id ${id} not found`);
    }

    // Check ownership
    if (avatar.userId !== userId) {
      throw new ForbiddenException('You do not have access to this avatar');
    }

    // Increment view count
    await this.avatarRepo.incrementViewCount(id);

    return avatar;
  }

  /**
   * List avatars for a user with pagination
   */
  async listAvatars(
    userId: string,
    query: ListAvatarsQueryDto,
  ): Promise<PaginatedResponse<Avatar>> {
    const {
      page = 1,
      limit = 10,
      status,
      source,
      orderBy = 'createdAt',
      orderDirection = 'DESC',
    } = query;

    const offset = (page - 1) * limit;

    const [avatars, total] = await this.avatarRepo.findMany({
      userId,
      status,
      source,
      limit,
      offset,
      orderBy,
      orderDirection,
      includeDeleted: false,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: avatars,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update avatar metadata
   */
  async updateAvatar(
    id: string,
    userId: string,
    dto: UpdateAvatarDto,
  ): Promise<Avatar> {
    // Check ownership
    const avatar = await this.getAvatar(id, userId);

    // Cannot update avatar that is processing
    if (avatar.status === AvatarStatus.PROCESSING) {
      throw new BadRequestException(
        'Cannot update avatar while it is being processed',
      );
    }

    // Update allowed fields
    const updateData: Partial<Avatar> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.customization) updateData.customization = dto.customization;

    const updated = await this.avatarRepo.update(id, updateData);

    this.eventEmitter.emit('avatar.updated', {
      avatarId: id,
      userId,
      changes: updateData,
      timestamp: new Date(),
    });

    return updated;
  }

  /**
   * Delete avatar (soft delete by default)
   */
  async deleteAvatar(
    id: string,
    userId: string,
    hard: boolean = false,
  ): Promise<void> {
    // Check ownership
    await this.getAvatar(id, userId);

    if (hard) {
      // Hard delete - actually remove from database
      await this.avatarRepo.hardDelete(id);
      this.logger.log(`Hard deleted avatar ${id}`);
    } else {
      // Soft delete - mark as deleted
      await this.avatarRepo.softDelete(id);
      this.logger.log(`Soft deleted avatar ${id}`);
    }

    this.eventEmitter.emit('avatar.deleted', {
      avatarId: id,
      userId,
      hard,
      timestamp: new Date(),
    });
  }

  /**
   * Set an avatar as default for a user
   */
  async setDefaultAvatar(id: string, userId: string): Promise<Avatar> {
    // Check ownership
    await this.getAvatar(id, userId);

    // Set as default (this will unset other defaults)
    await this.avatarRepo.setDefault(id, userId);

    const avatar = await this.avatarRepo.findById(id);

    this.eventEmitter.emit('avatar.default.set', {
      avatarId: id,
      userId,
      timestamp: new Date(),
    });

    return avatar!;
  }

  /**
   * Get avatar with measurements
   */
  async getAvatarWithMeasurements(id: string, userId: string) {
    const avatar = await this.getAvatar(id, userId);
    const measurements = await this.measurementRepo.findByAvatarId(id);

    return {
      avatar,
      measurements,
    };
  }

  /**
   * Get avatar processing status
   */
  async getProcessingStatus(id: string, userId: string) {
    const avatar = await this.getAvatar(id, userId);

    // Get latest processing job
    const jobs = await this.processingJobRepo.findByAvatarId(id);
    const latestJob = jobs[0]; // Assuming sorted by created_at DESC

    return {
      avatarId: avatar.id,
      status: avatar.status,
      progress: avatar.processingProgress,
      message: avatar.processingMessage,
      errorMessage: avatar.errorMessage,
      job: latestJob
        ? {
            id: latestJob.id,
            status: latestJob.status,
            progress: latestJob.progress,
            currentStep: latestJob.currentStep,
            startedAt: latestJob.startedAt,
            completedAt: latestJob.completedAt,
          }
        : null,
    };
  }

  /**
   * Retry failed avatar processing
   */
  async retryProcessing(id: string, userId: string): Promise<CreateAvatarResponse> {
    const avatar = await this.getAvatar(id, userId);

    if (avatar.status !== AvatarStatus.ERROR) {
      throw new BadRequestException('Can only retry failed avatars');
    }

    // Get photos
    const photos = await this.photoRepo.findByAvatarId(id);

    if (photos.length === 0) {
      throw new BadRequestException('No photos found for this avatar');
    }

    // Build photo URLs
    const photoUrls: { front?: string; side?: string; back?: string } = {};
    for (const photo of photos) {
      if (photo.type === PhotoType.FRONT) photoUrls.front = photo.originalUrl;
      if (photo.type === PhotoType.SIDE) photoUrls.side = photo.originalUrl;
      if (photo.type === PhotoType.BACK) photoUrls.back = photo.originalUrl;
    }

    // Queue new processing job
    const job = await this.queueService.addProcessingJob(
      {
        avatarId: avatar.id,
        userId,
        photoUrls,
        unit: (avatar.metadata as any)?.unit || 'metric',
        customization: avatar.customization,
      },
      10, // Higher priority for retries
    );

    // Update avatar status
    await this.avatarRepo.update(id, {
      status: AvatarStatus.PROCESSING,
      processingProgress: 0,
      processingMessage: 'Retrying processing',
      errorMessage: null,
    });

    this.eventEmitter.emit('avatar.retry', {
      avatarId: id,
      userId,
      jobId: job.id,
      timestamp: new Date(),
    });

    return {
      avatarId: id,
      status: 'processing',
      estimatedCompletionTime: 60,
      processingJobId: job.id as string,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string) {
    const total = await this.avatarRepo.countByUserId(userId);
    const ready = await this.avatarRepo.findMany({
      userId,
      status: AvatarStatus.READY,
      limit: 1000,
      offset: 0,
    });
    const processing = await this.avatarRepo.findMany({
      userId,
      status: AvatarStatus.PROCESSING,
      limit: 1000,
      offset: 0,
    });
    const failed = await this.avatarRepo.findMany({
      userId,
      status: AvatarStatus.ERROR,
      limit: 1000,
      offset: 0,
    });

    return {
      total,
      ready: ready[1],
      processing: processing[1],
      failed: failed[1],
      pending: total - ready[1] - processing[1] - failed[1],
    };
  }
}
