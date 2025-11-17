import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CollectionItem } from '../entities/collection-item.entity';

@Injectable()
export class CollectionItemRepository extends Repository<CollectionItem> {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
  ) {
    super(CollectionItem, dataSource.createEntityManager());
  }

  async getMaxOrder(collectionId: string): Promise<number> {
    const result = await this.createQueryBuilder('item')
      .select('MAX(item.orderIndex)', 'maxOrder')
      .where('item.collectionId = :collectionId', { collectionId })
      .getRawOne();

    return result?.maxOrder ?? 0;
  }

  async findByCollectionId(collectionId: string): Promise<CollectionItem[]> {
    return this.find({
      where: { collectionId },
      relations: ['catalogItem', 'catalogItem.brandPartner'],
      order: {
        orderIndex: 'ASC',
      },
    });
  }

  async existsInCollection(
    collectionId: string,
    catalogItemId: string,
  ): Promise<boolean> {
    const count = await this.count({
      where: { collectionId, catalogItemId },
    });
    return count > 0;
  }

  async reorderItems(
    collectionId: string,
    itemOrders: Array<{ id: string; orderIndex: number }>,
  ): Promise<void> {
    await this.manager.transaction(async (transactionalEntityManager) => {
      for (const { id, orderIndex } of itemOrders) {
        await transactionalEntityManager.update(
          CollectionItem,
          { id, collectionId },
          { orderIndex },
        );
      }
    });
  }
}
