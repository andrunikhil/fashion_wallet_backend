import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'user_favorites' })
export class UserFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'catalog_item_id' })
  catalogItem: CatalogItem;

  @Column({ type: 'uuid', name: 'catalog_item_id' })
  catalogItemId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
