import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Story } from './story.entity';
import { User } from './user.entity';

/**
 * Un like sur un média de story (bouton cœur du visualiseur). Une seule ligne par
 * (storyId, userId) — StoriesService#toggleLike (Like)/(Unlike) selon qu'elle existe déjà,
 * même pattern que `Like` sur les publications du feed.
 */
@Entity('story_likes')
@Unique(['storyId', 'userId'])
export class StoryLike {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  storyId!: string;

  @ManyToOne(() => Story, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story!: Story;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;
}
