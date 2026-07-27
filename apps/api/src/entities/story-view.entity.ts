import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Story } from './story.entity';
import { User } from './user.entity';

/**
 * Une vue d'un média de story par un utilisateur ("vu par" façon WhatsApp). Une seule ligne
 * par (storyId, viewerId) — StoriesService#recordView est idempotent, un second appel ne
 * duplique jamais la vue. L'auteur d'un média ne génère jamais de vue sur son propre contenu
 * (StoriesService#recordView ignore silencieusement ce cas).
 */
@Entity('story_views')
@Unique(['storyId', 'viewerId'])
export class StoryView {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  storyId!: string;

  @ManyToOne(() => Story, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story!: Story;

  @Column('uuid')
  viewerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viewerId' })
  viewer!: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateVue!: Date;
}
