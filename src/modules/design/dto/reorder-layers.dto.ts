import { IsArray, IsUUID, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LayerOrderDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderLayersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LayerOrderDto)
  layers: LayerOrderDto[];
}
