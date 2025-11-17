import { PartialType } from '@nestjs/swagger';
import { CreateBrandPartnerDto } from './create-brand-partner.dto';

export class UpdateBrandPartnerDto extends PartialType(CreateBrandPartnerDto) {}
