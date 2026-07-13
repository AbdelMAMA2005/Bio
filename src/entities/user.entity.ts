import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn } from 'typeorm';
import { Collection } from './collection.entity';
import { Post } from './posts.entity';
import { Comment } from './comment.entity';
import { Like } from './like.entity';
import { Reminder } from './reminder.entity';

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

  @Column({ default: 1 })
  niveau!: number;

  @Column({ nullable: true })
  urlAvatar!: string;

  @Column({ type: 'jsonb', default: [] })
  insignes!: string[];

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
}