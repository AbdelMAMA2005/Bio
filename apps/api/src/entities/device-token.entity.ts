import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

/**
 * Token Expo Push enregistré par un appareil (POST /notifications/device) — persistance
 * seule pour l'instant, aucun envoi serveur réel (voir API_CONTRACT.md §9) : les
 * notifications d'arrosage sont programmées localement côté mobile (expo-notifications).
 * Ce module prépare le terrain pour un futur envoi serveur sans devoir retoucher le
 * modèle de données ce jour-là.
 */
@Entity('device_tokens')
@Unique(['expoPushToken'])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column()
  expoPushToken!: string;

  @Column()
  plateforme!: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateEnregistrement!: Date;
}
