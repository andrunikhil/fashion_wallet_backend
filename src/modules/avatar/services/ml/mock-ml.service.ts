import { Injectable, Logger } from '@nestjs/common';
import {
  IMLService,
  Photo,
  Landmarks,
  Measurements,
  BodyType,
  LandmarkPoint,
} from './ml.interface';

@Injectable()
export class MockMLService implements IMLService {
  private readonly logger = new Logger(MockMLService.name);

  async removeBackground(photos: Photo[]): Promise<Photo[]> {
    this.logger.log('[MOCK] Removing background from photos');

    // Simulate processing delay
    await this.delay(500);

    return photos.map((photo) => ({
      ...photo,
      url: photo.url.replace('.jpg', '_masked.jpg'),
    }));
  }

  async detectPose(photos: Photo[]): Promise<Landmarks> {
    this.logger.log('[MOCK] Detecting pose from photos');

    // Simulate processing delay
    await this.delay(800);

    // Return mock landmarks (33 points for full body pose)
    const points: LandmarkPoint[] = [];

    const landmarkNames = [
      'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
      'right_eye_inner', 'right_eye', 'right_eye_outer',
      'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
      'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
      'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
      'left_index', 'right_index', 'left_thumb', 'right_thumb',
      'left_hip', 'right_hip', 'left_knee', 'right_knee',
      'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
      'left_foot_index', 'right_foot_index',
    ];

    for (let i = 0; i < 33; i++) {
      points.push({
        x: 0.3 + Math.random() * 0.4, // Random x between 0.3 and 0.7
        y: (i / 33) * 0.9 + 0.05, // Distribute vertically
        z: Math.random() * 0.1 - 0.05, // Small random z
        confidence: 0.85 + Math.random() * 0.1, // Confidence between 0.85 and 0.95
        name: landmarkNames[i] || `landmark_${i}`,
      });
    }

    return {
      points,
      averageConfidence: 0.92,
    };
  }

  async extractMeasurements(
    landmarks: Landmarks,
    photo: Photo,
    unit: string,
  ): Promise<Measurements> {
    this.logger.log('[MOCK] Extracting measurements from landmarks');

    // Simulate processing delay
    await this.delay(600);

    // Return mock measurements in metric
    const mockMeasurements: Measurements = {
      height: 170 + Math.random() * 20, // 170-190 cm
      shoulderWidth: 40 + Math.random() * 10, // 40-50 cm
      chestCircumference: 90 + Math.random() * 15, // 90-105 cm
      waistCircumference: 75 + Math.random() * 15, // 75-90 cm
      hipCircumference: 95 + Math.random() * 15, // 95-110 cm
      armLength: 55 + Math.random() * 10, // 55-65 cm
      inseam: 75 + Math.random() * 10, // 75-85 cm
      neckCircumference: 35 + Math.random() * 5, // 35-40 cm
      thighCircumference: 50 + Math.random() * 10, // 50-60 cm
      confidence: 0.89,
      unit: unit as 'metric' | 'imperial',
    };

    // Convert to imperial if needed
    if (unit === 'imperial') {
      return this.convertToImperial(mockMeasurements);
    }

    return mockMeasurements;
  }

  async classifyBodyType(
    measurements: Measurements,
  ): Promise<{ bodyType: BodyType; confidence: number }> {
    this.logger.log('[MOCK] Classifying body type from measurements');

    // Simulate processing delay
    await this.delay(300);

    // Simple classification based on measurements
    const waistToHipRatio = measurements.waistCircumference / measurements.hipCircumference;
    const shoulderToHipRatio = measurements.shoulderWidth / measurements.hipCircumference;

    let bodyType: BodyType;

    if (waistToHipRatio < 0.75) {
      bodyType = 'hourglass';
    } else if (shoulderToHipRatio > 0.5) {
      bodyType = 'inverted-triangle';
    } else if (waistToHipRatio > 0.85) {
      bodyType = 'rectangle';
    } else {
      bodyType = 'pear';
    }

    return {
      bodyType,
      confidence: 0.87,
    };
  }

  private convertToImperial(measurements: Measurements): Measurements {
    return {
      ...measurements,
      height: measurements.height / 2.54,
      shoulderWidth: measurements.shoulderWidth / 2.54,
      chestCircumference: measurements.chestCircumference / 2.54,
      waistCircumference: measurements.waistCircumference / 2.54,
      hipCircumference: measurements.hipCircumference / 2.54,
      armLength: measurements.armLength ? measurements.armLength / 2.54 : undefined,
      inseam: measurements.inseam ? measurements.inseam / 2.54 : undefined,
      neckCircumference: measurements.neckCircumference ? measurements.neckCircumference / 2.54 : undefined,
      thighCircumference: measurements.thighCircumference ? measurements.thighCircumference / 2.54 : undefined,
      unit: 'imperial',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
