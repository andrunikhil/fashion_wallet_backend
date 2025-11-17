import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsObject,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CatalogItemType } from './catalog-filter.dto';

export class CreateCatalogItemDto {
  @ApiProperty({
    description: 'Type of catalog item',
    enum: CatalogItemType,
    example: CatalogItemType.SILHOUETTE
  })
  @IsNotEmpty()
  @IsEnum(CatalogItemType)
  type: CatalogItemType;

  @ApiProperty({ description: 'Name of the catalog item', example: 'Classic T-Shirt' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Detailed description', example: 'A classic crew neck t-shirt perfect for everyday wear' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Category', example: 'tops' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Subcategory', example: 'shirts' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization and search',
    type: [String],
    example: ['casual', 'summer', 'cotton']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'URL to 3D model file', example: 'https://cdn.example.com/models/tshirt.glb' })
  @IsOptional()
  @IsString()
  modelUrl?: string;

  @ApiPropertyOptional({ description: 'URL to thumbnail image', example: 'https://cdn.example.com/thumbnails/tshirt.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Preview images',
    example: {
      front: 'https://cdn.example.com/previews/tshirt-front.jpg',
      back: 'https://cdn.example.com/previews/tshirt-back.jpg'
    }
  })
  @IsOptional()
  @IsObject()
  previewImages?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Type-specific properties (flexible JSON)',
    example: {
      colors: [{ name: 'red', hex: '#FF0000' }],
      sizes: ['S', 'M', 'L', 'XL']
    }
  })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Designer name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  designerName?: string;

  @ApiPropertyOptional({ description: 'Brand partner ID', example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  brandPartnerId?: string;

  @ApiPropertyOptional({ description: 'Is this an exclusive item?', example: false })
  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean;

  @ApiPropertyOptional({ description: 'Release date', example: '2024-12-01' })
  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @ApiPropertyOptional({ description: 'Is the item active?', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is this a featured item?', example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Required subscription tier',
    example: 'premium',
    enum: ['free', 'basic', 'premium', 'enterprise']
  })
  @IsOptional()
  @IsString()
  requiredTier?: string;

  @ApiPropertyOptional({
    description: 'Flexible data for MongoDB (meshes, textures, etc.)',
    example: { meshData: 'binary', textureData: {} }
  })
  @IsOptional()
  @IsObject()
  flexibleData?: Record<string, any>;
}
