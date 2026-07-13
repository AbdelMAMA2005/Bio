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

  @Column({ nullable: true })
  famille!: string;

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
  };

  @Column({ nullable: true })
  urlImage!: string;

  @Column({ nullable: true })
  badgeRarete!: string;

  @OneToMany(() => Collection, (collection) => collection.plante)
  collectionsPlante!: Collection[];
}