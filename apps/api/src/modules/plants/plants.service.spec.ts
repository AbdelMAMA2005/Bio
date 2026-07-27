import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlantsService } from './plants.service';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';

describe('PlantsService', () => {
  let service: PlantsService;
  let plantRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let collectionRepo: { count: jest.Mock };

  beforeEach(async () => {
    plantRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (p) => ({ id: 'plant-1', ...p })),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    collectionRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantsService,
        { provide: getRepositoryToken(Plant), useValue: plantRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
  });

  describe('findAll', () => {
    it('applique les filtres nom/famille/toxicite et la pagination', async () => {
      const qb: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      plantRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({
        nom: 'Rosa',
        famille: 'Rosaceae',
        toxicite: 'red',
        page: 2,
        limit: 10,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(LOWER(p.nomScientifique) LIKE :nom OR LOWER(p.nomCommun) LIKE :nom)',
        { nom: '%rosa%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('LOWER(p.famille) = :famille', { famille: 'rosaceae' });
      expect(qb.andWhere).toHaveBeenCalledWith('p.toxicite = :toxicite', { toxicite: 'red' });
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe('findOne', () => {
    it('lève NotFoundException si la plante n\'existe pas', async () => {
      plantRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inconnu')).rejects.toThrow(NotFoundException);
    });

    it('retourne la plante mappée en DTO', async () => {
      plantRepo.findOne.mockResolvedValue({
        id: 'plant-1',
        nomScientifique: 'Rosa gallica',
        nomCommun: 'Rose de France',
        famille: 'Rosaceae',
        toxicite: 'red',
        urlImage: null,
        badgeRarete: 'Commun',
        conseilsEntretien: null,
      });

      const result = await service.findOne('plant-1');
      expect(result.nomScientifique).toBe('Rosa gallica');
    });
  });

  describe('create', () => {
    it('crée la plante avec les valeurs par défaut pour les champs optionnels', async () => {
      const result = await service.create({
        nomScientifique: 'Lavandula angustifolia',
        toxicite: 'green',
      } as any);

      expect(plantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nomScientifique: 'Lavandula angustifolia',
          nomCommun: '',
          famille: null,
          urlImage: null,
          badgeRarete: null,
          conseilsEntretien: null,
        }),
      );
      expect(result.nomScientifique).toBe('Lavandula angustifolia');
    });
  });

  describe('update', () => {
    it('lève NotFoundException si la plante n\'existe pas', async () => {
      plantRepo.findOne.mockResolvedValue(null);
      await expect(service.update('inconnu', { nomCommun: 'x' } as any)).rejects.toThrow(NotFoundException);
    });

    it('ne modifie que les champs fournis', async () => {
      const existing = {
        id: 'plant-1',
        nomScientifique: 'Rosa gallica',
        nomCommun: 'Rose de France',
        famille: 'Rosaceae',
        toxicite: 'red',
        urlImage: null,
        badgeRarete: 'Commun',
        conseilsEntretien: null,
      };
      plantRepo.findOne.mockResolvedValue(existing);
      plantRepo.save.mockImplementation(async (p) => p);

      const result = await service.update('plant-1', { nomCommun: 'Rose ancienne' } as any);

      expect(result.nomCommun).toBe('Rose ancienne');
      expect(result.nomScientifique).toBe('Rosa gallica');
    });
  });

  describe('delete', () => {
    it('lève NotFoundException si la plante n\'existe pas', async () => {
      plantRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('inconnu')).rejects.toThrow(NotFoundException);
    });

    it('refuse la suppression si la plante est présente dans des collections', async () => {
      plantRepo.findOne.mockResolvedValue({ id: 'plant-1' });
      collectionRepo.count.mockResolvedValue(2);

      await expect(service.delete('plant-1')).rejects.toThrow(BadRequestException);
      expect(plantRepo.remove).not.toHaveBeenCalled();
    });

    it('supprime la plante si aucune collection ne la référence', async () => {
      const plant = { id: 'plant-1' };
      plantRepo.findOne.mockResolvedValue(plant);
      collectionRepo.count.mockResolvedValue(0);

      await service.delete('plant-1');
      expect(plantRepo.remove).toHaveBeenCalledWith(plant);
    });
  });
});
