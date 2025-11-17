import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { BrandPartner } from '../entities/brand-partner.entity';

@Injectable()
export class BrandPartnerRepository extends Repository<BrandPartner> {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    super(BrandPartner, dataSource.createEntityManager());
  }

  async findById(id: string): Promise<BrandPartner | null> {
    return this.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async findActive(): Promise<BrandPartner[]> {
    return this.find({
      where: {
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findByPartnershipType(
    type: 'exclusive' | 'featured' | 'standard',
  ): Promise<BrandPartner[]> {
    return this.find({
      where: {
        partnershipType: type,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async findByIdWithItems(id: string): Promise<BrandPartner | null> {
    return this.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['catalogItems'],
    });
  }
}
