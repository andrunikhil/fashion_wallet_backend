import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ schema: 'catalog', name: 'catalog_items' })
export class CatalogItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['silhouette', 'fabric', 'pattern'],
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['top', 'bottom', 'dress', 'outerwear', 'accessory', 'other'],
    nullable: true,
  })
  category: string | null;

  @Column({ type: 'jsonb', default: {} })
  properties: {
    color?: string;
    texture?: string;
    material?: string;
    patternType?: string;
    tags?: string[];
  };

  @Column({ name: 'asset_url', nullable: true })
  assetUrl: string | null;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
