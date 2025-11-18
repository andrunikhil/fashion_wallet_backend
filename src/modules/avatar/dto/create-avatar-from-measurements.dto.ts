import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeasurementInputDto {
  @ApiProperty({ description: 'Height in cm or inches', example: 175 })
  @IsNumber()
  @Min(120)
  @Max(250)
  height: number;

  @ApiPropertyOptional({ description: 'Weight in kg or lbs', example: 70 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  weight?: number;

  @ApiPropertyOptional({ description: 'Shoulder width in cm or inches', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(70)
  shoulderWidth?: number;

  @ApiPropertyOptional({ description: 'Chest circumference in cm or inches', example: 95 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(180)
  chestCircumference?: number;

  @ApiPropertyOptional({ description: 'Bust circumference in cm or inches', example: 92 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(180)
  bustCircumference?: number;

  @ApiPropertyOptional({ description: 'Waist circumference in cm or inches', example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(200)
  waistCircumference?: number;

  @ApiPropertyOptional({ description: 'Hip circumference in cm or inches', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(60)
  @Max(200)
  hipCircumference?: number;

  @ApiPropertyOptional({ description: 'Arm length in cm or inches', example: 60 })
  @IsOptional()
  @IsNumber()
  armLength?: number;

  @ApiPropertyOptional({ description: 'Bicep circumference in cm or inches', example: 30 })
  @IsOptional()
  @IsNumber()
  bicepCircumference?: number;

  @ApiPropertyOptional({ description: 'Inseam length in cm or inches', example: 80 })
  @IsOptional()
  @IsNumber()
  inseamLength?: number;

  @ApiPropertyOptional({ description: 'Thigh circumference in cm or inches', example: 55 })
  @IsOptional()
  @IsNumber()
  thighCircumference?: number;

  @ApiPropertyOptional({ description: 'Calf circumference in cm or inches', example: 35 })
  @IsOptional()
  @IsNumber()
  calfCircumference?: number;

  @ApiPropertyOptional({ description: 'Neck circumference in cm or inches', example: 38 })
  @IsOptional()
  @IsNumber()
  neckCircumference?: number;
}

export class CreateAvatarFromMeasurementsDto {
  @ApiProperty({ description: 'Avatar name', example: 'My Avatar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Body measurements', type: MeasurementInputDto })
  @ValidateNested()
  @Type(() => MeasurementInputDto)
  measurements: MeasurementInputDto;

  @ApiPropertyOptional({
    description: 'Unit system',
    enum: ['metric', 'imperial'],
    default: 'metric',
  })
  @IsEnum(['metric', 'imperial'])
  @IsOptional()
  unit?: 'metric' | 'imperial';

  @ApiPropertyOptional({
    description: 'Gender',
    enum: ['male', 'female', 'unisex'],
    default: 'unisex',
  })
  @IsEnum(['male', 'female', 'unisex'])
  @IsOptional()
  gender?: 'male' | 'female' | 'unisex';

  @ApiPropertyOptional({
    description: 'Avatar customization options',
    example: {
      skinTone: '#F5D7B1',
      hairColor: '#4A3728',
      hairStyle: 'short',
    },
  })
  @IsOptional()
  @IsObject()
  customization?: {
    skinTone?: string;
    hairColor?: string;
    hairStyle?: string;
    faceShape?: string;
    [key: string]: any;
  };
}
