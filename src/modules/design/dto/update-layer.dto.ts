import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  @IsInt()
  x: number;

  @IsInt()
  y: number;

  @IsInt()
  z: number;
}

class RotationDto {
  @IsInt()
  @Min(0)
  @Max(360)
  x: number;

  @IsInt()
  @Min(0)
  @Max(360)
  y: number;

  @IsInt()
  @Min(0)
  @Max(360)
  z: number;
}

class ScaleDto {
  @IsInt()
  @Min(0)
  x: number;

  @IsInt()
  @Min(0)
  y: number;

  @IsInt()
  @Min(0)
  z: number;
}

class TransformDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RotationDto)
  rotation?: RotationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScaleDto)
  scale?: ScaleDto;
}

export class UpdateLayerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransformDto)
  transform?: TransformDto;

  @IsOptional()
  @IsObject()
  customization?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsEnum(['normal', 'multiply', 'screen', 'overlay', 'add'])
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  opacity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
