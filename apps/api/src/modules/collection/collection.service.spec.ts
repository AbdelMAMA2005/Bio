import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { CollectionService } from './collection.service';
import { Collection } from '../../entities/collection.entity';
import { Plant } from '../../entities/plant.entity';
import { User } from '../../entities/user.entity';
import { PlantType } from '../../entities/enums/plant-type.enum';
import { HealthStatus } from '../../entities/enums/health-status.enum';

// addPhoto() écrit sur disque (uploads/collections/:id) : on mocke fs pour rester
// sans effet de bord réel, comme diagnosis.service.spec.ts.
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('CollectionService', () => {
  let service: CollectionService;
  let collectionRepo: {
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
  };
  let plantRepo: { findOne: jest.Mock; save: jest.Mock };
  let userRepo: { findOne: jest.Mock; increment: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    collectionRepo = {
      save: jest.fn(async (entity) => ({
        id: 'collection-1',
        dateAjout: new Date('2026-07-09'),
        ...entity,
      })),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      // Aucune capture préalable par défaut (première capture mondiale = Épique) —
      // les tests qui veulent une autre rareté surchargent cette valeur.
      count: jest.fn().mockResolvedValue(0),
    };
    plantRepo = { findOne: jest.fn(), save: jest.fn(async (p) => p) };
    userRepo = { findOne: jest.fn(), increment: jest.fn(), update: jest.fn() };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: getRepositoryToken(Plant), useValue: plantRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
  });

  describe('create', () => {
    it("lève NotFoundException si l'utilisateur n'existe pas (ou est supprimé)", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-1', { plantId: 'plant-1', type: PlantType.OWNED }),
      ).rejects.toThrow(NotFoundException);
    });

    it("lève NotFoundException si la plante n'existe pas", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          plantId: 'plant-inconnue',
          type: PlantType.OWNED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée la collection avec etatSante GOOD par défaut et sans géo-tag si non fourni', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue({ id: 'plant-1' });

      const result = await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.OWNED,
      });

      expect(result.etatSante).toBe(HealthStatus.GOOD);
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.type).toBe(PlantType.OWNED);
    });

    it("crédite l'XP selon la rareté réelle dérivée du nombre de captures déjà existantes (25 XP si déjà capturée 5 fois ou plus = Commun)", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue({
        id: 'plant-1',
        badgeRarete: 'Commun',
      });
      collectionRepo.count.mockResolvedValue(5);

      await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.OWNED,
      });

      expect(userRepo.increment).toHaveBeenCalledWith(
        { id: 'user-1' },
        'experience',
        25,
      );
    });

    it('crédite 100 XP pour une toute première capture mondiale (Épique)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue({
        id: 'plant-1',
        badgeRarete: 'Commun',
      });
      collectionRepo.count.mockResolvedValue(0);

      await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.DISCOVERED,
      });

      expect(userRepo.increment).toHaveBeenCalledWith(
        { id: 'user-1' },
        'experience',
        100,
      );
      expect(plantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ badgeRarete: 'Épique' }),
      );
    });

    it('crédite 50 XP et met à jour badgeRarete pour une capture "Rare" (entre 1 et 4 captures déjà existantes)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue({
        id: 'plant-1',
        badgeRarete: 'Épique',
      });
      collectionRepo.count.mockResolvedValue(2);

      await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.OWNED,
      });

      expect(userRepo.increment).toHaveBeenCalledWith(
        { id: 'user-1' },
        'experience',
        50,
      );
      expect(plantRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ badgeRarete: 'Rare' }),
      );
    });

    it('persiste latitude/longitude quand le Geo-Tag est accepté', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      plantRepo.findOne.mockResolvedValue({ id: 'plant-1' });

      const result = await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.DISCOVERED,
        latitude: 49.417,
        longitude: 2.826,
      });

      expect(result.latitude).toBe(49.417);
      expect(result.longitude).toBe(2.826);
    });

    it("fige latitudeReference/longitudeReference sur la première capture géo-taguée (point de référence 'chez vous', défi Exploration)", async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        latitudeReference: null,
        longitudeReference: null,
      });
      plantRepo.findOne.mockResolvedValue({ id: 'plant-1' });

      await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.DISCOVERED,
        latitude: 49.417,
        longitude: 2.826,
      });

      expect(userRepo.update).toHaveBeenCalledWith('user-1', {
        latitudeReference: 49.417,
        longitudeReference: 2.826,
      });
    });

    it('ne réécrit jamais un point de référence déjà connu', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        latitudeReference: 45.75,
        longitudeReference: 4.85,
      });
      plantRepo.findOne.mockResolvedValue({ id: 'plant-1' });

      await service.create('user-1', {
        plantId: 'plant-1',
        type: PlantType.DISCOVERED,
        latitude: 49.417,
        longitude: 2.826,
      });

      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('findByUserAndType', () => {
    it('filtre par type quand demandé et aplatit les infos plante', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'c1',
              plantId: 'p1',
              plante: {
                nomScientifique: 'Lavandula angustifolia',
                nomCommun: 'Lavande vraie',
                famille: 'Lamiaceae',
                badgeRarete: 'Commun',
                toxicite: 'green',
                urlImage: null,
                frequenceArrosageJours: 5,
              },
              etatSante: HealthStatus.DANGER,
              dateAjout: new Date('2026-07-09'),
              derniereArrosage: new Date('2026-07-09T00:00:00.000Z'),
              latitude: null,
              longitude: null,
              historiquePhotos: [],
              dernierDiagnostic: {
                estSain: false,
                maladieNom: 'Septoriose',
                scoreGlobal: 91,
                traitement: { biologique: 'Retirer les feuilles atteintes.' },
                description: null,
                dateDiagnostic: '2026-07-20T00:00:00.000Z',
              },
              typeCollection: PlantType.OWNED,
            },
          ],
          1,
        ]),
      };
      collectionRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByUserAndType('user-1', PlantType.OWNED);

      expect(qb.andWhere).toHaveBeenCalledWith('c.typeCollection = :type', {
        type: PlantType.OWNED,
      });
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].nomScientifique).toBe('Lavandula angustifolia');
      expect(result.items[0].famille).toBe('Lamiaceae');
      expect(result.items[0].dernierDiagnostic).toMatchObject({
        estSain: false,
        maladieNom: 'Septoriose',
      });
      expect(result.items[0]).not.toHaveProperty('plante');
      // derniereArrosage (09/07) + frequenceArrosageJours (5j) = prochainArrosage.
      expect(result.items[0].prochainArrosage).toEqual(
        new Date('2026-07-14T00:00:00.000Z'),
      );
    });

    it('applique page/limit fournis (skip/take)', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      collectionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findByUserAndType('user-1', undefined, 3, 10);

      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
    });
  });

  describe('waterNow', () => {
    it("lève NotFoundException si la collection n'appartient pas à l'utilisateur", async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.waterNow('user-1', 'collection-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('met à jour derniereArrosage et recalcule prochainArrosage en conséquence', async () => {
      const before = new Date('2026-07-01T00:00:00.000Z');
      collectionRepo.findOne.mockResolvedValue({
        id: 'collection-1',
        userId: 'user-1',
        plantId: 'p1',
        plante: {
          nomScientifique: 'Lavandula angustifolia',
          nomCommun: 'Lavande vraie',
          famille: 'Lamiaceae',
          badgeRarete: 'Commun',
          toxicite: 'green',
          urlImage: null,
          frequenceArrosageJours: 5,
        },
        etatSante: HealthStatus.GOOD,
        dateAjout: before,
        derniereArrosage: before,
        latitude: null,
        longitude: null,
        historiquePhotos: [],
        dernierDiagnostic: null,
        typeCollection: PlantType.OWNED,
      });

      const result = await service.waterNow('user-1', 'collection-1');

      expect(collectionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ derniereArrosage: expect.any(Date) }),
      );
      const savedDerniereArrosage =
        collectionRepo.save.mock.calls[0][0].derniereArrosage;
      expect(savedDerniereArrosage.getTime()).toBeGreaterThan(before.getTime());
      expect(result.prochainArrosage.getTime()).toBe(
        savedDerniereArrosage.getTime() + 5 * 24 * 60 * 60 * 1000,
      );
    });
  });

  describe('delete', () => {
    it("lève NotFoundException si la collection n'appartient pas à l'utilisateur", async () => {
      collectionRepo.findOne.mockResolvedValue(null);
      await expect(service.delete('user-1', 'collection-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("supprime quand la collection appartient bien à l'utilisateur", async () => {
      const collection = { id: 'collection-1', userId: 'user-1' };
      collectionRepo.findOne.mockResolvedValue(collection);

      await service.delete('user-1', 'collection-1');
      expect(collectionRepo.remove).toHaveBeenCalledWith(collection);
    });
  });

  describe('addPhoto', () => {
    it(
      'écrit le fichier sous apps/api/uploads/ (pas dist/uploads/ ni src/uploads/) — régression du ' +
        "24/07/2026 : la photo uploadée atterrissait un niveau trop profond (2 x '..' au lieu de 3), " +
        "invisible dans les tests précédents qui ne vérifiaient que la forme de l'URL renvoyée, jamais " +
        'un vrai GET HTTP sur le fichier (voir rapport.md)',
      async () => {
        collectionRepo.findOne.mockResolvedValue({
          id: 'collection-1',
          userId: 'user-1',
          historiquePhotos: [],
        });
        mockedFs.existsSync.mockReturnValue(false); // force la branche mkdirSync à s'exécuter
        const file = {
          originalname: 'photo.jpg',
          buffer: Buffer.from('img'),
        } as Express.Multer.File;

        await service.addPhoto('user-1', 'collection-1', file);

        // Calculé depuis le même __dirname que le service (fichiers co-localisés) :
        // seul le nombre de '..' est sous test, pas la valeur absolue du chemin.
        const expectedUploadDir = path.join(
          __dirname,
          '..',
          '..',
          '..',
          'uploads',
          'collections',
          'collection-1',
        );
        expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedUploadDir, {
          recursive: true,
        });
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining(expectedUploadDir),
          file.buffer,
        );
      },
    );
  });
});
