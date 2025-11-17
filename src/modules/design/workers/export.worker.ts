import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import sharp from 'sharp';
import * as ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ExportService } from '../services/export.service';
import { RenderingService } from '../services/rendering.service';
import { DesignRepository } from '../repositories/design.repository';
import { LayerRepository } from '../repositories/layer.repository';
import { CanvasSettingsRepository } from '../repositories/canvas-settings.repository';

/**
 * Export Worker
 * Processes export jobs from the queue
 * Handles: image, video, 3D model exports
 */
@Processor('export')
export class ExportWorker {
  private readonly logger = new Logger(ExportWorker.name);

  constructor(
    private readonly exportService: ExportService,
    private readonly renderingService: RenderingService,
    private readonly designRepo: DesignRepository,
    private readonly layerRepo: LayerRepository,
    private readonly canvasSettingsRepo: CanvasSettingsRepository,
  ) {}

  /**
   * Process image export
   */
  @Process('export-image')
  async handleImageExport(job: Job<any>): Promise<any> {
    const { exportId, designId, options } = job.data;

    this.logger.log(`Processing image export job ${job.id} for design ${designId}`);

    try {
      // Update status to processing
      await this.exportService.updateExportProgress(exportId, 0, 'processing');
      await job.progress(10);

      // Get design data
      const design = await this.designRepo.findByIdWithLayers(designId);
      if (!design) {
        throw new Error(`Design ${designId} not found`);
      }

      await job.progress(20);

      // Render the design using rendering service
      const renderResult = await this.renderingService.renderDesign(
        designId,
        options.preset || 'preview',
        {
          width: options.width,
          height: options.height,
          format: options.format || 'png',
          background: options.background,
        },
      );

      await job.progress(60);

      // If render was cached, get the URL
      let fileUrl: string;
      let fileSize = 0;
      const fileName = `${design.name}-${Date.now()}.${options.format || 'png'}`;

      if (renderResult.cached && renderResult.url) {
        fileUrl = renderResult.url;
        // TODO: Get file size from S3
        fileSize = 0;
      } else {
        // Wait for render job to complete
        if (renderResult.jobId) {
          fileUrl = await this.waitForRenderCompletion(
            renderResult.jobId,
            (progress) => {
              // Update export progress (60-90%)
              const exportProgress = 60 + (progress * 0.3);
              this.exportService.updateExportProgress(exportId, exportProgress, 'processing');
              job.progress(exportProgress);
            },
          );
        } else {
          throw new Error('Render failed to queue');
        }
      }

      await job.progress(95);

      // Mark export as completed
      await this.exportService.completeExport(
        exportId,
        fileUrl,
        fileName,
        fileSize,
      );

      await job.progress(100);

      this.logger.log(`Completed image export ${exportId}`);

      return {
        success: true,
        exportId,
        fileUrl,
        fileName,
      };
    } catch (error) {
      this.logger.error(`Error processing image export ${exportId}:`, error);
      await this.exportService.failExport(exportId, error.message);
      throw error;
    }
  }

  /**
   * Process video export (turntable)
   */
  @Process('export-video')
  async handleVideoExport(job: Job<any>): Promise<any> {
    const { exportId, designId, options } = job.data;

    this.logger.log(`Processing video export job ${job.id} for design ${designId}`);

    try {
      // Update status to processing
      await this.exportService.updateExportProgress(exportId, 0, 'processing');
      await job.progress(10);

      // Get design data
      const design = await this.designRepo.findByIdWithLayers(designId);
      if (!design) {
        throw new Error(`Design ${designId} not found`);
      }

      const layers = await this.layerRepo.findByDesignId(designId);
      const canvasSettings = await this.canvasSettingsRepo.findByDesignId(designId);

      await job.progress(20);

      // Generate turntable video
      const videoResult = await this.generateTurntableVideo(
        design,
        layers,
        canvasSettings,
        options,
        (progress) => {
          // Update export progress (20-95%)
          const exportProgress = 20 + (progress * 0.75);
          this.exportService.updateExportProgress(exportId, exportProgress, 'processing');
          job.progress(exportProgress);
        },
      );

      await job.progress(95);

      // Mark export as completed
      const fileName = `${design.name}-turntable-${Date.now()}.${options.format || 'mp4'}`;
      await this.exportService.completeExport(
        exportId,
        videoResult.url,
        fileName,
        videoResult.fileSize,
      );

      await job.progress(100);

      this.logger.log(`Completed video export ${exportId}`);

      return {
        success: true,
        exportId,
        fileUrl: videoResult.url,
        fileName,
      };
    } catch (error) {
      this.logger.error(`Error processing video export ${exportId}:`, error);
      await this.exportService.failExport(exportId, error.message);
      throw error;
    }
  }

