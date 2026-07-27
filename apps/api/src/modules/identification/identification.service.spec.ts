import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { IdentificationService } from './identification.service';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { ToxicityLevel } from '../../entities/enums/toxicity-level.enum';

describe('IdentificationService', () => {
  let service: IdentificationService;
  let plantRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let identificationLogRepo: { create: jest.Mock; save: jest.Mock };
  let collectionRepo: { count: jest.Mock };

  function build(config: Record<string, string> = { MOCK_PLANTID: 'true' }) {
    plantRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      // Comme le vrai TypeORM, mute l'entité passée en lui ajoutant l'id généré,
      // plutôt que de renvoyer un objet détaché (sinon `existingPlant.id` resterait
      // undefined après save() côté service, qui ne réassigne pas la variable).
      save: jest.fn(async (entity) => {
        entity.id = entity.id ?? 'plant-1';
        return entity;
      }),
    };
    identificationLogRepo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: 'log-1', ...entity })),
    };
    // 5 captures préalables par défaut → aperçu de rareté "Commun" (voir
    // common/rarity.ts), pour matcher les tests existants écrits avant l'ajout de
    // la rareté dynamique. Les tests qui veulent un autre aperçu surchargent ceci.
    collectionRepo = { count: jest.fn().mockResolvedValue(5) };

    return Test.createTestingModule({
      providers: [
        IdentificationService,
        { provide: HttpService, useValue: { post: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def?: string) => config[key] ?? def) },
        },
        { provide: getRepositoryToken(Plant), useValue: plantRepo },
        { provide: getRepositoryToken(IdentificationLog), useValue: identificationLogRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
      ],
    }).compile();
  }

  it('rejette un buffer vide', async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);

    await expect(service.identifyPlantFromBuffer('user-1', Buffer.alloc(0))).rejects.toThrow(
      BadRequestException,
    );
  });

  it("classe 'Non toxique...' en GREEN malgré la sous-chaîne 'toxique' (négation gérée avant les mots-clés positifs)", async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);

    // Le mock interne du service (MOCK_PLANTID=true) renvoie Rosa gallica avec
    // details.toxicity = "Non toxique pour les humains et les animaux domestiques."
    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.nomScientifique).toBe('Rosa gallica');
    expect(result.toxicite).toBe(ToxicityLevel.GREEN);
  });

  it('prévoit 25 XP quand la plante a déjà été capturée 5 fois ou plus (rareté "Commun")', async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.badgeRarete).toBe('Commun');
    expect(result.xpGagne).toBe(25);
  });

  it("prévoit un aperçu de rareté/XP cohérent avec ce que CollectionService créditera réellement à la capture (jamais un chiffre qui changera ensuite)", async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);
    collectionRepo.count.mockResolvedValue(0); // aucune capture existante → Épique

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.badgeRarete).toBe('Épique');
    expect(result.xpGagne).toBe(100);
  });

  it('réutilise une plante déjà en base plutôt que d\'en recréer une', async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);
    plantRepo.findOne.mockResolvedValue({
      id: 'plant-existante',
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: ToxicityLevel.GREEN,
      badgeRarete: 'Commun',
      // Fiche détail déjà complète : ce test vérifie la réutilisation, pas le
      // backfill (voir le test dédié plus bas pour une plante encore incomplète).
      aPropos: 'Déjà renseigné.',
      conseilsEntretien: { lumiere: 'Plein soleil' },
      urlImage: 'https://example.com/rosa.jpg',
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.plantId).toBe('plant-existante');
    expect(plantRepo.save).not.toHaveBeenCalled();
  });

  it("complète aPropos/conseilsEntretien/urlImage d'une plante déjà en base si ces champs sont encore vides (espèce créée avant l'ajout de la fiche détail)", async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);
    plantRepo.findOne.mockResolvedValue({
      id: 'plant-existante',
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: ToxicityLevel.GREEN,
      badgeRarete: 'Commun',
      aPropos: null,
      conseilsEntretien: null,
      urlImage: null,
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    // Le mock interne (MOCK_PLANTID=true) fournit désormais description/watering/
    // best_light_condition/best_soil_type/propagation_methods/image pour Rosa gallica.
    expect(result.aPropos).toEqual(expect.any(String));
    expect(result.conseilsEntretien).toMatchObject({ lumiere: expect.any(String) });
    expect(result.urlImage).toEqual(expect.any(String));
    expect(plantRepo.save).toHaveBeenCalled();
  });

  it("ne réécrit jamais une donnée déjà présente lors du backfill (respecte ce qui a pu être édité manuellement)", async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);
    plantRepo.findOne.mockResolvedValue({
      id: 'plant-existante',
      nomScientifique: 'Rosa gallica',
      nomCommun: 'Rose de France',
      famille: 'Rosaceae',
      toxicite: ToxicityLevel.GREEN,
      badgeRarete: 'Commun',
      aPropos: 'Description déjà en place, ne doit pas être écrasée.',
      conseilsEntretien: null,
      urlImage: null,
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.aPropos).toBe('Description déjà en place, ne doit pas être écrasée.');
  });

  it('renvoie un score de confiance réel (issu de la probabilité Plant.id), pas une valeur fixe', async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    // Le mock interne renvoie une probability de 0.92 pour la meilleure suggestion.
    expect(result.confiance).toBe(92);
  });

  it("journalise l'identification (userId + plantId) pour le défi quotidien 'Scanner 3 plantes'", async () => {
    const module: TestingModule = await build();
    service = module.get(IdentificationService);

    await service.identifyPlantFromBuffer('user-42', Buffer.from('fake-image'));

    expect(identificationLogRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-42', plantId: 'plant-1' }),
    );
  });

  // Les deux tests suivants passent par MOCK_PLANTID=false + un HttpService mocké
  // (plutôt que le mock interne à réponse fixe) pour pouvoir simuler des réponses
  // Plant.id à faible confiance.
  let lastHttpService: { post: jest.Mock };

  async function buildWithRealHttpFlow(plantIdData: any) {
    plantRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn((d) => d), save: jest.fn(async (e) => ({ id: 'plant-1', ...e })) };
    identificationLogRepo = { create: jest.fn((d) => d), save: jest.fn(async (e) => ({ id: 'log-1', ...e })) };
    collectionRepo = { count: jest.fn().mockResolvedValue(5) };
    const httpService = { post: jest.fn().mockReturnValue(of({ data: plantIdData })) };
    lastHttpService = httpService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentificationService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: string) =>
              ({ MOCK_PLANTID: 'false', PLANT_ID_API_KEY: 'test-key', PLANT_ID_API_URL: 'https://api.plant.id/v3/identification' } as any)[key] ?? def,
            ),
          },
        },
        { provide: getRepositoryToken(Plant), useValue: plantRepo },
        { provide: getRepositoryToken(IdentificationLog), useValue: identificationLogRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
      ],
    }).compile();
    return module.get<IdentificationService>(IdentificationService);
  }

  it("rejette une image dont Plant.id n'est pas confiant qu'il s'agit d'une plante", async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.05, binary: false },
        classification: { suggestions: [{ name: 'Rosa gallica', probability: 0.9, details: {} }] },
      },
    });

    await expect(service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'))).rejects.toThrow(
      NotFoundException,
    );
    expect(identificationLogRepo.save).not.toHaveBeenCalled();
  });

  it("demande bien `taxonomy` à Plant.id (sinon la famille botanique reste toujours null, bug trouvé en testant une vraie clé)", async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.95, binary: true },
        classification: { suggestions: [{ name: 'Tacca chantrieri', probability: 0.98, details: { taxonomy: { family: 'Dioscoreaceae' } } }] },
      },
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    const calledUrl = lastHttpService.post.mock.calls[0][0] as string;
    expect(calledUrl).toContain('taxonomy');
    expect(result.famille).toBe('Dioscoreaceae');
  });

  it('demande bien description/watering/best_light_condition/best_soil_type/propagation_methods/image à Plant.id (fiche détail)', async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.95, binary: true },
        classification: { suggestions: [{ name: 'Ocimum basilicum', probability: 0.98, details: {} }] },
      },
    });

    await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    const calledUrl = lastHttpService.post.mock.calls[0][0] as string;
    for (const param of ['description', 'watering', 'best_light_condition', 'best_soil_type', 'propagation_methods', 'image']) {
      expect(calledUrl).toContain(param);
    }
  });

  it('peuple aPropos/conseilsEntretien/urlImage à partir de vraies données structurées Plant.id (basilic)', async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.95, binary: true },
        classification: {
          suggestions: [
            {
              name: 'Ocimum basilicum',
              probability: 0.98,
              details: {
                description: { value: 'Plante aromatique annuelle largement utilisée en cuisine méditerranéenne.' },
                watering: { min: 2, max: 2 },
                best_light_condition: 'Plein soleil',
                best_soil_type: 'Riche, bien drainé',
                propagation_methods: ['Semis', 'Bouturage'],
                image: { value: 'https://bs.plantnet.org/image/o/basilic.jpg' },
              },
            },
          ],
        },
      },
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.aPropos).toBe('Plante aromatique annuelle largement utilisée en cuisine méditerranéenne.');
    expect(result.urlImage).toBe('https://bs.plantnet.org/image/o/basilic.jpg');
    expect(result.conseilsEntretien).toEqual({
      lumiere: 'Plein soleil',
      sol: 'Riche, bien drainé',
      arrosage: 'Modéré',
      multiplication: 'Semis, Bouturage',
    });
  });

  it("n'invente jamais de conseils d'entretien : reste null quand Plant.id ne fournit aucun des signaux réels", async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.95, binary: true },
        classification: { suggestions: [{ name: 'Espèce rare', probability: 0.9, details: {} }] },
      },
    });

    const result = await service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'));

    expect(result.aPropos).toBeNull();
    expect(result.conseilsEntretien).toBeNull();
    expect(result.urlImage).toBeNull();
  });

  it('rejette une identification dont la meilleure suggestion est trop incertaine', async () => {
    service = await buildWithRealHttpFlow({
      result: {
        is_plant: { probability: 0.95, binary: true },
        classification: { suggestions: [{ name: 'Plante mystère', probability: 0.01, details: {} }] },
      },
    });

    await expect(service.identifyPlantFromBuffer('user-1', Buffer.from('fake-image'))).rejects.toThrow(
      NotFoundException,
    );
    expect(identificationLogRepo.save).not.toHaveBeenCalled();
  });
});
