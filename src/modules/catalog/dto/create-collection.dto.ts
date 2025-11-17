import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCollectionDto {
  @ApiProperty({ description: 'Collection name', example: 'Summer Essentials 2024' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Collection description',
    example: 'Must-have pieces for summer wardrobes'
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Collection category',
    example: 'seasonal',
    enum: ['seasonal', 'trending', 'curated', 'brand', 'designer']
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    type: [String],
    example: ['summer', 'casual', 'trending']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Thumbnail image URL', example: 'https://cdn.example.com/collections/summer.jpg' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Is this collection public?', example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Is this a featured collection?', example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Is this collection active?', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Collection start date', example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Collection end date', example: '2024-08-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
