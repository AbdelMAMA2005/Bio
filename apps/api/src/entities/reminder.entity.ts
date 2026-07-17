import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Collection } from './collection.entity';

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column('uuid')
  collectionId!: string;

  @ManyToOne(() => User, (utilisateur) => utilisateur.rappelsUtilisateur, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  utilisateur!: User;

  @ManyToOne(() => Collection, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collectionId' })
  collection!: Collection;

  @Column()
  typeRappel!: string;

  @Column({ type: 'timestamp' })
  datePlanification!: Date;

  @Column({ default: false })
  estNotifie!: boolean;
}