import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  DeleteDateColumn,
} from 'typeorm';
import { Collection } from './collection.entity';
import { Post } from './posts.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Reminder } from './reminder.entity';
import { Story } from './story.entity';
import { Follower } from './follower.entity';
import { Message } from './message.entity';
import { Notification } from './notification.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: '' })
  fullName!: string;

  @Column()
  motDePasseHache!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  username!: string | null;

  @Column({ default: 0 })
  experience!: number;

  @Column({ default: 0 })
  pieces!: number;

  @Column({ default: false })
  estAdmin!: boolean;

  @Column({ default: 1 })
  niveau!: number;

  @Column({ type: 'varchar', nullable: true })
  urlAvatar!: string;

  @Column({ type: 'jsonb', default: [] })
  insignes!: string[];

  @DeleteDateColumn({ nullable: true })
  dateSuppression!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  resetPasswordToken!: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date;

  @Column({ default: true })
  isPublicProfile!: boolean;

  @Column({ default: true })
  publicStories!: boolean;

  @Column({ type: 'varchar', nullable: true })
  pendingEmail!: string | null;

  @Column({ type: 'varchar', nullable: true })
  pendingEmailToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pendingEmailExpires!: Date | null;

  @OneToMany(() => Collection, (collection) => collection.utilisateur)
  collectionsUtilisateur!: Collection[];

  @OneToMany(() => Post, (post) => post.utilisateur)
  publicationsUtilisateur!: Post[];

  @OneToMany(() => Comment, (commentaire) => commentaire.utilisateur)
  commentairesUtilisateur!: Comment[];

  @OneToMany(() => Like, (jaime) => jaime.utilisateur)
  jaimesUtilisateur!: Like[];

  @OneToMany(() => Reminder, (rappel) => rappel.utilisateur)
  rappelsUtilisateur!: Reminder[];

  @OneToMany(() => Story, (story) => story.utilisateur)
  storiesUtilisateur!: Story[];

  @OneToMany(() => Follower, (follower) => follower.follower)
  followers!: Follower[];

  @OneToMany(() => Follower, (follower) => follower.following)
  following!: Follower[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages!: Message[];

  @OneToMany(() => Message, (message) => message.receiver)
  receivedMessages!: Message[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications!: Notification[];
}
