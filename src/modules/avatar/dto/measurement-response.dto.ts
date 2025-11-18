import { Exclude, Expose } from 'class-transformer';
import { MeasurementUnit, MeasurementSource } from '../../../infrastructure/database/entities/measurement.entity';

@Exclude()
export class MeasurementResponseDto {
  @Expose()
  id: string;

  @Expose()
  avatarId: string;

  // Core measurements
  @Expose()
  height: number;

  @Expose()
  weight: number | null;

  @Expose()
  shoulderWidth: number | null;

  @Expose()
  chestCircumference: number | null;

  @Expose()
  bustCircumference: number | null;

  @Expose()
  underBustCircumference: number | null;

  @Expose()
  waistCircumference: number | null;

  @Expose()
  naturalWaistCircumference: number | null;

  @Expose()
  hipCircumference: number | null;

  @Expose()
  highHipCircumference: number | null;

  // Arm measurements
  @Expose()
  armLength: number | null;

  @Expose()
  bicepCircumference: number | null;

  @Expose()
  wristCircumference: number | null;

  // Leg measurements
  @Expose()
  inseamLength: number | null;

  @Expose()
  outseamLength: number | null;

  @Expose()
  thighCircumference: number | null;

  @Expose()
  kneeCircumference: number | null;

  @Expose()
  calfCircumference: number | null;

  @Expose()
  ankleCircumference: number | null;

  // Torso measurements
  @Expose()
  neckCircumference: number | null;

  @Expose()
  torsoLength: number | null;

  @Expose()
  backLength: number | null;

  // Foot measurements
  @Expose()
  footLength: number | null;

  @Expose()
  footWidth: number | null;

  // Metadata
  @Expose()
  unit: MeasurementUnit;

  @Expose()
  source: MeasurementSource;

  @Expose()
  confidenceScore: number | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // Excluded: metadata (internal use only)
}

export class MeasurementValidationResponseDto {
  @Expose()
  valid: boolean;

  @Expose()
  errors: ValidationErrorDto[];

  @Expose()
  warnings: ValidationWarningDto[];

  @Expose()
  suggestions: MeasurementSuggestionDto[];
}

export class ValidationErrorDto {
  @Expose()
  field: string;

  @Expose()
  message: string;

  @Expose()
  constraint: string;

  @Expose()
  currentValue?: number;

  @Expose()
  expectedRange?: { min: number; max: number };
}

export class ValidationWarningDto {
  @Expose()
  field: string;

  @Expose()
  message: string;

  @Expose()
  severity: 'low' | 'medium' | 'high';
}

export class MeasurementSuggestionDto {
  @Expose()
  field: string;

  @Expose()
  suggestedValue: number;

  @Expose()
  reason: string;

  @Expose()
  confidence: number;
}
