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

  /**
   * Résultat du dernier diagnostic de santé (POST /collection/:id/diagnosis), sain ou
   * malade — réécrit à chaque nouveau diagnostic (jamais d'historique multi-entrées : le
   * bouton "Voir le diagnostic" côté front n'a besoin que du plus récent, voir
   * DiagnosisService#diagnosePlantHealth et rapport.md).
   */
  @Column({ type: 'jsonb', nullable: true })
  dernierDiagnostic!: {
    maladieNom: string | null;
    scoreGlobal: number;
    traitement: { biologique?: string; chimique?: string; prevention?: string } | null;
    description: string | null;
    estSain: boolean;
    dateDiagnostic: string;
  } | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateAjout!: Date;

  /**
   * Dernier arrosage connu — initialisé à la date d'ajout (on suppose la plante
   * arrosée au moment où elle rejoint le Jardin), mis à jour par
   * `POST /collection/:id/water`. Sert de base au calcul de `prochainArrosage`
   * (voir CollectionService), jamais exposé tel quel côté front.
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  derniereArrosage!: Date;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;
}