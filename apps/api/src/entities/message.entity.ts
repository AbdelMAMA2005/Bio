import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';
import { Story } from './story.entity';

/**
 * Un message privé au sein d'une `Conversation`. `storyId` est renseigné quand le message
 * vient d'une réponse à un statut/story (StoryViewer.tsx) : rattache le message au média
 * cité, pour que MessagesService puisse renvoyer un aperçu du statut au-dessus de la bulle
 * de message, comme sur WhatsApp/Instagram ("A répondu à votre story"). `onDelete: 'SET
 * NULL'` — un média de story qui disparaîtrait un jour ne doit jamais faire disparaître le
 * message lui-même, seulement son aperçu cité.
 */
@Entity('messages')
@Index(['conversationId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  conversationId!: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation!: Conversation;

  @Column('uuid')
  senderId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  expediteur!: User;

  @Column({ type: 'text' })
  contenu!: string;

  @Column('uuid', { nullable: true })
  storyId!: string | null;

  @ManyToOne(() => Story, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'storyId' })
  story!: Story | null;

  @Column({ default: false })
  lu!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateEnvoi!: Date;
}
