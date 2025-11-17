import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Design } from './design.entity';

@Entity({ schema: 'design', name: 'versions' })
@Index('idx_versions_design_id', ['designId', 'versionNumber'])
export class Version {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'uuid' })
  designId: string;

  @ManyToOne(() => Design, (design) => design.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber: number;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ name: 'snapshot_ref', type: 'varchar', length: 255, nullable: true })
  snapshotRef: string; // MongoDB reference

  @Column({ type: 'jsonb', nullable: true })
  diff: Record<string, any>;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
