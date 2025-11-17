import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  TableInheritance,
} from 'typeorm';
import { BrandPartner } from './brand-partner.entity';

@Entity({ schema: 'catalog', name: 'items' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class CatalogItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'silhouette' | 'fabric' | 'pattern' | 'element';

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Categorization
  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory?: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  // Files
  @Column({ type: 'text', nullable: true, name: 'model_url' })
  modelUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'thumbnail_url' })
  thumbnailUrl?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'preview_images', default: [] })
  previewImages?: any[];

  // Type-specific properties (flexible JSONB field)
  @Column({ type: 'jsonb', default: {} })
  properties: Record<string, any>;

  // Metadata
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'designer_name' })
  designerName?: string;

  @ManyToOne(() => BrandPartner, { nullable: true })
  @JoinColumn({ name: 'brand_partner_id' })
  brandPartner?: BrandPartner;

  @Column({ type: 'uuid', nullable: true, name: 'brand_partner_id' })
  brandPartnerId?: string;

  @Column({ type: 'boolean', default: false, name: 'is_exclusive' })
  isExclusive: boolean;

  @Column({ type: 'date', nullable: true, name: 'release_date' })
  releaseDate?: Date;

  // Availability
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'required_tier' })
  requiredTier?: string;

  // Analytics
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'popularity_score' })
  popularityScore: number;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount: number;

  @Column({ type: 'int', default: 0, name: 'use_count' })
  useCount: number;

  @Column({ type: 'int', default: 0, name: 'favorite_count' })
  favoriteCount: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
