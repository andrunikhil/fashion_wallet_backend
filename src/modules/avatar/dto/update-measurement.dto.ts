import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { MeasurementUnit } from '../../../infrastructure/database/entities/measurement.entity';

export class UpdateMeasurementDto {
  @IsOptional()
  @IsNumber()
  @Min(140)
  @Max(220)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(200)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(60)
  shoulderWidth?: number;

  @IsOptional()
  @IsNumber()
  @Min(70)
  @Max(150)
  chestCircumference?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(150)
  waistCircumference?: number;

  @IsOptional()
  @IsNumber()
  @Min(70)
  @Max(160)
  hipCircumference?: number;

  @IsOptional()
  @IsNumber()
  armLength?: number;

  @IsOptional()
  @IsNumber()
  inseamLength?: number;

  @IsOptional()
  @IsEnum(MeasurementUnit)
  unit?: MeasurementUnit;
}
