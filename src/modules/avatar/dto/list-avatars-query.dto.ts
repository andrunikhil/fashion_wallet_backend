import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AvatarStatus, AvatarSource } from '../../../infrastructure/database/entities/avatar.entity';

export class ListAvatarsQueryDto {
  @IsOptional()
  @IsEnum(AvatarStatus)
  status?: AvatarStatus;

  @IsOptional()
  @IsEnum(AvatarSource)
  source?: AvatarSource;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'viewCount'])
  orderBy?: 'createdAt' | 'updatedAt' | 'viewCount' = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  orderDirection?: 'ASC' | 'DESC' = 'DESC';
}
