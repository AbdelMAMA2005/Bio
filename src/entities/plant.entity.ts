import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Collection } from './collection.entity';
import { ToxicityLevel } from './enums/toxicity-level.enum';

@Entity('plants')
export class Plant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nomScientifique!: string;

  @Column()
  nomCommun!: string;

  @Column({ type: 'text', nullable: true })
  famille!: string | null;

  @Column({
    type: 'enum',
    enum: ToxicityLevel,
    default: ToxicityLevel.GREEN,
  })
  toxicite!: ToxicityLevel;

  @Column({ type: 'jsonb', nullable: true })
  conseilsEntretien!: {
    arrosage?: string;
    lumiere?: string;
    temperature?: string;
    rempotage?: string;
  } | null;

  @Column({ type: 'text', nullable: true })
  urlImage!: string | null;

  @Column({ type: 'text', nullable: true })
  badgeRarete!: string | null;

  @OneToMany(() => Collection, (collection) => collection.plante)
  collectionsPlante!: Collection[];
}