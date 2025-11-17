import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { CollectionItem } from './collection-item.entity';

@Entity({ schema: 'catalog', name: 'collections' })
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true, name: 'cover_image_url' })
  coverImageUrl?: string;

  @Column({ type: 'boolean', default: true, name: 'is_public' })
  isPublic: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_curated' })
  isCurated: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'curator_id' })
  curatorId?: string;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @OneToMany(() => CollectionItem, (item) => item.collection)
  items?: CollectionItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}
