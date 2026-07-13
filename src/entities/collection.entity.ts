import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Plant } from './plant.entity';
import { PlantType } from './enums/plant-type.enum';
import { HealthStatus } from './enums/health-status.enum';

@Entity('collection')
@Index(['userId', 'plantId'])
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  plantId!: string;

  @ManyToOne(() => User, (utilisateur) => utilisateur.collectionsUtilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @ManyToOne(() => Plant, (plante) => plante.collectionsPlante, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plantId' })
  plante!: Plant;

  @Column({
    type: 'enum',
    enum: PlantType,
  })
  typeCollection!: PlantType;

  @Column({
    type: 'enum',
    enum: HealthStatus,
    default: HealthStatus.GOOD,
  })
  etatSante!: HealthStatus;

  @Column({ type: 'jsonb', default: [] })
  historiquePhotos!: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateAjout!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number;
}