import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Collection } from './collection.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';

@Entity('posts')
@Index(['userId'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid', { nullable: true })
  collectionId!: string | null;

  @ManyToOne(() => User, (utilisateur) => utilisateur.publicationsUtilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @ManyToOne(() => Collection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collectionId' })
  collection!: Collection | null;

  @Column({ type: 'text' })
  contenuTexte!: string;

  @Column({ type: 'text', nullable: true })
  urlImage!: string | null;


  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;

  @OneToMany(() => Comment, (commentaire) => commentaire.publication)
  commentaires!: Comment[];

  @OneToMany(() => Like, (jaime) => jaime.publication)
  jaimes!: Like[];
}