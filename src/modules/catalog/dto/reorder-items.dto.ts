import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsArray, IsUUID, IsInt, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemOrderDto {
  @ApiProperty({ description: 'Catalog item ID', example: 'uuid-here' })
  @IsNotEmpty()
  @IsUUID()
  catalogItemId: string;

  @ApiProperty({ description: 'New order index', example: 0, minimum: 0 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderItemsDto {
  @ApiProperty({
    description: 'Array of items with new order indexes',
    type: [ItemOrderDto],
    example: [
      { catalogItemId: 'uuid-1', orderIndex: 0 },
      { catalogItemId: 'uuid-2', orderIndex: 1 },
      { catalogItemId: 'uuid-3', orderIndex: 2 }
    ]
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrderDto)
  items: ItemOrderDto[];
}
