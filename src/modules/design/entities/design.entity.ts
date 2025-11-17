import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity({ schema: 'design', name: 'designs' })
@Index('idx_designs_user_id', ['userId'], { where: 'deleted_at IS NULL' })
@Index('idx_designs_status', ['status'], { where: 'deleted_at IS NULL' })
@Index('idx_designs_visibility', ['visibility'], { where: 'deleted_at IS NULL' })
@Index('idx_designs_created_at', ['createdAt'], { where: 'deleted_at IS NULL' })
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Avatar reference
  @Column({ name: 'avatar_id', type: 'uuid', nullable: true })
  avatarId: string;

  // Categorization
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: 'outfit' | 'top' | 'bottom' | 'dress' | 'outerwear' | 'full_collection';

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  occasion: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  season: string[];

  // Status
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: 'draft' | 'published' | 'archived';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'private',
  })
  visibility: 'private' | 'shared' | 'public';

  // Version control
  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'fork_from', type: 'uuid', nullable: true })
  forkFrom: string;

  @ManyToOne(() => Design, { nullable: true })
  @JoinColumn({ name: 'fork_from' })
  forkedFrom: Design;

  // Analytics
  @Column({ name: 'view_count', type: 'integer', default: 0 })
  viewCount: number;

  @Column({ name: 'like_count', type: 'integer', default: 0 })
  likeCount: number;

  @Column({ name: 'fork_count', type: 'integer', default: 0 })
  forkCount: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date;

  @Column({ name: 'last_edited_at', type: 'timestamptz', default: () => 'NOW()' })
  lastEditedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date;

  // Relations
  @OneToMany(() => import('./layer.entity').Layer, (layer) => layer.design)
  layers: import('./layer.entity').Layer[];

  @OneToMany(() => import('./version.entity').Version, (version) => version.design)
  versions: import('./version.entity').Version[];

  @OneToMany(() => import('./export.entity').Export, (exp) => exp.design)
  exports: import('./export.entity').Export[];

  @OneToMany(() => import('./collaborator.entity').Collaborator, (collab) => collab.design)
  collaborators: import('./collaborator.entity').Collaborator[];
}
