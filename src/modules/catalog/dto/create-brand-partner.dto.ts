import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsUrl,
  IsDateString,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum PartnershipType {
  EXCLUSIVE = 'exclusive',
  FEATURED = 'featured',
  STANDARD = 'standard',
}

export class CreateBrandPartnerDto {
  @ApiProperty({ description: 'Brand name', example: 'Fashion House Inc.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Brand description', example: 'Premium fashion brand established in 2010' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Brand logo URL', example: 'https://cdn.example.com/logos/brand.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Brand website URL', example: 'https://www.fashionhouse.com' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({
    description: 'Partnership type',
    enum: PartnershipType,
    example: PartnershipType.STANDARD
  })
  @IsNotEmpty()
  @IsEnum(PartnershipType)
  partnershipType: PartnershipType;

  @ApiPropertyOptional({ description: 'Contact person name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'john@fashionhouse.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ description: 'Contact phone', example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Partnership start date', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  partnershipStartDate?: string;

  @ApiPropertyOptional({ description: 'Partnership end date', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  partnershipEndDate?: string;

  @ApiPropertyOptional({ description: 'Is the brand partner active?', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Is this a featured partner?', example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata (JSON)',
    example: { country: 'USA', yearEstablished: 2010 }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
