import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';
import { IsObject, IsOptional, IsNumber, IsArray, IsString } from 'class-validator';
import { CatalogItemType } from './catalog-filter.dto';

export class FabricPropertiesDto {
  @ApiProperty({ description: 'Material composition', example: '100% Cotton' })
  @IsString()
  material: string;

  @ApiProperty({
    description: 'Texture type',
    example: 'smooth',
    enum: ['smooth', 'rough', 'ribbed', 'knit', 'woven']
  })
  @IsString()
  textureType: string;

  @ApiProperty({ description: 'Weight in GSM (grams per square meter)', example: 180 })
  @IsNumber()
  weight?: number;

  @ApiProperty({
    description: 'Fabric patterns',
    type: [String],
    example: ['solid', 'striped', 'checkered']
  })
  @IsOptional()
  @IsArray()
  patterns?: string[];

  @ApiProperty({
    description: 'Available colors',
    example: [
      { name: 'Navy Blue', hex: '#000080' },
      { name: 'White', hex: '#FFFFFF' }
    ]
  })
  @IsArray()
  colors: Array<{ name: string; hex: string }>;

  @ApiProperty({ description: 'Stretch percentage', example: 15 })
  @IsOptional()
  @IsNumber()
  stretch?: number;

  @ApiProperty({
    description: 'Care instructions',
    type: [String],
    example: ['machine wash cold', 'tumble dry low', 'do not bleach']
  })
  @IsOptional()
  @IsArray()
  careInstructions?: string[];

  @ApiProperty({
    description: 'Sustainability rating (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsNumber()
  sustainabilityRating?: number;

  @ApiProperty({ description: 'Is the fabric breathable?', example: true })
  @IsOptional()
  breathable?: boolean;

  @ApiProperty({ description: 'Is the fabric waterproof?', example: false })
  @IsOptional()
  waterproof?: boolean;
}

export class CreateFabricDto extends OmitType(CreateCatalogItemDto, ['type', 'properties'] as const) {
  @ApiProperty({
    description: 'Fabric-specific properties',
    type: FabricPropertiesDto
  })
  @IsObject()
  properties: FabricPropertiesDto;

  // Type is hardcoded to fabric
  type: CatalogItemType.FABRIC = CatalogItemType.FABRIC;
}
