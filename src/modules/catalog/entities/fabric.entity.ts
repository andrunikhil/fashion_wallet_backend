import { Entity, Column, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';
import { CatalogItem } from './catalog-item.entity';

@Entity({ schema: 'catalog', name: 'fabrics' })
export class Fabric {
  @PrimaryColumn('uuid')
  id: string;

  @OneToOne(() => CatalogItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id' })
  catalogItem: CatalogItem;

  @Column({ type: 'varchar', length: 100, name: 'material_type' })
  materialType: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'texture_type' })
  textureType?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'weave_pattern' })
  weavePattern?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  weight?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  opacity?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sheen?: string;

  @Column({ type: 'boolean', default: false, name: 'has_pbr_textures' })
  hasPbrTextures: boolean;

  @Column({ type: 'text', nullable: true, name: 'diffuse_map_url' })
  diffuseMapUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'normal_map_url' })
  normalMapUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'roughness_map_url' })
  roughnessMapUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'metallic_map_url' })
  metallicMapUrl?: string;

  @Column({ type: 'text', nullable: true, name: 'ao_map_url' })
  aoMapUrl?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'texture_resolution' })
  textureResolution?: string;

  @Column({ type: 'boolean', default: false })
  seamless: boolean;
}
