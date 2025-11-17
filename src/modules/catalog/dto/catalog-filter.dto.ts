import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsArray, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum CatalogItemType {
  SILHOUETTE = 'silhouette',
  FABRIC = 'fabric',
  PATTERN = 'pattern',
  ELEMENT = 'element',
}

export enum SortField {
  RELEVANCE = 'relevance',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
  NAME = 'name',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class CatalogFilterDto {
  @ApiPropertyOptional({ description: 'Page number (1-indexed)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 24, default: 24 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 24;

  @ApiPropertyOptional({
    description: 'Catalog item type',
    enum: CatalogItemType,
    example: CatalogItemType.SILHOUETTE
  })
  @IsOptional()
  @IsEnum(CatalogItemType)
  type?: CatalogItemType;

  @ApiPropertyOptional({
    description: 'Categories to filter by',
    type: [String],
    example: ['tops', 'dresses']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  category?: string[];

  @ApiPropertyOptional({
    description: 'Tags to filter by',
    type: [String],
    example: ['casual', 'summer']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',') : value)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by featured items', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by active items', example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Brand partner ID', example: 'uuid-here' })
  @IsOptional()
  @IsString()
  brandPartnerId?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SortField,
    default: SortField.POPULARITY
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.POPULARITY;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: 'Search query', example: 't-shirt' })
  @IsOptional()
  @IsString()
  query?: string;
}
