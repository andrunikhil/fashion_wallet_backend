import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';
import { IsObject, IsOptional, IsNumber, IsArray } from 'class-validator';
import { CatalogItemType } from './catalog-filter.dto';

export class SilhouettePropertiesDto {
  @ApiProperty({ description: 'Garment type', example: 'dress' })
  garmentType: string;

  @ApiProperty({ description: 'Fit type', example: 'slim' })
  fitType: string;

  @ApiProperty({ description: 'Silhouette style', example: 'A-line' })
  silhouetteStyle: string;

  @ApiProperty({
    description: 'Body measurements',
    example: {
      bust: { min: 32, max: 40 },
      waist: { min: 26, max: 34 },
      hips: { min: 36, max: 44 }
    }
  })
  @IsOptional()
  bodyMeasurements?: Record<string, { min: number; max: number }>;

  @ApiProperty({
    description: 'Available sizes',
    type: [String],
    example: ['XS', 'S', 'M', 'L', 'XL']
  })
  @IsArray()
  sizes: string[];

  @ApiProperty({ description: 'Length in inches', example: 28 })
  @IsNumber()
  length?: number;

  @ApiProperty({
    description: 'Occasions this silhouette is suitable for',
    type: [String],
    example: ['casual', 'formal', 'business']
  })
  @IsOptional()
  @IsArray()
  occasions?: string[];

  @ApiProperty({
    description: 'Seasons this silhouette is suitable for',
    type: [String],
    example: ['spring', 'summer', 'fall', 'winter']
  })
  @IsOptional()
  @IsArray()
  seasons?: string[];
}

export class CreateSilhouetteDto extends OmitType(CreateCatalogItemDto, ['type', 'properties'] as const) {
  @ApiProperty({
    description: 'Silhouette-specific properties',
    type: SilhouettePropertiesDto
  })
  @IsObject()
  properties: SilhouettePropertiesDto;

  // Type is hardcoded to silhouette
  type: CatalogItemType.SILHOUETTE = CatalogItemType.SILHOUETTE;
}
