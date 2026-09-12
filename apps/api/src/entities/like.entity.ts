import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Post } from './posts.entity';
import { User } from './user.entity';

@Entity('likes')
@Unique(['postId', 'userId'])
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  postId!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => Post, (publication) => publication.jaimes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  publication!: Post;

  @ManyToOne(() => User, (utilisateur) => utilisateur.jaimesUtilisateur, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;
}
