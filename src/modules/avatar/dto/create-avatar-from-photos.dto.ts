import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MeasurementUnit } from '../../../infrastructure/database/entities/measurement.entity';

export class AvatarCustomizationDto {
  @IsOptional()
  @IsString()
  skinTone?: string;

  @IsOptional()
  @IsString()
  hairColor?: string;

  @IsOptional()
  @IsString()
  hairStyle?: string;

  @IsOptional()
  @IsString()
  faceShape?: string;
}

export class CreateAvatarFromPhotosDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsEnum(MeasurementUnit)
  @IsOptional()
  unit?: MeasurementUnit = MeasurementUnit.METRIC;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AvatarCustomizationDto)
  customization?: AvatarCustomizationDto;
}

export interface PhotoFiles {
  front?: Express.Multer.File[];
  side?: Express.Multer.File[];
  back?: Express.Multer.File[];
}
