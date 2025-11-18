import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Export } from '../entities/export.entity';
import { ExportRepository } from '../repositories/export.repository';
import { DesignRepository } from '../repositories/design.repository';
import { CollaboratorRepository } from '../repositories/collaborator.repository';
import { TierLimitsService } from './tier-limits.service';
import { ExportRequestDto } from '../dto/export-request.dto';

/**
 * Export Service
 * Manages export job creation, tracking, and retrieval
 * Note: Actual rendering/encoding is handled by worker processes (future implementation)
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  // Export expiration: 7 days
  private readonly EXPORT_EXPIRATION_DAYS = 7;

  // Maximum retry attempts
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    @InjectQueue('export')
    private readonly exportQueue: Queue,
    private readonly exportRepo: ExportRepository,
    private readonly designRepo: DesignRepository,
    private readonly collaboratorRepo: CollaboratorRepository,
    private readonly tierLimitsService: TierLimitsService,
  ) {}

  /**
   * Create a new export job
   */
  async createExport(
    designId: string,
    userId: string,
    user: any,
    exportDto: ExportRequestDto,
  ): Promise<Export> {
    // Verify design exists and user has access
    await this.verifyDesignAccess(designId, userId);

    // Check tier-based export limits
    const userTier = this.tierLimitsService.getUserTier(user);
    await this.tierLimitsService.validateExportCreation(userId, userTier, exportDto.type);

    // Determine format based on type
    const format = this.determineFormat(exportDto.type, exportDto.options);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.EXPORT_EXPIRATION_DAYS);

    // Create export record
    const exportRecord = await this.exportRepo.create({
      designId,
      userId,
      type: exportDto.type,
      format,
      options: exportDto.options || {},
      status: 'queued',
      progress: 0,
      expiresAt,
    });

    this.logger.log(
      `Created export job ${exportRecord.id} for design ${designId} (type: ${exportDto.type})`,
    );

    // Queue job for processing
    await this.queueExportJob(exportRecord);

    return exportRecord;
  }

  /**
   * Get export status and details
   */
  async getExportStatus(exportId: string, userId: string): Promise<Export> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    // Verify user owns this export
    if (exportRecord.userId !== userId) {
      throw new ForbiddenException('You do not have access to this export');
    }

    return exportRecord;
  }

  /**
   * List all exports for a design
   */
  async listExports(designId: string, userId: string): Promise<Export[]> {
    // Verify design access
    await this.verifyDesignAccess(designId, userId);

    return this.exportRepo.findByDesignId(designId);
  }

  /**
   * Cancel a queued or processing export
   */
  async cancelExport(exportId: string, userId: string): Promise<void> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    // Verify user owns this export
    if (exportRecord.userId !== userId) {
      throw new ForbiddenException('You do not have access to this export');
    }

    // Can only cancel queued or processing exports
    if (exportRecord.status === 'completed') {
      throw new BadRequestException('Cannot cancel a completed export');
    }

    if (exportRecord.status === 'failed') {
      throw new BadRequestException('Cannot cancel a failed export');
    }

    // Update status to failed with cancellation message
    await this.exportRepo.markAsFailed(exportId, 'Export cancelled by user');

    this.logger.log(`Export ${exportId} cancelled by user ${userId}`);

    // Signal worker to stop processing if in progress
    // Find and remove job from queue
    const jobs = await this.exportQueue.getJobs(['waiting', 'active', 'delayed']);
    const job = jobs.find(j => j.data.exportId === exportId);
    if (job) {
      await job.remove();
      this.logger.log(`Removed export job ${job.id} from queue`);
    }
  }

  /**
   * Delete an export and its associated file
   */
  async deleteExport(exportId: string, userId: string): Promise<void> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    // Verify user owns this export
    if (exportRecord.userId !== userId) {
      throw new ForbiddenException('You do not have access to this export');
    }

    // TODO: Delete file from storage (S3, etc.)
    // if (exportRecord.fileUrl) {
    //   await this.storageService.deleteFile(exportRecord.fileUrl);
    // }

    // Delete export record
    const success = await this.exportRepo.delete(exportId);

    if (!success) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    this.logger.log(`Export ${exportId} deleted by user ${userId}`);
  }

  /**
   * Update export progress (called by worker)
   */
  async updateExportProgress(
    exportId: string,
    progress: number,
    status: 'queued' | 'processing' | 'completed' | 'failed',
  ): Promise<void> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    // Validate progress value
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    await this.exportRepo.updateStatus(exportId, status, progress);

    this.logger.debug(
      `Export ${exportId} progress updated: ${progress}% (status: ${status})`,
    );
  }

  /**
   * Mark export as completed with file URL
   */
  async completeExport(
    exportId: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
  ): Promise<Export> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    const updated = await this.exportRepo.update(exportId, {
      status: 'completed',
      progress: 100,
      fileUrl,
      fileName,
      fileSize,
      completedAt: new Date(),
    });

    this.logger.log(`Export ${exportId} completed successfully`);

    return updated!;
  }

  /**
   * Mark export as failed with error message
   */
  async failExport(exportId: string, errorMessage: string): Promise<void> {
    const exportRecord = await this.exportRepo.findById(exportId);

    if (!exportRecord) {
      throw new NotFoundException(`Export with ID ${exportId} not found`);
    }

    // Check if we should retry
    if (exportRecord.retryCount < this.MAX_RETRY_ATTEMPTS) {
      await this.exportRepo.incrementRetryCount(exportId);
      await this.exportRepo.updateStatus(exportId, 'queued', 0);

      this.logger.warn(
        `Export ${exportId} failed, retrying (attempt ${exportRecord.retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`,
      );

      // TODO: Re-queue job for processing
    } else {
      await this.exportRepo.markAsFailed(exportId, errorMessage);

      this.logger.error(
        `Export ${exportId} failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`,
      );
    }
  }

  /**
   * Get queued exports (for worker processing)
   */
  async getQueuedExports(): Promise<Export[]> {
    return this.exportRepo.findQueuedExports();
  }

  /**
   * Clean up expired exports
   */
  async cleanupExpiredExports(): Promise<number> {
    const deletedCount = await this.exportRepo.deleteExpired();

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired exports`);
    }

    return deletedCount;
  }

  /**
   * Queue export job for processing
   */
  private async queueExportJob(exportRecord: Export): Promise<void> {
    const jobName = `export-${exportRecord.type}`;
    const jobData = {
      exportId: exportRecord.id,
      designId: exportRecord.designId,
      userId: exportRecord.userId,
      type: exportRecord.type,
      options: exportRecord.options,
    };

    // Determine priority based on export type
    const priority = this.getExportPriority(exportRecord.type);

    await this.exportQueue.add(jobName, jobData, {
      priority,
      attempts: this.MAX_RETRY_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 86400, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 86400 * 3, // Keep failed jobs for 3 days
      },
    });

    this.logger.log(`Queued ${jobName} job for export ${exportRecord.id}`);
  }

  /**
   * Get export priority based on type
   */
  private getExportPriority(type: string): number {
    const priorities: Record<string, number> = {
      image: 5,
      video: 10,
      model: 10,
      techpack: 8,
    };
    return priorities[type] || 10;
  }

  /**
   * Determine export format based on type and options
   */
  private determineFormat(
    type: 'image' | 'video' | 'model' | 'techpack',
    options?: any,
  ): string {
    if (options?.format) {
      return options.format;
    }

    // Default formats by type
    const defaultFormats: Record<string, string> = {
      image: 'png',
      video: 'mp4',
      model: 'glb',
      techpack: 'pdf',
    };

    return defaultFormats[type] || 'unknown';
  }

  /**
   * Verify user has access to the design
   */
  private async verifyDesignAccess(
    designId: string,
    userId: string,
  ): Promise<void> {
    const design = await this.designRepo.findById(designId);

    if (!design) {
      throw new NotFoundException(`Design with ID ${designId} not found`);
    }

    // Owner always has full access
    if (design.userId === userId) {
      return;
    }

    // Check if design is public (allow public exports)
    if (design.visibility === 'public') {
      return;
    }

    // Check collaborators table for shared designs
    if (design.visibility === 'shared') {
      const hasAccess = await this.collaboratorRepo.hasAccess(
        designId,
        userId,
        'viewer', // Exporting requires at least viewer access
      );

      if (hasAccess) {
        return;
      }
    }

    throw new ForbiddenException('You do not have access to this design');
  }
}
