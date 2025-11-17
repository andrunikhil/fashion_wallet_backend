import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Design } from './design.entity';

export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
}

export interface LightingSettings {
  preset: string;
}

export interface BackgroundSettings {
  type: string;
  value: string;
}

@Entity({ schema: 'design', name: 'canvas_settings' })
export class CanvasSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'uuid', unique: true })
  designId: string;

  @OneToOne(() => Design, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({
    type: 'jsonb',
    default: {
      position: { x: 0, y: 1.6, z: 3 },
      target: { x: 0, y: 1, z: 0 },
      fov: 50,
    },
  })
  camera: CameraSettings;

  @Column({
    type: 'jsonb',
    default: {
      preset: 'studio',
    },
  })
  lighting: LightingSettings;

  @Column({
    type: 'jsonb',
    default: {
      type: 'color',
      value: '#f0f0f0',
    },
  })
  background: BackgroundSettings;

  @Column({ name: 'show_grid', type: 'boolean', default: false })
  showGrid: boolean;

  @Column({ name: 'show_guides', type: 'boolean', default: false })
  showGuides: boolean;

  @Column({ name: 'snap_to_grid', type: 'boolean', default: false })
  snapToGrid: boolean;

  @Column({ name: 'grid_size', type: 'decimal', precision: 10, scale: 2, default: 10 })
  gridSize: number;

  @Column({
    name: 'render_quality',
    type: 'varchar',
    length: 20,
    default: 'standard',
  })
  renderQuality: string;

  @Column({ type: 'boolean', default: true })
  antialiasing: boolean;

  @Column({ type: 'boolean', default: true })
  shadows: boolean;

  @Column({ name: 'ambient_occlusion', type: 'boolean', default: false })
  ambientOcclusion: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
