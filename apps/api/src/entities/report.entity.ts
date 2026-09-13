import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type ReportTargetType = 'post' | 'story' | 'comment';

/**
 * Un signalement d'un contenu (publication, story ou commentaire) — voir modules/admin
 * (file de modération). Plusieurs lignes peuvent viser la même cible (`targetType` +
 * `targetId`) : chaque signalement séparé compte pour "N signalements" dans la console,
 * pas de déduplication par utilisateur (un même contenu peut être signalé plusieurs fois
 * par le même auteur pour des motifs différents).
 * `extrait`/`auteurCible`/`typeLabel` sont un instantané au moment du signalement — un
 * commentaire ou une story supprimée entre-temps par son auteur (hors modération) ne fait
 * jamais disparaître le signalement, la fiche reste lisible dans la file.
 */
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  reporterId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  rapporteur!: User;

  @Column({ type: 'enum', enum: ['post', 'story', 'comment'] })
  targetType!: ReportTargetType;

  @Column('uuid')
  targetId!: string;

  /** Auteur du contenu signalé — snapshot du pseudo au moment du signalement. */
  @Column()
  auteurCible!: string;

  @Column()
  motif!: string;

  @Column({ type: 'text' })
  extrait!: string;

  @Column({
    default: 'ouvert',
    type: 'enum',
    enum: ['ouvert', 'ignore', 'supprime'],
  })
  statut!: 'ouvert' | 'ignore' | 'supprime';

  @CreateDateColumn()
  dateCreation!: Date;

  @Column({ type: 'timestamp', nullable: true })
  dateTraitement!: Date | null;
}
