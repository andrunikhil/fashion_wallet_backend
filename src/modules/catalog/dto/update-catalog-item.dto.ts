import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCatalogItemDto } from './create-catalog-item.dto';

// Update DTO excludes the 'type' field as it should not be changed after creation
export class UpdateCatalogItemDto extends PartialType(
  OmitType(CreateCatalogItemDto, ['type'] as const)
) {}
