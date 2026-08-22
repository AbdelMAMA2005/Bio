import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Post } from './posts.entity';
import { User } from './user.entity';

@Entity('comments')
@Index(['postId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  postId!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => Post, (publication) => publication.commentaires, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'postId' })
  publication!: Post;

  @ManyToOne(() => User, (utilisateur) => utilisateur.commentairesUtilisateur, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @Column({ type: 'text' })
  contenu!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;
}
