import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'elements' })
export class Element {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  catalogItem: CatalogItem;

  @Column({ type: 'varchar', length: 100, name: 'element_type' })
  elementType: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  placement?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size?: string;

  @Column({ type: 'boolean', default: false, name: 'is_3d' })
  is3d: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_customizable' })
  isCustomizable: boolean;

  @Column({ type: 'boolean', default: false, name: 'color_customizable' })
  colorCustomizable: boolean;

  @Column({ type: 'boolean', default: false, name: 'size_customizable' })
  sizeCustomizable: boolean;

  @Column({ type: 'boolean', default: false, name: 'rotation_customizable' })
  rotationCustomizable: boolean;

  @Column({ type: 'text', nullable: true, name: 'model_url' })
  modelUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'icon_url' })
  iconUrl?: string;
}
