import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Avatar } from './avatar.entity';

export enum ProcessingJobType {
  PHOTO_PROCESSING = 'photo-processing',
  MODEL_GENERATION = 'model-generation',
  MODEL_REGENERATION = 'model-regeneration',
  MEASUREMENT_UPDATE = 'measurement-update',
}

export enum ProcessingJobStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum ProcessingJobPriority {
  LOW = 0,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

@Entity({ schema: 'avatar', name: 'processing_jobs' })
@Index(['avatarId', 'status'])
@Index(['status', 'createdAt'])
@Index(['jobType'])
export class ProcessingJob {
  @PrimaryColumn({ length: 255 })
  id: string; // BullMQ job ID

  @Column({ name: 'avatar_id', type: 'uuid' })
  @Index()
  avatarId: string;

  @ManyToOne(() => Avatar)
  @JoinColumn({ name: 'avatar_id' })
  avatar: Avatar;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    name: 'job_type',
    type: 'enum',
    enum: ProcessingJobType,
  })
  jobType: ProcessingJobType;

  @Column({
    type: 'enum',
    enum: ProcessingJobStatus,
    default: ProcessingJobStatus.PENDING,
  })
  status: ProcessingJobStatus;

  @Column({
    type: 'int',
    default: ProcessingJobPriority.NORMAL,
  })
  priority: number;

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'current_step', length: 255, nullable: true })
  currentStep: string | null;

  @Column({ name: 'total_steps', type: 'int', nullable: true })
  totalSteps: number | null;

  // Job input data
  @Column({ type: 'jsonb', nullable: true })
  inputData: {
    photoUrls?: string[];
    measurements?: any;
    customization?: any;
    options?: any;
    [key: string]: any;
  } | null;

  // Job output/result data
  @Column({ type: 'jsonb', nullable: true })
  resultData: {
    modelUrl?: string;
    measurements?: any;
    landmarks?: any;
    processingTime?: number;
    [key: string]: any;
  } | null;

  // Error tracking
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string | null;

  @Column({ name: 'error_code', length: 100, nullable: true })
  errorCode: string | null;

  // Retry information
  @Column({ name: 'attempt_number', type: 'int', default: 1 })
  attemptNumber: number;

  @Column({ name: 'max_attempts', type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ name: 'last_attempt_at', type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  // Timing information
  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date | null;

  // Processing duration in milliseconds
  @Column({ name: 'processing_duration_ms', type: 'int', nullable: true })
  processingDurationMs: number | null;

  // Queue information
  @Column({ name: 'queue_name', length: 100, default: 'avatar-processing' })
  queueName: string;

  @Column({ name: 'worker_id', length: 255, nullable: true })
  workerId: string | null;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    estimatedDuration?: number;
    resourceUsage?: any;
    mlModelVersion?: string;
    dependencies?: string[];
    [key: string]: any;
  } | null;

  // Cleanup flags
  @Column({ name: 'keep_on_complete', default: false })
  keepOnComplete: boolean;

  @Column({ name: 'remove_on_complete_after', type: 'int', nullable: true })
  removeOnCompleteAfter: number | null; // seconds

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
