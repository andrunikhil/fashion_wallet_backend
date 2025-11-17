import {
  IsString,
  IsOptional,
  IsUUID,
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
  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @ValidateNested()
  @Type(() => RotationDto)
  rotation: RotationDto;

  @ValidateNested()
  @Type(() => ScaleDto)
  scale: ScaleDto;
}

export class CreateLayerDto {
  @IsEnum(['silhouette', 'fabric', 'pattern', 'element', 'accessory'])
  type: 'silhouette' | 'fabric' | 'pattern' | 'element' | 'accessory';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsUUID()
  catalogItemId: string;

  @IsString()
  catalogItemType: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

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
