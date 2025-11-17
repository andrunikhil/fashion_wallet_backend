import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AvatarCustomizationDto } from './create-avatar-from-photos.dto';

export class UpdateAvatarDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AvatarCustomizationDto)
  customization?: AvatarCustomizationDto;
}
