import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * Trace chaque identification réussie (POST /identification) pour un utilisateur
 * donné. Sert de source de vérité réelle pour le défi quotidien "Scanner 3 plantes
 * différentes" (module quests) — sans ce log, il serait impossible de savoir
 * combien d'espèces distinctes un utilisateur a scannées aujourd'hui, puisqu'un
 * scan seul ne crée pas toujours une nouvelle ligne dans `plants` (espèce déjà
 * connue) ni dans `collection` (l'utilisateur n'a pas forcément ajouté la plante).
 */
@Entity('identification_logs')
@Index(['userId', 'dateCreation'])
export class IdentificationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  plantId!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreation!: Date;
}
