import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reminder } from '../../entities/reminder.entity';
import { Collection } from '../../entities/collection.entity';
import { CreateReminderDto, UpdateReminderDto, ReminderFilterDto, ReminderResponseDto } from '../../dto';

@Injectable()
export class RemindersService {
  constructor(
    @InjectRepository(Reminder)
    private readonly reminderRepo: Repository<Reminder>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
  ) {}

  private mapToDto(reminder: Reminder): ReminderResponseDto {
    return {
      id: reminder.id,
      userId: reminder.userId,
      collectionId: reminder.collectionId,
      typeRappel: reminder.typeRappel,
      datePlanification: reminder.datePlanification,
      estNotifie: reminder.estNotifie,
    };
  }

  async create(userId: string, dto: CreateReminderDto): Promise<ReminderResponseDto> {
    const collection = await this.collectionRepo.findOne({
      where: { id: dto.collectionId, userId },
    });
    if (!collection) {
      throw new NotFoundException('Collection non trouvée ou ne vous appartient pas');
    }

    const reminder = this.reminderRepo.create({
      userId,
      collectionId: dto.collectionId,
      typeRappel: dto.typeRappel,
      datePlanification: dto.datePlanification,
      estNotifie: false,
    });

    const saved = await this.reminderRepo.save(reminder);
    return this.mapToDto(saved);
  }

  async findAll(userId: string, filter: ReminderFilterDto): Promise<{ items: ReminderResponseDto[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.reminderRepo.createQueryBuilder('r')
      .where('r.userId = :userId', { userId });

    if (filter.estNotifie !== undefined) {
      const isNotifiedBool = filter.estNotifie === 'true';
      qb.andWhere('r.estNotifie = :estNotifie', { estNotifie: isNotifiedBool });
    }

    qb.orderBy('r.datePlanification', 'ASC');
    qb.skip(skip);
    qb.take(limit);

    const [reminders, total] = await qb.getManyAndCount();
    return {
      items: reminders.map(r => this.mapToDto(r)),
      total,
    };
  }

  async update(userId: string, id: string, dto: UpdateReminderDto): Promise<ReminderResponseDto> {
    const reminder = await this.reminderRepo.findOne({
      where: { id, userId },
    });
    if (!reminder) {
      throw new NotFoundException('Rappel non trouvé ou ne vous appartient pas');
    }

    if (dto.typeRappel !== undefined) {
      reminder.typeRappel = dto.typeRappel;
    }
    if (dto.datePlanification !== undefined) {
      reminder.datePlanification = dto.datePlanification;
    }

    const saved = await this.reminderRepo.save(reminder);
    return this.mapToDto(saved);
  }

  async delete(userId: string, id: string): Promise<void> {
    const reminder = await this.reminderRepo.findOne({
      where: { id, userId },
    });
    if (!reminder) {
      throw new NotFoundException('Rappel non trouvé ou ne vous appartient pas');
    }
    await this.reminderRepo.remove(reminder);
  }

  async notify(userId: string, id: string): Promise<ReminderResponseDto> {
    const reminder = await this.reminderRepo.findOne({
      where: { id, userId },
    });
    if (!reminder) {
      throw new NotFoundException('Rappel non trouvé ou ne vous appartient pas');
    }

    reminder.estNotifie = true;
    const saved = await this.reminderRepo.save(reminder);
    return this.mapToDto(saved);
  }
}