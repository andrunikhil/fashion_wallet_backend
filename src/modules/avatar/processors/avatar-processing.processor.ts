import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AvatarProcessingJobData, ProcessingResult } from '../../queue/interfaces/job.interface';
import { AvatarRepository } from '../repositories/avatar.repository';
import { MeasurementRepository } from '../repositories/measurement.repository';
import { ProcessingJobRepository } from '../repositories/processing-job.repository';
import { MLService } from '../services/ml/ml.service';
import { StorageService } from '../services/storage.service';
import { Photo } from '../services/ml/ml.interface';

@Processor('avatar-processing')
export class AvatarProcessingProcessor {
  private readonly logger = new Logger(AvatarProcessingProcessor.name);

  constructor(
    private readonly avatarRepo: AvatarRepository,
    private readonly measurementRepo: MeasurementRepository,
    private readonly processingJobRepo: ProcessingJobRepository,
    private readonly mlService: MLService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('avatar:process-photos')
  async processPhotos(job: Job<AvatarProcessingJobData>): Promise<ProcessingResult> {
    const { avatarId, userId, photoUrls, unit, customization } = job.data;

    this.logger.log(`Starting processing for avatar ${avatarId}, job ${job.id}`);

    const startTime = Date.now();

    try {
      // Create processing job record
      await this.processingJobRepo.create({
        id: job.id as string,
        avatarId,
        jobType: 'photo-processing',
        status: 'processing',
        startedAt: new Date(),
      });

      // Step 1: Download photos (10%)
      await job.updateProgress(10);
      await this.updateAvatarStatus(avatarId, 'processing', 'Loading photos');
      const photos = await this.downloadPhotos(photoUrls);

      // Step 2: Background removal (20%)
      await job.updateProgress(20);
      await this.updateAvatarStatus(avatarId, 'processing', 'Removing background');
      this.emitProgress(avatarId, job.id as string, 20, 'Removing background');
      const maskedPhotos = await this.mlService.removeBackground(photos);

      // Step 3: Pose detection (40%)
      await job.updateProgress(40);
      await this.updateAvatarStatus(avatarId, 'processing', 'Detecting body landmarks');
      this.emitProgress(avatarId, job.id as string, 40, 'Detecting body landmarks');
      const landmarks = await this.mlService.detectPose(maskedPhotos);

      // Step 4: Measurement extraction (60%)
      await job.updateProgress(60);
      await this.updateAvatarStatus(avatarId, 'processing', 'Extracting measurements');
      this.emitProgress(avatarId, job.id as string, 60, 'Extracting measurements');
      const measurements = await this.mlService.extractMeasurements(
        landmarks,
        photos[0],
        unit,
      );

      // Step 5: Body type classification (70%)
      await job.updateProgress(70);
      await this.updateAvatarStatus(avatarId, 'processing', 'Classifying body type');
      this.emitProgress(avatarId, job.id as string, 70, 'Classifying body type');
      const { bodyType, confidence: bodyTypeConfidence } = await this.mlService.classifyBodyType(measurements);

      // Step 6: Save measurements to database (80%)
      await job.updateProgress(80);
      await this.updateAvatarStatus(avatarId, 'processing', 'Saving measurements');
      await this.measurementRepo.create({
        avatarId,
        ...measurements,
        source: 'auto',
        confidence: measurements.confidence,
      });

      // Step 7: Update avatar with body type (90%)
      await job.updateProgress(90);
      await this.avatarRepo.update(avatarId, {
        bodyType,
        bodyTypeConfidence,
        landmarks: JSON.stringify(landmarks),
      });

      // Step 8: Complete (100%)
      await job.updateProgress(100);
      await this.updateAvatarStatus(avatarId, 'ready', 'Complete');

      const processingTime = Date.now() - startTime;

      // Update processing job record
      await this.processingJobRepo.update(job.id as string, {
        status: 'completed',
        completedAt: new Date(),
        result: JSON.stringify({ bodyType, measurements }),
      });

      // Emit completion event
      this.eventEmitter.emit('avatar.processing.completed', {
        avatarId,
        userId,
        jobId: job.id,
        processingTime,
        bodyType,
        measurements,
      });

      this.logger.log(
        `Completed processing for avatar ${avatarId} in ${processingTime}ms`,
      );

      return {
        success: true,
        avatarId,
      };
    } catch (error) {
      this.logger.error(`Failed to process avatar ${avatarId}:`, error);

      await this.updateAvatarStatus(avatarId, 'error', error.message);

      // Update processing job record
      try {
        await this.processingJobRepo.update(job.id as string, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message,
        });
      } catch (updateError) {
        this.logger.error('Failed to update processing job:', updateError);
      }

      // Emit failure event
      this.eventEmitter.emit('avatar.processing.failed', {
        avatarId,
        userId,
        jobId: job.id,
        error: error.message,
        retryable: error.retryable !== false,
      });

      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: ProcessingResult) {
    this.logger.log(
      `Job ${job.id} completed successfully for avatar ${result.avatarId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed:`, error.message);
  }

  private async downloadPhotos(photoUrls: {
    front?: string;
    side?: string;
    back?: string;
  }): Promise<Photo[]> {
    const photos: Photo[] = [];

    if (photoUrls.front) {
      photos.push({
        url: photoUrls.front,
        type: 'front',
      });
    }

    if (photoUrls.side) {
      photos.push({
        url: photoUrls.side,
        type: 'side',
      });
    }

    if (photoUrls.back) {
      photos.push({
        url: photoUrls.back,
        type: 'back',
      });
    }

    this.logger.log(`Downloaded ${photos.length} photos for processing`);

    return photos;
  }

  private async updateAvatarStatus(
    avatarId: string,
    status: string,
    message?: string,
  ): Promise<void> {
    await this.avatarRepo.update(avatarId, { status });

    // Emit WebSocket event for real-time updates
    this.eventEmitter.emit('avatar.status.update', {
      avatarId,
      status,
      message,
      timestamp: new Date(),
    });
  }

  private emitProgress(
    avatarId: string,
    jobId: string,
    progress: number,
    currentStep: string,
  ): void {
    this.eventEmitter.emit('avatar.processing.progress', {
      avatarId,
      jobId,
      progress,
      currentStep,
      timestamp: new Date(),
    });
  }
}
