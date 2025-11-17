import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'item_analytics' })
export class ItemAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'catalog_item_id' })
  catalogItem: CatalogItem;

  @Column({ type: 'uuid', name: 'catalog_item_id' })
  catalogItemId: string;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: 'view' | 'use' | 'favorite' | 'search';

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId?: string;

  @Column({ type: 'jsonb', default: {}, nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
