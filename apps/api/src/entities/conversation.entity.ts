import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Conversation privée entre deux utilisateurs (messagerie façon WhatsApp/Instagram).
 * `user1Id`/`user2Id` sont toujours normalisés par ordre lexicographique dans
 * MessagesService#getOrCreateConversation (user1Id < user2Id) — une seule ligne possible
 * par paire d'utilisateurs quel que soit qui a engagé la conversation en premier, garanti
 * par la contrainte unique ci-dessous.
 */
@Entity('conversations')
@Unique(['user1Id', 'user2Id'])
@Index(['user1Id'])
@Index(['user2Id'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  user1Id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  utilisateur1!: User;

  @Column('uuid')
  user2Id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  utilisateur2!: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;

  /** Mis à jour à chaque nouveau message — sert au tri de la liste des conversations. */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateDernierMessage!: Date;
}