  /**
   * Process 3D model export
   */
  @Process('export-model')
  async handleModelExport(job: Job<any>): Promise<any> {
    const { exportId, designId, options } = job.data;

    this.logger.log(`Processing 3D model export job ${job.id} for design ${designId}`);

    try {
      // Update status to processing
      await this.exportService.updateExportProgress(exportId, 0, 'processing');
      await job.progress(10);

      // Get design data
      const design = await this.designRepo.findByIdWithLayers(designId);
      if (!design) {
        throw new Error(`Design ${designId} not found`);
      }

      const layers = await this.layerRepo.findByDesignId(designId);

      await job.progress(30);

      // Export 3D model
      const modelResult = await this.export3DModel(
        design,
        layers,
        options,
        (progress) => {
          const exportProgress = 30 + (progress * 0.65);
          this.exportService.updateExportProgress(exportId, exportProgress, 'processing');
          job.progress(exportProgress);
        },
      );

      await job.progress(95);

      // Mark export as completed
      const format = options.format || 'glb';
      const fileName = `${design.name}-model-${Date.now()}.${format}`;
      await this.exportService.completeExport(
        exportId,
        modelResult.url,
        fileName,
        modelResult.fileSize,
      );

      await job.progress(100);

      this.logger.log(`Completed 3D model export ${exportId}`);

      return {
        success: true,
        exportId,
        fileUrl: modelResult.url,
        fileName,
      };
    } catch (error) {
      this.logger.error(`Error processing 3D model export ${exportId}:`, error);
      await this.exportService.failExport(exportId, error.message);
      throw error;
    }
  }

  /**
   * Wait for render job to complete
   */
  private async waitForRenderCompletion(
    jobId: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 1000; // 1 second
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.renderingService.getRenderJobStatus(jobId);

      if (status.status === 'completed' && status.result?.url) {
        return status.result.url;
      }

      if (status.status === 'failed') {
        throw new Error(`Render job failed: ${status.error}`);
      }

      if (onProgress && status.progress) {
        onProgress(status.progress);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Render job timed out');
  }

  /**
   * Generate turntable video
   *
   * TODO: Implement actual video generation
   * This should:
   * 1. Calculate number of frames based on duration and FPS
   * 2. Render each frame with camera rotation
   * 3. Encode frames into video using FFmpeg
   * 4. Upload to S3
   */
  private async generateTurntableVideo(
    design: any,
    layers: any[],
    canvasSettings: any,
    options: any,
    onProgress?: (progress: number) => void,
  ): Promise<{ url: string; fileSize: number }> {
    this.logger.log(`Generating turntable video for design ${design.id}`);

    // Extract options
    const duration = options.duration || 5; // seconds
    const fps = options.fps || 30;
    const rotationDegrees = options.rotationDegrees || 360;
    const resolution = options.resolution || '1080p';
    const format = options.format || 'mp4';

    const frameCount = duration * fps;
    const degreesPerFrame = rotationDegrees / frameCount;

    if (onProgress) onProgress(10);

    // TODO: Implement actual frame rendering
    // For now, return placeholder
    const placeholderUrl = `https://placeholder.com/videos/${design.id}/turntable.${format}`;

    if (onProgress) onProgress(100);

    return {
      url: placeholderUrl,
      fileSize: 1024 * 1024 * 5, // Placeholder: 5MB
    };
  }

  /**
   * Export 3D model
   *
   * TODO: Implement actual 3D model export
   * This should:
   * 1. Load avatar base model
   * 2. Apply all layers as separate meshes
   * 3. Merge/combine as needed
   * 4. Export to requested format (GLTF, GLB, FBX, OBJ)
   * 5. Upload to S3
   */
  private async export3DModel(
    design: any,
    layers: any[],
    options: any,
    onProgress?: (progress: number) => void,
  ): Promise<{ url: string; fileSize: number }> {
    this.logger.log(`Exporting 3D model for design ${design.id}`);

    const format = options.format || 'glb';

    if (onProgress) onProgress(20);

    // TODO: Implement actual 3D model export
    // Load avatar model, apply layers, combine, export

    if (onProgress) onProgress(80);

    // Placeholder
    const placeholderUrl = `https://placeholder.com/models/${design.id}/model.${format}`;

    if (onProgress) onProgress(100);

    return {
      url: placeholderUrl,
      fileSize: 1024 * 1024 * 10, // Placeholder: 10MB
    };
  }

  /**
   * Create temporary directory for processing
   */
  private async createTempDir(prefix: string): Promise<string> {
    const tempDir = join(tmpdir(), `export-${prefix}-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Clean up temporary directory
   */
  private async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      this.logger.debug(`Cleaned up temp directory: ${dirPath}`);
    } catch (error) {
      this.logger.warn(`Failed to clean up temp directory ${dirPath}:`, error);
    }
  }
}
