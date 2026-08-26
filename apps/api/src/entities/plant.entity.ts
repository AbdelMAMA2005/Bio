import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Collection } from './collection.entity';
import { ToxicityLevel } from './enums/toxicity-level.enum';

@Entity('plants')
export class Plant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  nomScientifique!: string;

  @Column({ type: 'varchar' })
  nomCommun!: string;

  @Column({ type: 'text', nullable: true })
  famille!: string | null;

  @Column({
    type: 'enum',
    enum: ToxicityLevel,
    default: ToxicityLevel.GREEN,
  })
  toxicite!: ToxicityLevel;

  @Column({ type: 'text', nullable: true })
  aPropos!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  conseilsEntretien!: {
    lumiere?: string;
    sol?: string;
    arrosage?: string;
    multiplication?: string;
  } | null;

  @Column({ type: 'text', nullable: true })
  urlImage!: string | null;

  @Column({ type: 'text', nullable: true })
  badgeRarete!: string | null;

  /**
   * Intervalle d'arrosage en jours, dérivé de `watering.min`/`max` Plant.id (voir
   * common/watering.ts#wateringIntervalDays) — `null` si jamais calculé (espèce du
   * seed, ou identifiée avant l'ajout de ce champ) : CollectionService retombe alors
   * sur DEFAULT_WATERING_INTERVAL_DAYS pour calculer prochainArrosage.
   */
  @Column({ type: 'int', nullable: true })
  frequenceArrosageJours!: number | null;

  @OneToMany(() => Collection, (collection) => collection.plante)
  collectionsPlante!: Collection[];
}
