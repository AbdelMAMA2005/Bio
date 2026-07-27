import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { Reminder } from '../../entities/reminder.entity';
import { Collection } from '../../entities/collection.entity';

describe('RemindersService', () => {
  let service: RemindersService;
  let reminderRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; remove: jest.Mock; createQueryBuilder: jest.Mock };
  let collectionRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    reminderRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (r) => ({ id: 'reminder-1', ...r })),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    collectionRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: getRepositoryToken(Reminder), useValue: reminderRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  describe('create', () => {
    it("lève NotFoundException si la collection n'appartient pas à l'utilisateur", async () => {
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-1', { collectionId: 'collection-1', typeRappel: 'arrosage', datePlanification: new Date() }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée le rappel avec estNotifie=false par défaut (J+5 par exemple)', async () => {
      collectionRepo.findOne.mockResolvedValue({ id: 'collection-1', userId: 'user-1' });
      const inCincDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const result = await service.create('user-1', {
        collectionId: 'collection-1',
        typeRappel: 'traitement',
        datePlanification: inCincDays,
      });

      expect(result.estNotifie).toBe(false);
      expect(result.typeRappel).toBe('traitement');
    });
  });

  describe('notify', () => {
    it("lève NotFoundException si le rappel n'appartient pas à l'utilisateur", async () => {
      reminderRepo.findOne.mockResolvedValue(null);
      await expect(service.notify('user-1', 'reminder-inconnu')).rejects.toThrow(NotFoundException);
    });

    it('marque estNotifie=true', async () => {
      const reminder = { id: 'reminder-1', userId: 'user-1', estNotifie: false };
      reminderRepo.findOne.mockResolvedValue(reminder);
      reminderRepo.save.mockResolvedValue({ ...reminder, estNotifie: true });

      const result = await service.notify('user-1', 'reminder-1');
      expect(result.estNotifie).toBe(true);
    });
  });

  describe('findAll', () => {
    it('filtre par estNotifie quand le paramètre est fourni', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      reminderRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('user-1', { estNotifie: 'false', page: 1, limit: 20 } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('r.estNotifie = :estNotifie', { estNotifie: false });
    });
  });
});
