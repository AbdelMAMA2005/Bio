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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  motDePasseHache!: string;

  @Column({ unique: true })
  nomUtilisateur!: string;

  @Column({ default: 0 })
  experience!: number;

  @Column({ default: 0 })
  pieces!: number;

  @Column({ default: false })
  estAdmin!: boolean;

  @Column({ default: 1 })
  niveau!: number;

  @Column({ type: 'text', nullable: true })
  urlAvatar!: string | null;

  @Column({ type: 'jsonb', default: [] })
  insignes!: string[];

  /**
   * Point de référence "chez vous" pour le défi Exploration (voir QuestsService) :
   * coordonnées de la toute première capture géo-taguée de cet utilisateur, figées à ce
   * moment-là (jamais recalculées ensuite, même si l'utilisateur déménage) — pas de champ
   * dédié "domicile" dans le cahier des charges, donc pas de saisie manuelle demandée.
   */
  @Column({ type: 'double precision', nullable: true })
  latitudeReference!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitudeReference!: number | null;

  @DeleteDateColumn({ nullable: true })
  dateSuppression!: Date | null;

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
}
