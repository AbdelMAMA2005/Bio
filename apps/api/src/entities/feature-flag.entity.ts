import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Bascule fonctionnelle activable "à chaud" depuis la console admin, sans redéploiement —
 * lue par le back (voir FeatureFlagsService#isEnabled) partout où une fonctionnalité doit
 * pouvoir être coupée en urgence (ex: modération automatique). Graine au premier démarrage
 * (voir seed.ts) avec les 4 flags du cahier des charges.
 */
@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryColumn()
  cle!: string;

  @Column()
  libelle!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ default: false })
  actif!: boolean;
}
