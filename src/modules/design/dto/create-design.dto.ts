import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDesignDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID()
  avatarId?: string;

  @IsOptional()
  @IsEnum(['outfit', 'top', 'bottom', 'dress', 'outerwear', 'full_collection'])
  category?: 'outfit' | 'top' | 'bottom' | 'dress' | 'outerwear' | 'full_collection';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  occasion?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  season?: string[];

  @IsOptional()
  @IsEnum(['private', 'shared', 'public'])
  visibility?: 'private' | 'shared' | 'public';
}
