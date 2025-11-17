import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Recommendation types
 */
export enum RecommendationType {
  PERSONALIZED = 'personalized',
  TRENDING = 'trending',
  SIMILAR = 'similar',
  COMPLEMENTARY = 'complementary',
  POPULAR = 'popular',
  NEW_ARRIVALS = 'new_arrivals',
}

/**
 * Recommendation request DTO
 */
export class RecommendationRequestDto {
  @ApiProperty({
    description: 'Type of recommendations to get',
    enum: RecommendationType,
    example: RecommendationType.PERSONALIZED,
  })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiPropertyOptional({
    description: 'User ID for personalized recommendations',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Catalog item ID for similar/complementary recommendations',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({
    description: 'Number of recommendations to return',
    example: 12,
    default: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @ApiPropertyOptional({
    description: 'Category filter',
    type: [String],
    example: ['dresses', 'tops'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @ApiPropertyOptional({
    description: 'Catalog item type filter',
    example: 'silhouette',
  })
  @IsOptional()
  @IsString()
  itemType?: string;

  @ApiPropertyOptional({
    description: 'Include diversity in results',
    example: true,
    default: true,
  })
  @IsOptional()
  includeDiversity?: boolean = true;
}

/**
 * Recommendation result item
 */
export class RecommendationItemDto {
  @ApiProperty({
    description: 'Catalog item',
  })
  item: any;

  @ApiProperty({
    description: 'Recommendation score (0-100)',
    example: 85.5,
  })
  score: number;

  @ApiProperty({
    description: 'Reason for recommendation',
    example: 'Based on your browsing history',
  })
  reason: string;

  @ApiProperty({
    description: 'Recommendation algorithm used',
    example: 'collaborative_filtering',
  })
  algorithm: string;
}

/**
 * Recommendation response DTO
 */
export class RecommendationResponseDto {
  @ApiProperty({
    description: 'Recommended items',
    type: [RecommendationItemDto],
  })
  items: RecommendationItemDto[];

  @ApiProperty({
    description: 'Recommendation type',
    enum: RecommendationType,
  })
  type: RecommendationType;

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 150,
  })
  took: number;

  @ApiPropertyOptional({
    description: 'Total available recommendations',
    example: 50,
  })
  total?: number;
}

/**
 * User interaction DTO
 */
export class UserInteractionDto {
  @ApiProperty({
    description: 'User ID',
    example: 'uuid-here',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Catalog item ID',
    example: 'uuid-here',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'Interaction type',
    enum: ['view', 'use', 'favorite', 'search', 'share'],
    example: 'view',
  })
  @IsEnum(['view', 'use', 'favorite', 'search', 'share'])
  interactionType: 'view' | 'use' | 'favorite' | 'search' | 'share';

  @ApiPropertyOptional({
    description: 'Additional context',
  })
  @IsOptional()
  context?: Record<string, any>;
}
