import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  LIKE = 'LIKE',
  FOLLOW = 'FOLLOW',
  MESSAGE = 'MESSAGE',
  COMMENT = 'COMMENT',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column({ nullable: true, type: 'uuid' })
  triggerUserId?: string; // ID de l'utilisateur qui a déclenché la notification

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'triggerUserId' })
  triggerUser?: User;
}
