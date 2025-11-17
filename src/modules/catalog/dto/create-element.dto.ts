import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';
import { IsObject, IsOptional, IsArray, IsString, IsBoolean, IsNumber } from 'class-validator';
import { CatalogItemType } from './catalog-filter.dto';

export class ElementPropertiesDto {
  @ApiProperty({
    description: 'Element type',
    example: 'button',
    enum: ['button', 'zipper', 'buckle', 'trim', 'embellishment', 'pocket', 'collar', 'cuff', 'hem', 'applique']
  })
  @IsString()
  elementType: string;

  @ApiProperty({
    description: 'Element category',
    example: 'fastener',
    enum: ['fastener', 'decorative', 'functional', 'structural']
  })
  @IsString()
  category: string;

  @ApiProperty({
    description: 'Placement options',
    type: [String],
    example: ['front', 'sleeve', 'collar']
  })
  @IsArray()
  placementOptions: string[];

  @ApiProperty({
    description: 'Available sizes',
    type: [String],
    example: ['small', 'medium', 'large']
  })
  @IsOptional()
  @IsArray()
  sizes?: string[];

  @ApiProperty({
    description: 'Available colors',
    example: [
      { name: 'Gold', hex: '#FFD700' },
      { name: 'Silver', hex: '#C0C0C0' }
    ]
  })
  @IsOptional()
  @IsArray()
  colors?: Array<{ name: string; hex: string }>;

  @ApiProperty({
    description: 'Material',
    example: 'metal',
    enum: ['metal', 'plastic', 'wood', 'fabric', 'leather', 'composite']
  })
  @IsString()
  material: string;

  @ApiProperty({ description: 'Is this element customizable?', example: true })
  @IsBoolean()
  customizable: boolean;

  @ApiProperty({
    description: 'Compatible garment types',
    type: [String],
    example: ['shirt', 'jacket', 'pants']
  })
  @IsArray()
  compatibleGarments: string[];

  @ApiProperty({
    description: 'Dimensions',
    example: { width: 20, height: 20, depth: 5 }
  })
  @IsOptional()
  @IsObject()
  dimensions?: { width: number; height: number; depth?: number };

  @ApiProperty({
    description: 'Weight in grams',
    example: 5
  })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({
    description: 'Style tags',
    type: [String],
    example: ['modern', 'vintage', 'minimalist']
  })
  @IsOptional()
  @IsArray()
  styleTags?: string[];
}

export class CreateElementDto extends OmitType(CreateCatalogItemDto, ['type', 'properties'] as const) {
  @ApiProperty({
    description: 'Element-specific properties',
    type: ElementPropertiesDto
  })
  @IsObject()
  properties: ElementPropertiesDto;

  // Type is hardcoded to element
  type: CatalogItemType.ELEMENT = CatalogItemType.ELEMENT;
}
