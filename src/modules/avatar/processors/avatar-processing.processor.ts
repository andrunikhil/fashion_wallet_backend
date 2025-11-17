import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Interfaces
import { AvatarProcessingJobData, ProcessingResult } from '../../queue/interfaces/job.interface';
import { Photo } from '../services/ml/ml.interface';

// Repositories
import { AvatarRepository } from '../repositories/avatar.repository';
import { MeasurementRepository } from '../repositories/measurement.repository';
import { ProcessingJobRepository } from '../repositories/processing-job.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { AvatarModelRepository } from '../repositories/avatar-model.repository';

// Services
import { MLService } from '../services/ml/ml.service';
import { StorageService } from '../services/storage.service';
import { ModelGenerationService } from '../services/model/model-generation.service';
import { ModelOptimizationService } from '../services/model/model-optimization.service';

// Entities
import { AvatarStatus } from '../../../infrastructure/database/entities/avatar.entity';
import { ProcessingJobStatus } from '../../../infrastructure/database/entities/processing-job.entity';
import { PhotoStatus } from '../../../infrastructure/database/entities/photo.entity';
import { MeasurementSource } from '../../../infrastructure/database/entities/measurement.entity';

@Processor('avatar-processing')
@Injectable()
export class AvatarProcessingProcessor {
  private readonly logger = new Logger(AvatarProcessingProcessor.name);

