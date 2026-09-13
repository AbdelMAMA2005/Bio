import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Défi éditable depuis la console admin — remplace `QUEST_CATALOG` (constante figée dans
 * le code, voir modules/quests/quest-catalog.ts) comme SOURCE DES DÉFINITIONS. La
 * PROGRESSION reste calculée en direct depuis les vraies tables (QuestsService, jamais
 * stockée ici) : cette entité ne porte que ce qu'un admin peut éditer (libellé,
 * récompenses, actif) — `QUEST_CATALOG` sert de graine au premier démarrage (voir
 * seed.ts) puis n'est plus lu une fois les lignes présentes en base.
 */
@Entity('quests')
export class Quest {
  @PrimaryColumn()
  id!: string;

  @Column()
  libelle!: string;

  @Column({
    type: 'enum',
    enum: ['quotidien', 'exploration'],
    default: 'quotidien',
  })
  type!: 'quotidien' | 'exploration';

  @Column()
  objectif!: number;

  @Column({ default: 0 })
  recompenseXp!: number;

  @Column({ default: 0 })
  recompensePieces!: number;

  /** Un défi désactivé n'est plus renvoyé par GET /quests/daily (voir QuestsService). */
  @Column({ default: true })
  actif!: boolean;
}
