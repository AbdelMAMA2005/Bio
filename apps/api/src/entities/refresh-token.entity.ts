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
 * Un token opaque par session active (rotation à chaque `POST /auth/refresh`, voir
 * AuthService#refresh). Seul le hash SHA-256 du token est stocké — jamais le token en
 * clair, même côté serveur (même logique que `motDePasseHache`, mais pas besoin d'un
 * hash lent type argon2 ici : le token est déjà 256 bits d'entropie aléatoire, pas un
 * mot de passe choisi par un humain).
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', unique: true })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  dateExpiration!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  dateRevocation!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  dateCreation!: Date;
}