  constructor(
    private readonly avatarRepo: AvatarRepository,
    private readonly measurementRepo: MeasurementRepository,
    private readonly processingJobRepo: ProcessingJobRepository,
    private readonly photoRepo: PhotoRepository,
    private readonly avatarModelRepo: AvatarModelRepository,
    private readonly mlService: MLService,
    private readonly storageService: StorageService,
    private readonly modelGenerationService: ModelGenerationService,
    private readonly modelOptimizationService: ModelOptimizationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main processing pipeline for avatar generation from photos
   * Complete 10-step workflow from photos to 3D model
   */
  @Process('avatar:process-photos')
  async processPhotos(job: Job<AvatarProcessingJobData>): Promise<ProcessingResult> {
    const { avatarId, userId, photoUrls, unit, customization } = job.data;

    this.logger.log(`Starting processing for avatar ${avatarId}, job ${job.id}`);

    const startTime = Date.now();

    try {
      // Update processing job status
      await this.processingJobRepo.update(job.id as string, {
        status: ProcessingJobStatus.PROCESSING,
        startedAt: new Date(),
      });

      // ========== STEP 1: Download photos (10%) ==========
      this.logger.log(`[${avatarId}] Step 1: Downloading photos`);
      await job.updateProgress(10);
      await this.updateAvatarProgress(avatarId, 10, 'Loading photos');
      this.emitProgress(avatarId, job.id as string, 10, 'Loading photos');

      const photos = await this.downloadPhotos(photoUrls);

      // ========== STEP 2: Background removal via ML service (20%) ==========
      this.logger.log(`[${avatarId}] Step 2: Removing background`);
      await job.updateProgress(20);
      await this.updateAvatarProgress(avatarId, 20, 'Removing background');
      this.emitProgress(avatarId, job.id as string, 20, 'Removing background');

      const maskedPhotos = await this.mlService.removeBackground(photos);

      // Save processed photos
      for (const maskedPhoto of maskedPhotos) {
        await this.saveProcessedPhoto(avatarId, maskedPhoto);
      }

      // ========== STEP 3: Pose detection (40%) ==========
      this.logger.log(`[${avatarId}] Step 3: Detecting body landmarks`);
      await job.updateProgress(40);
      await this.updateAvatarProgress(avatarId, 40, 'Detecting body landmarks');
      this.emitProgress(avatarId, job.id as string, 40, 'Detecting body landmarks');

      const landmarks = await this.mlService.detectPose(maskedPhotos);

      // ========== STEP 4: Measurement extraction (60%) ==========
      this.logger.log(`[${avatarId}] Step 4: Extracting measurements`);
      await job.updateProgress(60);
      await this.updateAvatarProgress(avatarId, 60, 'Extracting measurements');
      this.emitProgress(avatarId, job.id as string, 60, 'Extracting measurements');

      const measurements = await this.mlService.extractMeasurements(
        landmarks,
        photos[0],
        unit,
      );

      // ========== STEP 5: Body type classification (70%) ==========
      this.logger.log(`[${avatarId}] Step 5: Classifying body type`);
      await job.updateProgress(70);
      await this.updateAvatarProgress(avatarId, 70, 'Classifying body type');
      this.emitProgress(avatarId, job.id as string, 70, 'Classifying body type');

      const { bodyType, confidence: bodyTypeConfidence } = await this.mlService.classifyBodyType(measurements);

      // Save measurements to database
      await this.measurementRepo.create({
        avatarId,
        ...measurements,
        source: MeasurementSource.AUTO,
        confidenceScore: measurements.confidence || null,
        metadata: {
          landmarks,
          detectionMethod: 'ml-auto',
        },
      });

      // ========== STEP 6: 3D model generation (75%) ==========
      this.logger.log(`[${avatarId}] Step 6: Generating 3D model`);
      await job.updateProgress(75);
      await this.updateAvatarProgress(avatarId, 75, 'Generating 3D model');
      this.emitProgress(avatarId, job.id as string, 75, 'Generating 3D model');

      const generatedModel = await this.modelGenerationService.generateModel({
        measurements,
        bodyType,
        landmarks,
        customization,
        quality: 'high',
      });

      // ========== STEP 7: Model optimization (90%) ==========
      this.logger.log(`[${avatarId}] Step 7: Optimizing model`);
      await job.updateProgress(90);
      await this.updateAvatarProgress(avatarId, 90, 'Optimizing model');
      this.emitProgress(avatarId, job.id as string, 90, 'Optimizing model');

      const optimizedModel = await this.modelOptimizationService.optimizeForWeb(generatedModel.mesh);
      const lods = await this.modelOptimizationService.generateLODs(optimizedModel);

      // ========== STEP 8: Upload model and save to MongoDB (95%) ==========
      this.logger.log(`[${avatarId}] Step 8: Uploading and saving model`);
      await job.updateProgress(95);
      await this.updateAvatarProgress(avatarId, 95, 'Uploading model');
      this.emitProgress(avatarId, job.id as string, 95, 'Uploading model');

      const uploadResult = await this.uploadModel(avatarId, optimizedModel);

      // Save model to MongoDB
      await this.saveModelToDatabase(avatarId, {
        mesh: generatedModel.mesh,
        lods,
        bodyType,
        measurements,
        landmarks,
        modelUrl: uploadResult.url,
        modelSizeBytes: uploadResult.sizeBytes,
      });

      // ========== STEP 9: Update avatar record in PostgreSQL (97%) ==========
      await job.updateProgress(97);
      await this.avatarRepo.update(avatarId, {
        bodyType,
        confidenceScore: bodyTypeConfidence,
        modelUrl: uploadResult.url,
        modelFormat: 'glb',
        modelSizeBytes: uploadResult.sizeBytes,
        metadata: {
          version: '1.0',
          mlModelVersion: '1.0.0',
          processingDuration: Date.now() - startTime,
          landmarks,
          unit,
        },
      });

      // ========== STEP 10: Finalize and mark as ready (100%) ==========
      this.logger.log(`[${avatarId}] Step 10: Finalizing`);
      await job.updateProgress(100);
      await this.updateAvatarStatus(avatarId, AvatarStatus.READY, 'Complete');

      const processingTime = Date.now() - startTime;

      // Update processing job record
      await this.processingJobRepo.update(job.id as string, {
        status: ProcessingJobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
        processingDurationMs: processingTime,
        resultData: {
          bodyType,
          measurements: measurements,
          modelUrl: uploadResult.url,
          processingTime,
        },
      });

      // Emit completion event
      this.eventEmitter.emit('avatar.processing.completed', {
        avatarId,
        userId,
        jobId: job.id,
        processingTime,
        bodyType,
        measurements,
        modelUrl: uploadResult.url,
        timestamp: new Date(),
      });

      this.logger.log(
        `✅ Completed processing for avatar ${avatarId} in ${processingTime}ms`,
      );

      return {
        success: true,
        avatarId,
        modelUrl: uploadResult.url,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process avatar ${avatarId}:`, error);

      // Update avatar status to error
      await this.updateAvatarStatus(avatarId, AvatarStatus.ERROR, error.message);

      // Update processing job record
      try {
        await this.processingJobRepo.update(job.id as string, {
          status: ProcessingJobStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error.message,
          errorStack: error.stack,
          errorCode: error.code || 'PROCESSING_ERROR',
          attemptNumber: (job.attemptsMade || 0) + 1,
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
        stack: error.stack,
        retryable: error.retryable !== false,
        timestamp: new Date(),
      });

      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: ProcessingResult) {
    this.logger.log(
      `✅ Job ${job.id} completed successfully for avatar ${result.avatarId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`❌ Job ${job.id} failed:`, error.message);
  }

  // ===== Private Helper Methods =====

  /**
   * Download photos from S3 URLs
   */
  private async downloadPhotos(photoUrls: string[] | any): Promise<Photo[]> {
    const photos: Photo[] = [];

    // Handle both array and object formats
    const urls = Array.isArray(photoUrls) ? photoUrls : [
      photoUrls.front,
      photoUrls.side,
      photoUrls.back,
    ].filter(Boolean);

    for (const url of urls) {
      if (url) {
        photos.push({
          url,
          type: this.inferPhotoType(url),
          buffer: await this.storageService.downloadFile(this.extractS3Key(url)),
        });
      }
    }

    this.logger.log(`Downloaded ${photos.length} photos for processing`);
    return photos;
  }

  /**
   * Save processed photo (with background removed) back to database
   */
  private async saveProcessedPhoto(avatarId: string, maskedPhoto: any): Promise<void> {
    try {
      // Upload processed photo to S3
      const uploadResult = await this.storageService.uploadProcessedPhoto(
        avatarId,
        maskedPhoto.type,
        maskedPhoto.data,
      );

      // Update photo record
      const photos = await this.photoRepo.findByAvatarId(avatarId);
      const photo = photos.find((p) => p.type === maskedPhoto.type);

      if (photo) {
        await this.photoRepo.update(photo.id, {
          processedUrl: uploadResult.url,
          processedS3Key: uploadResult.key,
          hasBackgroundRemoved: true,
          status: PhotoStatus.PROCESSED,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to save processed photo: ${error.message}`);
      // Non-critical error, continue processing
    }
  }

  /**
   * Upload generated 3D model to S3
   */
  private async uploadModel(avatarId: string, model: any): Promise<{
    url: string;
    key: string;
    sizeBytes: number;
  }> {
    // Serialize model to buffer (simplified - actual implementation would use GLTF/GLB export)
    const modelBuffer = this.serializeModel(model);

    const uploadResult = await this.storageService.uploadModel(
      avatarId,
      modelBuffer,
      'glb',
    );

    this.logger.log(`Model uploaded to ${uploadResult.url}`);

    return {
      url: uploadResult.url,
      key: uploadResult.key,
      sizeBytes: modelBuffer.length,
    };
  }

  /**
   * Save model to MongoDB with all metadata
   */
  private async saveModelToDatabase(
    avatarId: string,
    data: {
      mesh: any;
      lods: any[];
      bodyType: string;
      measurements: any;
      landmarks: any;
      modelUrl: string;
      modelSizeBytes: number;
    },
  ): Promise<void> {
    await this.avatarModelRepo.upsert(avatarId, {
      avatarId,
      mesh: this.serializeMesh(data.mesh),
      lod: data.lods,
      generationMetadata: {
        version: '1.0',
        generatedAt: new Date(),
        mlModelVersion: '1.0.0',
        bodyType: data.bodyType,
        measurements: data.measurements,
        landmarks: data.landmarks,
        options: {
          quality: 'high',
          optimizeForWeb: true,
          generateLODs: true,
        },
      },
      totalSizeBytes: data.modelSizeBytes,
      quality: {
        isValid: true,
        hasNormals: true,
        hasUVs: true,
        hasTextures: false,
        hasSkeleton: false,
      },
    });

    this.logger.log(`Model saved to MongoDB for avatar ${avatarId}`);
  }

  /**
   * Update avatar processing status
   */
  private async updateAvatarStatus(
    avatarId: string,
    status: AvatarStatus,
    message?: string,
  ): Promise<void> {
    await this.avatarRepo.update(avatarId, {
      status,
      processingMessage: message || null,
    });

    // Emit WebSocket event for real-time updates
    this.eventEmitter.emit('avatar.status.update', {
      avatarId,
      status,
      message,
      timestamp: new Date(),
    });
  }

  /**
   * Update avatar processing progress
   */
  private async updateAvatarProgress(
    avatarId: string,
    progress: number,
    message?: string,
  ): Promise<void> {
    await this.avatarRepo.update(avatarId, {
      processingProgress: progress,
      processingMessage: message || null,
    });
  }

  /**
   * Emit progress event for WebSocket updates
   */
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

  /**
   * Serialize model to buffer for storage
   */
  private serializeModel(model: any): Buffer {
    // Simplified serialization - actual implementation would use GLTF/GLB export
    return Buffer.from(JSON.stringify(model));
  }

  /**
   * Serialize mesh data for MongoDB storage
   */
  private serializeMesh(mesh: any): any {
    return {
      vertices: mesh.vertices || Buffer.alloc(0),
      faces: mesh.faces || Buffer.alloc(0),
      normals: mesh.normals || Buffer.alloc(0),
      uvs: mesh.uvs || Buffer.alloc(0),
      vertexCount: mesh.vertexCount || 0,
      faceCount: mesh.faceCount || 0,
    };
  }

  /**
   * Extract S3 key from full URL
   */
  private extractS3Key(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').filter(Boolean).join('/');
    } catch {
      return url;
    }
  }

  /**
   * Infer photo type from URL
   */
  private inferPhotoType(url: string): 'front' | 'side' | 'back' | 'custom' {
    const lower = url.toLowerCase();
    if (lower.includes('front')) return 'front';
    if (lower.includes('side')) return 'side';
    if (lower.includes('back')) return 'back';
    return 'custom';
  }
}
