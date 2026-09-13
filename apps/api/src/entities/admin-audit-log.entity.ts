import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Journal d'audit des actions d'administration (qui, quoi, quand) — voir modules/admin,
 * écrit par AdminAuditService à chaque mutation effectuée via un endpoint /admin/*.
 * `cible`/`details` restent du texte libre lisible par un humain dans le journal
 * d'activité (jamais de donnée sensible : voir AdminAuditService#log), pas une structure
 * à réinterpréter côté front.
 */
@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  adminId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'adminId' })
  admin!: User;

  /** Snapshot du pseudo au moment de l'action — lisible même si le compte est supprimé depuis. */
  @Column()
  adminPseudo!: string;

  @Column()
  action!: string;

  @Column({ type: 'text', nullable: true })
  cible!: string | null;

  @CreateDateColumn()
  dateCreation!: Date;
}
