import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('followers')
@Unique(['followerId', 'followingId'])
export class Follower {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  followerId!: string;

  @Column('uuid')
  followingId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followerId' })
  follower!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'followingId' })
  following!: User;

  @Column({ default: false })
  isApproved!: boolean; // Pour les profils privés
}
