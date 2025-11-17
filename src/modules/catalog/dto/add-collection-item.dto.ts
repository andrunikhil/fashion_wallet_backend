import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class AddCollectionItemDto {
  @ApiProperty({ description: 'Catalog item ID to add', example: 'uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  catalogItemId: string;

  @ApiPropertyOptional({
    description: 'Order index for the item in collection (optional, auto-increments if not provided)',
    example: 1,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
