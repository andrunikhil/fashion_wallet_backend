import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'silhouettes' })
export class Silhouette {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  catalogItem: CatalogItem;

  @Column({ type: 'varchar', length: 100, name: 'garment_category' })
  garmentCategory: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'fit_type' })
  fitType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  length?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  neckline?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'sleeve_type' })
  sleeveType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'closure_type' })
  closureType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'mesh_complexity' })
  meshComplexity?: string;

  @Column({ type: 'int', nullable: true, name: 'polygon_count' })
  polygonCount?: number;

  @Column({ type: 'int', default: 3, name: 'lod_levels' })
  lodLevels: number;

  @Column({ type: 'boolean', default: false, name: 'animation_ready' })
  animationReady: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'rig_type' })
  rigType?: string;
}
