import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { DiagnosisService } from './diagnosis.service';
import { Collection } from '../../entities/collection.entity';
import { HealthStatus } from '../../entities/enums/health-status.enum';

// Le service écrit la photo envoyée sur disque (uploads/collections/:id) : on
// mocke fs pour garder ce test unitaire sans effet de bord réel sur le disque.
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('DiagnosisService', () => {
  let service: DiagnosisService;
  let collectionRepo: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    collectionRepo = { findOne: jest.fn(), save: jest.fn(async (c) => c) };
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined as any);
    mockedFs.writeFileSync.mockReturnValue(undefined as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosisService,
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        // FORCE_MOCK=true : force le mode mock indépendamment de PLANT_ID_API_KEY.
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => (key === 'FORCE_MOCK' ? 'true' : undefined)) } },
      ],
    }).compile();

    service = module.get<DiagnosisService>(DiagnosisService);
  });

  it("lève NotFoundException si la collection n'appartient pas à l'utilisateur", async () => {
    collectionRepo.findOne.mockResolvedValue(null);

    await expect(service.diagnosePlantHealth('user-1', 'collection-inconnue', Buffer.from('img'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it("lève BadRequestException si aucune image n'est fournie et qu'il n'y a pas d'historique", async () => {
    collectionRepo.findOne.mockResolvedValue({
      id: 'collection-1',
      userId: 'user-1',
      historiquePhotos: [],
      etatSante: HealthStatus.GOOD,
    });

    await expect(service.diagnosePlantHealth('user-1', 'collection-1', undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('met à jour etatSante à DANGER quand le diagnostic mock renvoie un état malade (probabilité de maladie >= 0.7)', async () => {
    const collection: any = {
      id: 'collection-1',
      userId: 'user-1',
      historiquePhotos: [],
      etatSante: HealthStatus.GOOD,
    };
    collectionRepo.findOne.mockResolvedValue(collection);

    // Le mode mock a 70% de chances d'être sain ; on force le hasard côté test
    // pour couvrir le chemin "malade" de façon déterministe.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.01); // < 0.3 → estSain = false

    try {
      const result = await service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'));

      expect(result.estSain).toBe(false);
      expect(collection.etatSante).toBe(HealthStatus.DANGER);
      expect(collectionRepo.save).toHaveBeenCalled();
      // Le diagnostic (maladie, confiance, traitement, date) est persisté pour que le
      // bouton "Voir le diagnostic" côté front puisse le rouvrir sans relancer d'analyse.
      expect(collection.dernierDiagnostic).toMatchObject({
        estSain: false,
        maladieNom: expect.any(String),
        scoreGlobal: expect.any(Number),
        traitement: expect.objectContaining({ biologique: expect.any(String) }),
      });
      expect(new Date(collection.dernierDiagnostic.dateDiagnostic).toString()).not.toBe('Invalid Date');
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('marque etatSante GOOD quand le diagnostic mock renvoie un état sain', async () => {
    const collection: any = {
      id: 'collection-1',
      userId: 'user-1',
      historiquePhotos: [],
      etatSante: HealthStatus.DANGER,
    };
    collectionRepo.findOne.mockResolvedValue(collection);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9); // > 0.3 → estSain = true

    try {
      const result = await service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'));

      expect(result.estSain).toBe(true);
      expect(collection.etatSante).toBe(HealthStatus.GOOD);
      // Plante saine : jamais de nom de maladie/traitement inventé.
      expect(collection.dernierDiagnostic).toMatchObject({
        estSain: true,
        maladieNom: null,
        traitement: null,
        description: null,
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("écrase le diagnostic précédent par le plus récent (pas d'historique accumulé)", async () => {
    const collection: any = {
      id: 'collection-1',
      userId: 'user-1',
      historiquePhotos: [],
      etatSante: HealthStatus.GOOD,
      dernierDiagnostic: { estSain: false, maladieNom: 'Ancienne maladie', scoreGlobal: 50, traitement: null, description: null, dateDiagnostic: '2020-01-01T00:00:00.000Z' },
    };
    collectionRepo.findOne.mockResolvedValue(collection);

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9); // sain cette fois

    try {
      await service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'));

      expect(collection.dernierDiagnostic.estSain).toBe(true);
      expect(collection.dernierDiagnostic.maladieNom).toBeNull();
      expect(collection.dernierDiagnostic.dateDiagnostic).not.toBe('2020-01-01T00:00:00.000Z');
    } finally {
      randomSpy.mockRestore();
    }
  });
});

// Les tests suivants passent par FORCE_MOCK=false + une vraie clé + `fetch` mocké (plutôt
// que le mode mock ci-dessus) pour verrouiller le format réel de l'appel Plant.id v3 Health
// — c'est justement l'absence de ce genre de test qui a laissé passer le bug du 24/07/2026
// (params `health`/`details`/`language` envoyés dans le corps JSON au lieu de la query
// string, jamais détecté car aucun test n'exerçait le vrai `fetch`, voir rapport.md).
describe('DiagnosisService (vrai appel HTTP Plant.id Health)', () => {
  let service: DiagnosisService;
  let collectionRepo: { findOne: jest.Mock; save: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    collectionRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'collection-1',
        userId: 'user-1',
        historiquePhotos: [],
        etatSante: HealthStatus.GOOD,
      }),
      save: jest.fn(async (c) => c),
    };
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosisService,
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => ({ PLANT_ID_API_KEY: 'test-key', FORCE_MOCK: 'false' } as any)[key]),
          },
        },
      ],
    }).compile();

    service = module.get<DiagnosisService>(DiagnosisService);
  });

  it('envoie health/details/language en query string, jamais dans le corps JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { is_healthy: { binary: true, probability: 0.95 }, disease: { suggestions: [] } } }),
    });

    await service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, options] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain('health=all');
    expect(calledUrl).toContain('language=fr');
    expect(calledUrl).toContain('details=');
    const body = JSON.parse(options.body);
    expect(body).toEqual({ images: [Buffer.from('img').toString('base64')], similar_images: true });
    expect(body.health).toBeUndefined();
    expect(body.details).toBeUndefined();
    expect(body.language).toBeUndefined();
  });

  it('joint les tableaux treatment.{biological,chemical,prevention} en texte, sans inventer une catégorie absente', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          is_healthy: { binary: false, probability: 0.1 },
          disease: {
            suggestions: [
              {
                id: 'disease-1',
                name: 'Septoriose',
                probability: 0.91,
                details: {
                  description: 'Taches foliaires.',
                  treatment: { biological: ['Retirer les feuilles atteintes.'], chemical: [], prevention: ['Espacer les plants.', 'Éviter l’arrosage par le feuillage.'] },
                },
              },
            ],
          },
        },
      }),
    });

    const result = await service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'));

    expect(result.suggestions[0].traitement).toEqual({
      biologique: 'Retirer les feuilles atteintes.',
      chimique: undefined,
      prevention: 'Espacer les plants. Éviter l’arrosage par le feuillage.',
    });
  });

  it('propage une erreur explicite si Plant.id rejette la requête (au lieu du 500 générique masquant la vraie cause)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":"Unknown modifier"}',
    });

    await expect(service.diagnosePlantHealth('user-1', 'collection-1', Buffer.from('img'))).rejects.toThrow(
      BadRequestException,
    );
  });
});
