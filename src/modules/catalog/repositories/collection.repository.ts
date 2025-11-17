import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, IsNull } from 'typeorm';
import { Collection } from '../entities/collection.entity';

@Injectable()
export class CollectionRepository extends Repository<Collection> {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    super(Collection, dataSource.createEntityManager());
  }

  async findByIdWithItems(id: string): Promise<Collection | null> {
    return this.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items', 'items.catalogItem', 'items.catalogItem.brandPartner'],
      order: {
        items: {
          orderIndex: 'ASC',
        },
      },
    });
  }

  async findFeatured(limit: number = 10): Promise<Collection[]> {
    return this.find({
      where: {
        isFeatured: true,
        isPublic: true,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async findPublic(
    page: number = 1,
    limit: number = 24,
  ): Promise<{ collections: Collection[]; total: number }> {
    const [collections, total] = await this.findAndCount({
      where: {
        isPublic: true,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { collections, total };
  }

  async findByCurator(
    curatorId: string,
    page: number = 1,
    limit: number = 24,
  ): Promise<{ collections: Collection[]; total: number }> {
    const [collections, total] = await this.findAndCount({
      where: {
        curatorId,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { collections, total };
  }
}
