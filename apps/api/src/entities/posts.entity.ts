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

  @ManyToOne(() => User, (utilisateur) => utilisateur.publicationsUtilisateur, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @ManyToOne(() => Collection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collectionId' })
  collection!: Collection | null;

  @Column({ type: 'text' })
  contenuTexte!: string;

  @Column({ type: 'text', nullable: true })
  urlImage!: string | null;

  // Hérité de la collection taguée (si elle a un Geo-Tag) au moment de la
  // publication — permet le filtre "Près de moi" (cahier des charges §3.3)
  // sans qu'un post seul n'ait de mécanisme de géolocalisation propre.
  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;

  @OneToMany(() => Comment, (commentaire) => commentaire.publication)
  commentaires!: Comment[];

  @OneToMany(() => Like, (jaime) => jaime.publication)
  jaimes!: Like[];
}
