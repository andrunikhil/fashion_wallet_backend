import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity({ schema: 'avatar', name: 'avatars' })
export class Avatar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ['male', 'female', 'unisex'],
    default: 'unisex',
  })
  gender: string;

  @Column({ type: 'jsonb' })
  measurements: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    shoulderWidth?: number;
  };

  @Column({ name: 'model_url', nullable: true })
  modelUrl: string | null;

  @Column({ name: 'thumbnail_url', nullable: true })
  thumbnailUrl: string | null;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
