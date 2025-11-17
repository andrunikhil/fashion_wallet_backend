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

@Entity({ schema: 'design', name: 'collaborators' })
@Index('idx_collaborators_design_id', ['designId'])
@Index('idx_collaborators_user_id', ['userId'])
export class Collaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'design_id', type: 'uuid' })
  designId: string;

  @ManyToOne(() => Design, (design) => design.collaborators, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'design_id' })
  design: Design;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  role: 'viewer' | 'commenter' | 'editor' | 'owner';

  @CreateDateColumn({ name: 'added_at', type: 'timestamptz' })
  addedAt: Date;
}
