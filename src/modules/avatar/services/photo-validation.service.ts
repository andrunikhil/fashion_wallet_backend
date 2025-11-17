import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

@Injectable()
export class PhotoValidationService {
  private readonly logger = new Logger(PhotoValidationService.name);

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MIN_WIDTH = 640;
  private readonly MIN_HEIGHT = 480;
  private readonly ALLOWED_FORMATS = ['jpeg', 'jpg', 'png'];

  async validatePhoto(file: Express.Multer.File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Check MIME type
    if (!this.isAllowedMimeType(file.mimetype)) {
      errors.push('Only JPEG and PNG files are allowed');
    }

    // Check magic number (file signature)
    const isValidMagic = await this.checkMagicNumber(file.buffer);
    if (!isValidMagic) {
      errors.push('Invalid file format or corrupted file');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Get image metadata
    let metadata: sharp.Metadata;
    try {
      metadata = await sharp(file.buffer).metadata();
    } catch (error) {
      errors.push('Failed to read image metadata');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check dimensions
    if (!metadata.width || !metadata.height) {
      errors.push('Invalid image dimensions');
    } else {
      if (metadata.width < this.MIN_WIDTH || metadata.height < this.MIN_HEIGHT) {
        errors.push(
          `Image resolution too low (minimum ${this.MIN_WIDTH}x${this.MIN_HEIGHT})`,
        );
      }

      // Warn if image is too large
      if (metadata.width > 4096 || metadata.height > 4096) {
        warnings.push('Image resolution is very high and will be downscaled');
      }

      // Check aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      if (aspectRatio < 0.5 || aspectRatio > 2) {
        warnings.push('Unusual aspect ratio detected');
      }
    }

    // Check format
    if (metadata.format && !this.ALLOWED_FORMATS.includes(metadata.format.toLowerCase())) {
      errors.push(`Unsupported image format: ${metadata.format}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: metadata.width && metadata.height ? {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
        size: file.size,
      } : undefined,
    };
  }

  async validatePhotos(files: { [key: string]: Express.Multer.File[] }): Promise<void> {
    const validationPromises: Promise<void>[] = [];

    for (const [type, fileArray] of Object.entries(files)) {
      if (fileArray && fileArray.length > 0) {
        const file = fileArray[0]; // Take first file for each type
        validationPromises.push(
          this.validatePhoto(file).then(result => {
            if (!result.isValid) {
              throw new BadRequestException(
                `Validation failed for ${type} photo: ${result.errors.join(', ')}`,
              );
            }
            if (result.warnings.length > 0) {
              this.logger.warn(
                `Warnings for ${type} photo: ${result.warnings.join(', ')}`,
              );
            }
          }),
        );
      }
    }

    await Promise.all(validationPromises);
  }

  async stripExifData(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .withMetadata({
          // Remove all EXIF data except orientation
          exif: {},
          icc: undefined,
        })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to strip EXIF data:', error);
      throw new Error('Failed to process image');
    }
  }

  async normalizePhoto(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .rotate() // Auto-rotate
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to normalize photo:', error);
      throw new Error('Failed to process image');
    }
  }

  async createThumbnail(buffer: Buffer, size = 256): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      this.logger.error('Failed to create thumbnail:', error);
      throw new Error('Failed to create thumbnail');
    }
  }

  async checkImageQuality(buffer: Buffer): Promise<{
    score: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let score = 1.0;

    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const stats = await image.stats();

      // Check resolution
      if (metadata.width && metadata.height) {
        const totalPixels = metadata.width * metadata.height;
        if (totalPixels < 640 * 480) {
          issues.push('Low resolution');
          score -= 0.3;
        }
      }

      // Check if image is too dark or too bright
      if (stats.channels && stats.channels.length > 0) {
        const avgBrightness = stats.channels[0].mean;
        if (avgBrightness < 50) {
          issues.push('Image is too dark');
          score -= 0.2;
        } else if (avgBrightness > 220) {
          issues.push('Image is too bright');
          score -= 0.2;
        }
      }

      // Check contrast (using standard deviation as proxy)
      if (stats.channels && stats.channels.length > 0) {
        const contrast = stats.channels[0].stdev;
        if (contrast < 30) {
          issues.push('Low contrast');
          score -= 0.2;
        }
      }

      score = Math.max(0, Math.min(1, score));

      return {
        score,
        issues,
      };
    } catch (error) {
      this.logger.error('Failed to check image quality:', error);
      return {
        score: 0.5,
        issues: ['Failed to analyze image quality'],
      };
    }
  }

  private isAllowedMimeType(mimeType: string): boolean {
    const allowed = ['image/jpeg', 'image/png'];
    return allowed.includes(mimeType.toLowerCase());
  }

  private async checkMagicNumber(buffer: Buffer): Promise<boolean> {
    if (buffer.length < 4) {
      return false;
    }

    // Check JPEG magic number (FF D8 FF)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return true;
    }

    // Check PNG magic number (89 50 4E 47)
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    return false;
  }
}
