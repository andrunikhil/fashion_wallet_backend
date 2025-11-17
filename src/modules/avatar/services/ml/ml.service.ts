import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  IMLService,
  Photo,
  Landmarks,
  Measurements,
  BodyType,
} from './ml.interface';

@Injectable()
export class MLService implements IMLService {
  private readonly logger = new Logger(MLService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get('ML_SERVICE_URL', 'http://localhost:5000');
  }

  async removeBackground(photos: Photo[]): Promise<Photo[]> {
    try {
      this.logger.log(`Calling ML service for background removal: ${this.mlServiceUrl}/background-removal`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlServiceUrl}/background-removal`,
          {
            photos: photos.map((p) => ({
              url: p.url,
              type: p.type,
            })),
          },
          {
            timeout: 30000, // 30 seconds
          },
        ),
      );

      this.logger.log('Background removal completed');

      return response.data.processedPhotos;
    } catch (error) {
      this.logger.error('Background removal failed:', error.message);
      throw new Error(`ML service background removal failed: ${error.message}`);
    }
  }

  async detectPose(photos: Photo[]): Promise<Landmarks> {
    try {
      this.logger.log(`Calling ML service for pose detection: ${this.mlServiceUrl}/pose-detection`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlServiceUrl}/pose-detection`,
          { photos },
          { timeout: 30000 },
        ),
      );

      const landmarks = response.data.landmarks;

      // Validate landmarks
      this.validateLandmarks(landmarks);

      this.logger.log('Pose detection completed');

      return landmarks;
    } catch (error) {
      this.logger.error('Pose detection failed:', error.message);
      throw new Error(`ML service pose detection failed: ${error.message}`);
    }
  }

  async extractMeasurements(
    landmarks: Landmarks,
    photo: Photo,
    unit: string,
  ): Promise<Measurements> {
    try {
      this.logger.log(`Calling ML service for measurement extraction: ${this.mlServiceUrl}/measurement-extraction`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlServiceUrl}/measurement-extraction`,
          {
            landmarks,
            photoMetadata: photo.metadata,
            unit,
          },
          { timeout: 20000 },
        ),
      );

      const measurements = response.data.measurements;

      // Validate measurements
      this.validateMeasurements(measurements);

      this.logger.log('Measurement extraction completed');

      return measurements;
    } catch (error) {
      this.logger.error('Measurement extraction failed:', error.message);
      throw new Error(`ML service measurement extraction failed: ${error.message}`);
    }
  }

  async classifyBodyType(measurements: Measurements): Promise<{ bodyType: BodyType; confidence: number }> {
    try {
      this.logger.log(`Calling ML service for body type classification: ${this.mlServiceUrl}/body-type-classification`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.mlServiceUrl}/body-type-classification`,
          { measurements },
          { timeout: 10000 },
        ),
      );

      this.logger.log(`Body type classification completed: ${response.data.bodyType}`);

      return {
        bodyType: response.data.bodyType,
        confidence: response.data.confidence,
      };
    } catch (error) {
      this.logger.error('Body type classification failed:', error.message);
      throw new Error(`ML service body type classification failed: ${error.message}`);
    }
  }

  private validateLandmarks(landmarks: Landmarks): void {
    if (!landmarks || !landmarks.points || landmarks.points.length < 33) {
      throw new Error(`Invalid landmarks data: expected 33 points, got ${landmarks?.points?.length || 0}`);
    }

    // Check confidence scores
    const avgConfidence =
      landmarks.points.reduce((sum, p) => sum + p.confidence, 0) /
      landmarks.points.length;

    if (avgConfidence < 0.6) {
      throw new Error(`Low confidence in pose detection: ${avgConfidence.toFixed(2)}`);
    }

    this.logger.log(`Landmarks validated: ${landmarks.points.length} points, avg confidence: ${avgConfidence.toFixed(2)}`);
  }

  private validateMeasurements(measurements: Measurements): void {
    // Check required measurements
    const required = ['height', 'chestCircumference', 'waistCircumference', 'hipCircumference'];

    for (const key of required) {
      if (!measurements[key] || measurements[key] <= 0) {
        throw new Error(`Invalid or missing measurement: ${key}`);
      }
    }

    // Sanity checks (metric units)
    if (measurements.height < 140 || measurements.height > 220) {
      throw new Error(`Height out of reasonable range: ${measurements.height}`);
    }

    if (measurements.chestCircumference < 70 || measurements.chestCircumference > 150) {
      throw new Error(`Chest circumference out of reasonable range: ${measurements.chestCircumference}`);
    }

    if (measurements.waistCircumference < 60 || measurements.waistCircumference > 150) {
      throw new Error(`Waist circumference out of reasonable range: ${measurements.waistCircumference}`);
    }

    if (measurements.hipCircumference < 70 || measurements.hipCircumference > 160) {
      throw new Error(`Hip circumference out of reasonable range: ${measurements.hipCircumference}`);
    }

    this.logger.log('Measurements validated successfully');
  }
}
