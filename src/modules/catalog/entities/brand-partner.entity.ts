import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'brand_partners' })
export class BrandPartner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true, name: 'logo_url' })
  logoUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'website_url' })
  websiteUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'contact_email' })
  contactEmail?: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'partnership_type' })
  partnershipType?: 'exclusive' | 'featured' | 'standard';

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'commission_rate' })
  commissionRate?: number;

  @OneToMany(() => CatalogItem, (item) => item.brandPartner)
  catalogItems?: CatalogItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
