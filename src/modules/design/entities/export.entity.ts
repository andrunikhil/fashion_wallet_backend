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

@Entity({ schema: 'design', name: 'exports' })
@Index('idx_exports_design', ['designId', 'createdAt'])
@Index('idx_exports_user', ['userId', 'createdAt'])
@Index('idx_exports_status', ['status'], { where: "status IN ('queued', 'processing')" })
export class Export {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'uuid' })
  designId: string;

  @ManyToOne(() => Design, (design) => design.exports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'image' | 'video' | 'model' | 'techpack';

  @Column({ type: 'varchar', length: 20, nullable: true })
  format: string;

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, any>;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status: 'queued' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'integer', default: 0 })
  progress: number;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'retry_count', type: 'integer', default: 0 })
  retryCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;
}
