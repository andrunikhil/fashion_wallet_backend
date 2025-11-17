import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';
import { IsObject, IsOptional, IsNumber, IsArray, IsString, IsBoolean } from 'class-validator';
import { CatalogItemType } from './catalog-filter.dto';

export class PatternPropertiesDto {
  @ApiProperty({
    description: 'Pattern type',
    example: 'geometric',
    enum: ['geometric', 'floral', 'abstract', 'striped', 'checkered', 'polka-dot', 'animal-print', 'tribal', 'paisley']
  })
  @IsString()
  patternType: string;

  @ApiProperty({
    description: 'Pattern scale',
    example: 'medium',
    enum: ['small', 'medium', 'large']
  })
  @IsString()
  scale: string;

  @ApiProperty({ description: 'Is the pattern repeating?', example: true })
  @IsBoolean()
  repeating: boolean;

  @ApiProperty({
    description: 'Pattern colors',
    example: [
      { name: 'Blue', hex: '#0000FF' },
      { name: 'White', hex: '#FFFFFF' }
    ]
  })
  @IsArray()
  colors: Array<{ name: string; hex: string }>;

  @ApiProperty({
    description: 'Pattern complexity (1-5)',
    example: 3,
    minimum: 1,
    maximum: 5
  })
  @IsNumber()
  complexity: number;

  @ApiProperty({
    description: 'Tile size for repeating patterns',
    example: { width: 256, height: 256 }
  })
  @IsOptional()
  @IsObject()
  tileSize?: { width: number; height: number };

  @ApiProperty({
    description: 'Pattern orientation',
    example: 'horizontal',
    enum: ['horizontal', 'vertical', 'diagonal', 'radial', 'random']
  })
  @IsOptional()
  @IsString()
  orientation?: string;

  @ApiProperty({
    description: 'Suitable for garment types',
    type: [String],
    example: ['dress', 'shirt', 'skirt']
  })
  @IsOptional()
  @IsArray()
  suitableFor?: string[];

  @ApiProperty({
    description: 'Style tags',
    type: [String],
    example: ['modern', 'vintage', 'bohemian']
  })
  @IsOptional()
  @IsArray()
  styleTags?: string[];
}

export class CreatePatternDto extends OmitType(CreateCatalogItemDto, ['type', 'properties'] as const) {
  @ApiProperty({
    description: 'Pattern-specific properties',
    type: PatternPropertiesDto
  })
  @IsObject()
  properties: PatternPropertiesDto;

  // Type is hardcoded to pattern
  type: CatalogItemType.PATTERN = CatalogItemType.PATTERN;
}
