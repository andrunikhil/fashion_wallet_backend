export interface Photo {
  url: string;
  type: 'front' | 'side' | 'back';
  metadata?: any;
}

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
  name: string;
}

export interface Landmarks {
  points: LandmarkPoint[];
  averageConfidence: number;
}

export interface Measurements {
  height: number;
  shoulderWidth: number;
  chestCircumference: number;
  waistCircumference: number;
  hipCircumference: number;
  armLength?: number;
  inseam?: number;
  neckCircumference?: number;
  thighCircumference?: number;
  confidence: number;
  unit: 'metric' | 'imperial';
}

export type BodyType = 'rectangle' | 'triangle' | 'inverted-triangle' | 'hourglass' | 'apple' | 'pear';

export interface IMLService {
  removeBackground(photos: Photo[]): Promise<Photo[]>;
  detectPose(photos: Photo[]): Promise<Landmarks>;
  extractMeasurements(landmarks: Landmarks, photo: Photo, unit: string): Promise<Measurements>;
  classifyBodyType(measurements: Measurements): Promise<{ bodyType: BodyType; confidence: number }>;
}
