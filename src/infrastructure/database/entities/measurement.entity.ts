import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Avatar } from './avatar.entity';

export enum MeasurementUnit {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

export enum MeasurementSource {
  AUTO = 'auto',
  MANUAL = 'manual',
  IMPORTED = 'imported',
}

@Entity({ schema: 'avatar', name: 'measurements' })
@Index(['avatarId'])
export class Measurement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'avatar_id', type: 'uuid', unique: true })
  @Index()
  avatarId: string;

  @OneToOne(() => Avatar)
  @JoinColumn({ name: 'avatar_id' })
  avatar: Avatar;

  // Height in cm (metric) or inches (imperial)
  @Column({ type: 'decimal', precision: 6, scale: 2 })
  height: number;

  // Weight in kg (metric) or lbs (imperial)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  weight: number | null;

  // Shoulder measurements
  @Column({ name: 'shoulder_width', type: 'decimal', precision: 6, scale: 2, nullable: true })
  shoulderWidth: number | null;

  // Chest/Bust measurements
  @Column({ name: 'chest_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  chestCircumference: number | null;

  @Column({ name: 'bust_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  bustCircumference: number | null;

  @Column({ name: 'under_bust_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  underBustCircumference: number | null;

  // Waist measurements
  @Column({ name: 'waist_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  waistCircumference: number | null;

  @Column({ name: 'natural_waist_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  naturalWaistCircumference: number | null;

  // Hip measurements
  @Column({ name: 'hip_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  hipCircumference: number | null;

  @Column({ name: 'high_hip_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  highHipCircumference: number | null;

  // Arm measurements
  @Column({ name: 'arm_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  armLength: number | null;

  @Column({ name: 'bicep_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  bicepCircumference: number | null;

  @Column({ name: 'wrist_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  wristCircumference: number | null;

  // Leg measurements
  @Column({ name: 'inseam_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  inseamLength: number | null;

  @Column({ name: 'outseam_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  outseamLength: number | null;

  @Column({ name: 'thigh_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  thighCircumference: number | null;

  @Column({ name: 'knee_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  kneeCircumference: number | null;

  @Column({ name: 'calf_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  calfCircumference: number | null;

  @Column({ name: 'ankle_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  ankleCircumference: number | null;

  // Torso measurements
  @Column({ name: 'neck_circumference', type: 'decimal', precision: 6, scale: 2, nullable: true })
  neckCircumference: number | null;

  @Column({ name: 'torso_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  torsoLength: number | null;

  @Column({ name: 'back_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  backLength: number | null;

  // Foot measurements
  @Column({ name: 'foot_length', type: 'decimal', precision: 6, scale: 2, nullable: true })
  footLength: number | null;

  @Column({ name: 'foot_width', type: 'decimal', precision: 6, scale: 2, nullable: true })
  footWidth: number | null;

  // Unit system
  @Column({
    type: 'enum',
    enum: MeasurementUnit,
    default: MeasurementUnit.METRIC,
  })
  unit: MeasurementUnit;

  // Source
  @Column({
    type: 'enum',
    enum: MeasurementSource,
    default: MeasurementSource.AUTO,
  })
  source: MeasurementSource;

  // Confidence score for auto-detected measurements (0-1)
  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  confidenceScore: number | null;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    landmarks?: any[];
    detectionMethod?: string;
    calibrationData?: any;
    [key: string]: any;
  } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
