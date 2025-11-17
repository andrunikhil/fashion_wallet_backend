import {
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImageExportOptionsDto {
  @IsOptional()
  @IsInt()
  @Min(512)
  @Max(8192)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(512)
  @Max(8192)
  height?: number;

  @IsOptional()
  @IsEnum(['png', 'jpeg', 'webp'])
  format?: 'png' | 'jpeg' | 'webp';

  @IsOptional()
  @IsBoolean()
  transparentBackground?: boolean;

  @IsOptional()
  @IsString()
  backgroundColor?: string;
}

export class VideoExportOptionsDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(30)
  duration?: number; // seconds

  @IsOptional()
  @IsInt()
  @Min(24)
  @Max(60)
  fps?: number;

  @IsOptional()
  @IsInt()
  @Min(360)
  @Max(1440)
  rotationDegrees?: number;

  @IsOptional()
  @IsEnum(['720p', '1080p', '4k'])
  resolution?: '720p' | '1080p' | '4k';

  @IsOptional()
  @IsEnum(['mp4', 'webm'])
  format?: 'mp4' | 'webm';
}

export class ModelExportOptionsDto {
  @IsOptional()
  @IsEnum(['gltf', 'glb', 'fbx', 'obj'])
  format?: 'gltf' | 'glb' | 'fbx' | 'obj';

  @IsOptional()
  @IsBoolean()
  includeTextures?: boolean;

  @IsOptional()
  @IsBoolean()
  optimize?: boolean;
}

export class ExportRequestDto {
  @IsEnum(['image', 'video', 'model', 'techpack'])
  type: 'image' | 'video' | 'model' | 'techpack';

  @IsOptional()
  @IsObject()
  options?: ImageExportOptionsDto | VideoExportOptionsDto | ModelExportOptionsDto;
}
