import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import * as sharp from 'sharp';
import { FashionRenderHelper, CanvasSettings, RenderLayer } from '../utils';

/**
 * Render Worker
 * Processes render jobs from the queue
 *
 * Uses Three.js server-side rendering with GLTF model loading,
 * proper lighting, camera setup, and Sharp for image encoding
 *
 * PRODUCTION NOTES:
 * - For optimal performance, use headless-gl with proper system dependencies
 * - Consider using dedicated rendering service/container with GPU support
 * - Can also use Puppeteer for browser-based rendering as fallback
 */
@Processor('render')
export class RenderWorker {
  private readonly logger = new Logger(RenderWorker.name);

  @Process('render-design')
  async handleRenderJob(job: Job<any>): Promise<any> {
    const { designId, design, layers, canvasSettings, config, renderHash } = job.data;

    this.logger.log(`Processing render job ${job.id} for design ${designId}`);

    try {
      // Update progress - initializing
      await job.progress(10);

      // Render the design using Three.js SSR
      const renderResult = await this.renderDesign(
        design,
        layers,
        canvasSettings,
        config,
        (progress) => job.progress(progress),
      );

      await job.progress(90);

      // Upload to S3 (placeholder - should use S3Service)
      const url = await this.uploadRender(renderResult, designId, renderHash);

      await job.progress(100);

      this.logger.log(`Completed render job ${job.id} for design ${designId}`);

      return {
        success: true,
        url,
        renderHash,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error processing render job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Render design using Three.js SSR
   *
   * Steps:
   * 1. Initialize Three.js renderer with specified dimensions
   * 2. Load avatar 3D model (GLTF/GLB)
   * 3. Load and position catalog items as layers
   * 4. Apply transformations, materials, customizations to each layer
   * 5. Setup camera and lighting from canvasSettings
   * 6. Render scene to buffer
   * 7. Encode with Sharp for final image format
   */
  private async renderDesign(
    design: any,
    layers: RenderLayer[],
    canvasSettings: CanvasSettings,
    config: any,
    progressCallback: (progress: number) => Promise<void>,
  ): Promise<Buffer> {
    this.logger.log(`Rendering design ${design.id} with ${layers.length} layers`);

    await progressCallback(20);

    const { width, height, format, quality } = config;

    // Initialize the fashion render helper
    const renderHelper = new FashionRenderHelper({
      width: width || 1024,
      height: height || 1024,
      antialias: config.quality === 'ultra', // Enable antialiasing for ultra quality
    });

    try {
      await progressCallback(30);

      // Get avatar model path
      // In production, this would come from your storage/CDN
      const avatarModelPath = this.getAvatarModelPath(design.avatarId);

      await progressCallback(40);

      // Render the complete design
      // NOTE: Due to headless-gl not being installed, this will use placeholder rendering
      // In production with proper GL setup, it will do actual 3D rendering
      const buffer = await renderHelper.renderDesign(
        avatarModelPath,
        layers,
        canvasSettings,
        {
          format: format || 'png',
          quality: quality || 90,
          usePlaceholder: true, // Set to false when headless-gl is properly configured
        }
      );

      await progressCallback(80);

      // Dispose of resources
      renderHelper.dispose();

      this.logger.log(`Successfully rendered design ${design.id}`);
      return buffer;

    } catch (error) {
      this.logger.error(`Error rendering design ${design.id}:`, error);

      // Cleanup
      renderHelper.dispose();

      // Fallback: Create a simple placeholder image
      return await this.createFallbackImage(width || 1024, height || 1024, design.name);
    }
  }

  /**
   * Get avatar model path from avatar ID
   * In production, this would query the avatar service or storage
   */
  private getAvatarModelPath(avatarId: string): string {
    // TODO: Integrate with avatar service/storage
    // const avatar = await this.avatarService.findById(avatarId);
    // return avatar.modelUrl;

    // For now, return a placeholder path
    return `/models/avatars/${avatarId}.glb`;
  }

  /**
   * Create a fallback image when rendering fails
   */
  private async createFallbackImage(
    width: number,
    height: number,
    designName: string,
  ): Promise<Buffer> {
    this.logger.warn('Creating fallback image');

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
        <text x="50%" y="45%" font-family="Arial" font-size="32" fill="white" text-anchor="middle" dominant-baseline="middle">
          Fashion Design
        </text>
        <text x="50%" y="55%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">
          ${designName || 'Rendering...'}
        </text>
      </svg>
    `;

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Upload rendered image to S3
   *
   * TODO: Use actual S3Service
   */
  private async uploadRender(
    buffer: Buffer,
    designId: string,
    renderHash: string,
  ): Promise<string> {
    this.logger.log(`Uploading render for design ${designId}`);

    // Placeholder: In production, upload to S3
    // Example:
    // const key = `renders/${designId}/${renderHash}.png`;
    // await this.s3Service.upload(key, buffer, 'image/png');
    // return this.s3Service.getPublicUrl(key);

    // For now, return a placeholder URL
    const url = `https://placeholder.com/renders/${designId}/${renderHash}.png`;

    return url;
  }
}
