import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

/**
 * Persiste, pour un utilisateur/défi/jour donné, si la récompense (XP + pièces)
 * a déjà été créditée — la PROGRESSION elle-même n'est jamais stockée ici, elle
 * est toujours recalculée en direct depuis les tables réelles (identification_logs,
 * collection, posts, likes) par QuestsService. Cette table ne sert donc qu'à éviter
 * de créditer deux fois la même récompense le même jour, pas à faire semblant
 * d'avoir une progression (voir QuestsService.getDailyQuests).
 */
@Entity('quest_progress')
@Unique(['userId', 'questId', 'date'])
export class QuestProgress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column()
  questId!: string;

  /** Date du jour concerné (YYYY-MM-DD, UTC), pas un timestamp. */
  @Column({ type: 'date' })
  date!: string;

  @Column({ default: false })
  recompenseCreditee!: boolean;
}
