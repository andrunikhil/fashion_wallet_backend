import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Avatar } from './avatar.entity';

export enum PhotoType {
  FRONT = 'front',
  SIDE = 'side',
  BACK = 'back',
  ANGLED = 'angled',
  CUSTOM = 'custom',
}

export enum PhotoStatus {
  UPLOADED = 'uploaded',
  VALIDATED = 'validated',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Entity({ schema: 'avatar', name: 'photos' })
@Index(['avatarId', 'type'])
@Index(['status'])
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'avatar_id', type: 'uuid' })
  @Index()
  avatarId: string;

  @ManyToOne(() => Avatar)
  @JoinColumn({ name: 'avatar_id' })
  avatar: Avatar;

  @Column({
    type: 'enum',
    enum: PhotoType,
  })
  type: PhotoType;

  @Column({
    type: 'enum',
    enum: PhotoStatus,
    default: PhotoStatus.UPLOADED,
  })
  status: PhotoStatus;

  // S3 storage information
  @Column({ name: 'original_url', length: 512 })
  originalUrl: string;

  @Column({ name: 'original_s3_key', length: 512 })
  originalS3Key: string;

  @Column({ name: 'processed_url', length: 512, nullable: true })
  processedUrl: string | null;

  @Column({ name: 'processed_s3_key', length: 512, nullable: true })
  processedS3Key: string | null;

  @Column({ name: 'thumbnail_url', length: 512, nullable: true })
  thumbnailUrl: string | null;

  // File information
  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  // Image dimensions
  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  // Processing information
  @Column({ name: 'has_background_removed', default: false })
  hasBackgroundRemoved: boolean;

  @Column({ name: 'background_mask_url', length: 512, nullable: true })
  backgroundMaskUrl: string | null;

  @Column({ name: 'quality_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  qualityScore: number | null;

  @Column({ name: 'pose_detected', default: false })
  poseDetected: boolean;

  @Column({ name: 'landmarks_detected', default: false })
  landmarksDetected: boolean;

  // EXIF data (sanitized)
  @Column({ type: 'jsonb', nullable: true })
  exifData: {
    orientation?: number;
    make?: string;
    model?: string;
    dateTime?: string;
    [key: string]: any;
  } | null;

  // Validation results
  @Column({ type: 'jsonb', nullable: true })
  validation: {
    isValid?: boolean;
    errors?: string[];
    warnings?: string[];
    checks?: {
      resolution?: boolean;
      format?: boolean;
      fileSize?: boolean;
      aspectRatio?: boolean;
      lighting?: boolean;
      blur?: boolean;
    };
  } | null;

  // Processing metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    uploadedFrom?: string;
    processingDuration?: number;
    mlModelVersion?: string;
    landmarks?: any[];
    [key: string]: any;
  } | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
