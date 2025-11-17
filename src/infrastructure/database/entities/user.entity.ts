import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { IsEmail, MinLength, MaxLength, IsBoolean } from 'class-validator';

@Entity({ schema: 'shared', name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @IsEmail()
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  @MinLength(60)
  @MaxLength(60)
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @Column({ length: 50, default: 'user' })
  role: string;

  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @Column({ name: 'email_verified', default: false })
  @IsBoolean()
  emailVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: User;
}
