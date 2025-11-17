import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Collection } from './collection.entity';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'collection_items' })
export class CollectionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Collection, (collection) => collection.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'collection_id' })
  collection: Collection;

  @Column({ type: 'uuid', name: 'collection_id' })
  collectionId: string;

  @ManyToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'catalog_item_id' })
  catalogItem: CatalogItem;

  @Column({ type: 'uuid', name: 'catalog_item_id' })
  catalogItemId: string;

  @Column({ type: 'int', default: 0, name: 'order_index' })
  orderIndex: number;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
