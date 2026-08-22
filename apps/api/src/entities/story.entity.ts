import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { StoryMediaType } from './enums/story-media-type.enum';

/**
 * Un média de story éphémère (une photo ou une vidéo). Comportement "statuts WhatsApp" :
 * plusieurs médias actifs du même `userId` se regroupent en UNE bulle côté API
 * (StoriesService#getGroupedStories fait le regroupement à la lecture, pas de table de
 * groupe dédiée — chaque média garde sa propre expiration +24h indépendante, comme sur
 * WhatsApp où les statuts d'un même jour n'expirent pas tous en même temps).
 * `dateExpiration` est fixée à la création (StoriesService#createStoryMedia) — GET /stories
 * ne renvoie jamais un média dont `dateExpiration` est dépassée.
 */
@Entity('stories')
@Index(['userId'])
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, (utilisateur) => utilisateur.storiesUtilisateur, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @Column({ type: 'text' })
  urlMedia!: string;

  @Column({ type: 'enum', enum: StoryMediaType, default: StoryMediaType.IMAGE })
  mediaType!: StoryMediaType;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;

  @Column({ type: 'timestamp' })
  dateExpiration!: Date;
}
