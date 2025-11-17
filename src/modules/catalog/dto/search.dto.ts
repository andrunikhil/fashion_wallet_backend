import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CatalogItemType, SortField, SortOrder } from './catalog-filter.dto';

/**
 * Price range filter
 */
export class PriceRangeDto {
  @ApiPropertyOptional({ description: 'Minimum price', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min?: number;

  @ApiPropertyOptional({ description: 'Maximum price', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max?: number;
}

/**
 * Search request DTO
 */
export class SearchRequestDto {
  @ApiPropertyOptional({
    description: 'Search query (full-text search)',
    example: 'summer dress',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 24,
    default: 24,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 24;

  @ApiPropertyOptional({
    description: 'Categories to filter by',
    type: [String],
    example: ['tops', 'dresses'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  category?: string[];

  @ApiPropertyOptional({
    description: 'Tags to filter by',
    type: [String],
    example: ['casual', 'summer'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Colors to filter by',
    type: [String],
    example: ['red', 'blue'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  colors?: string[];

  @ApiPropertyOptional({
    description: 'Occasions to filter by',
    type: [String],
    example: ['casual', 'formal'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  occasions?: string[];

  @ApiPropertyOptional({
    description: 'Seasons to filter by',
    type: [String],
    example: ['summer', 'winter'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  seasons?: string[];

  @ApiPropertyOptional({
    description: 'Styles to filter by',
    type: [String],
    example: ['bohemian', 'minimalist'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  styles?: string[];

  @ApiPropertyOptional({
    description: 'Price range filter',
    type: PriceRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange?: PriceRangeDto;

  @ApiPropertyOptional({
    description: 'Brand partner ID',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsString()
  brandPartner?: string;

  @ApiPropertyOptional({
    description: 'Catalog item type',
    enum: CatalogItemType,
    example: CatalogItemType.SILHOUETTE,
  })
  @IsOptional()
  @IsEnum(CatalogItemType)
  type?: CatalogItemType;

  @ApiPropertyOptional({
    description: 'Filter by featured items',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by active items',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SortField,
    default: SortField.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.RELEVANCE;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Include facets in response',
    example: true,
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeFacets?: boolean = true;
}

/**
 * Search facet item
 */
export class SearchFacetDto {
  @ApiProperty({ description: 'Facet value', example: 'tops' })
  value: string;

  @ApiProperty({ description: 'Number of items with this value', example: 42 })
  count: number;
}

/**
 * Price range statistics
 */
export class PriceRangeStatsDto {
  @ApiProperty({ description: 'Minimum price', example: 10 })
  min: number;

  @ApiProperty({ description: 'Maximum price', example: 500 })
  max: number;

  @ApiProperty({ description: 'Average price', example: 125.5 })
  avg: number;
}

/**
 * Search facets response
 */
export class SearchFacetsDto {
  @ApiProperty({
    description: 'Category facets',
    type: [SearchFacetDto],
  })
  categories: SearchFacetDto[];

  @ApiProperty({
    description: 'Color facets',
    type: [SearchFacetDto],
  })
  colors: SearchFacetDto[];

  @ApiProperty({
    description: 'Occasion facets',
    type: [SearchFacetDto],
  })
  occasions: SearchFacetDto[];

  @ApiProperty({
    description: 'Season facets',
    type: [SearchFacetDto],
  })
  seasons: SearchFacetDto[];

  @ApiProperty({
    description: 'Brand facets',
    type: [SearchFacetDto],
  })
  brands: SearchFacetDto[];

  @ApiProperty({
    description: 'Style facets',
    type: [SearchFacetDto],
  })
  styles: SearchFacetDto[];

  @ApiPropertyOptional({
    description: 'Price range statistics',
    type: PriceRangeStatsDto,
  })
  priceRange?: PriceRangeStatsDto;
}

/**
 * Pagination metadata
 */
export class PaginationDto {
  @ApiProperty({ description: 'Total number of items', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 24 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 7 })
  totalPages: number;

  @ApiProperty({ description: 'Has next page', example: true })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page', example: false })
  hasPrev: boolean;
}

/**
 * Search response DTO
 */
export class SearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: 'array',
    items: { type: 'object' },
  })
  items: any[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;

  @ApiPropertyOptional({
    description: 'Search facets for filtering',
    type: SearchFacetsDto,
  })
  facets?: SearchFacetsDto;

  @ApiPropertyOptional({
    description: 'Search suggestions',
    type: [String],
    example: ['summer dresses', 'summer tops'],
  })
  suggestions?: string[];

  @ApiProperty({
    description: 'Search time in milliseconds',
    example: 45,
  })
  took: number;
}

/**
 * Autocomplete request DTO
 */
export class AutocompleteRequestDto {
  @ApiProperty({
    description: 'Search prefix',
    example: 'sum',
  })
  @IsString()
  prefix: string;

  @ApiPropertyOptional({
    description: 'Maximum number of suggestions',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

/**
 * Autocomplete response DTO
 */
export class AutocompleteResponseDto {
  @ApiProperty({
    description: 'Autocomplete suggestions',
    type: [String],
    example: ['summer dress', 'summer top', 'summer skirt'],
  })
  suggestions: string[];

  @ApiProperty({
    description: 'Response time in milliseconds',
    example: 15,
  })
  took: number;
}
