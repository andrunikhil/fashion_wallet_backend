import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum AvatarStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  PENDING = 'pending',
}

export enum AvatarSource {
  PHOTO_BASED = 'photo-based',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

export enum BodyType {
  RECTANGLE = 'rectangle',
  TRIANGLE = 'triangle',
  INVERTED_TRIANGLE = 'inverted-triangle',
  HOURGLASS = 'hourglass',
  OVAL = 'oval',
}

@Entity({ schema: 'avatar', name: 'avatars' })
@Index(['userId', 'deletedAt'])
@Index(['status'])
export class Avatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: AvatarStatus,
    default: AvatarStatus.PENDING,
  })
  status: AvatarStatus;

  @Column({
    type: 'enum',
    enum: AvatarSource,
    default: AvatarSource.PHOTO_BASED,
  })
  source: AvatarSource;

  @Column({
    name: 'body_type',
    type: 'enum',
    enum: BodyType,
    nullable: true,
  })
  bodyType: BodyType | null;

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'unisex'],
    default: 'unisex',
  })
  gender: string;

  @Column({ name: 'model_url', nullable: true, length: 512 })
  modelUrl: string | null;

  @Column({ name: 'model_format', nullable: true, length: 20 })
  modelFormat: string | null;

  @Column({ name: 'model_size_bytes', type: 'bigint', nullable: true })
  modelSizeBytes: number | null;

  @Column({ name: 'thumbnail_url', nullable: true, length: 512 })
  thumbnailUrl: string | null;

  @Column({ name: 'processing_progress', type: 'int', default: 0 })
  processingProgress: number;

  @Column({ name: 'processing_message', nullable: true, length: 500 })
  processingMessage: string | null;

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string | null;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidenceScore: number | null;

  @Column({ type: 'jsonb', nullable: true })
  customization: {
    skinTone?: string;
    hairColor?: string;
    hairStyle?: string;
    faceShape?: string;
    [key: string]: any;
  } | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    version?: string;
    mlModelVersion?: string;
    processingDuration?: number;
    [key: string]: any;
  } | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'last_viewed_at', type: 'timestamp', nullable: true })
  lastViewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
