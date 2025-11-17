import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Design } from './design.entity';

export interface Transform {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

@Entity({ schema: 'design', name: 'layers' })
@Index('idx_layers_design_id', ['designId', 'orderIndex'])
@Index('idx_layers_catalog_item', ['catalogItemId'])
export class Layer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'uuid' })
  designId: string;

  @ManyToOne(() => Design, (design) => design.layers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ type: 'varchar', length: 50 })
  type: 'silhouette' | 'fabric' | 'pattern' | 'element' | 'accessory';

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  // Catalog item reference
  @Column({ name: 'catalog_item_id', type: 'uuid' })
  catalogItemId: string;

  @Column({ name: 'catalog_item_type', type: 'varchar', length: 50 })
  catalogItemType: string;

  // Transform (stored as JSONB)
  @Column({
    type: 'jsonb',
    default: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    },
  })
  transform: Transform;

  // Customization
  @Column({ type: 'jsonb', default: {} })
  customization: Record<string, any>;

  // Visibility
  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'is_locked', type: 'boolean', default: false })
  isLocked: boolean;

  // Blend mode
  @Column({
    name: 'blend_mode',
    type: 'varchar',
    length: 20,
    default: 'normal',
  })
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'add';

  @Column({ type: 'integer', default: 100 })
  opacity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
