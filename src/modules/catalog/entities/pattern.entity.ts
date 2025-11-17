import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'patterns' })
export class Pattern {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  catalogItem: CatalogItem;

  @Column({ type: 'varchar', length: 100, name: 'pattern_type' })
  patternType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  style?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'repeat_type' })
  repeatType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  scale?: string;

  @Column({ type: 'jsonb', default: [], nullable: true })
  colors?: any[];

  @Column({ type: 'boolean', default: true, name: 'is_tileable' })
  isTileable: boolean;

  @Column({ type: 'int', nullable: true, name: 'tile_size_x' })
  tileSizeX?: number;

  @Column({ type: 'int', nullable: true, name: 'tile_size_y' })
  tileSizeY?: number;

  @Column({ type: 'text', nullable: true, name: 'pattern_url' })
  patternUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'mask_url' })
  maskUrl?: string;
}
