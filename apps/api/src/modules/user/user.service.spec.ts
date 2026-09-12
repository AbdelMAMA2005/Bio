import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  softDelete: jest.Mock;
  restore: jest.Mock;
};

type MockCollectionRepo = {
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

type MockRefreshTokenRepo = {
  update: jest.Mock;
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'djawad@planai.app',
    motDePasseHache: 'hashed',
    nomUtilisateur: 'Djawad',
    experience: 0,
    estAdmin: false,
    niveau: 1,
    urlAvatar: null,
    insignes: [],
    dateSuppression: null,
    collectionsUtilisateur: [],
    publicationsUtilisateur: [],
    commentairesUtilisateur: [],
    jaimesUtilisateur: [],
    rappelsUtilisateur: [],
    ...overrides,
  } as User;
}

describe('UserService', () => {
  let service: UserService;
  let repo: MockRepo;
  let collectionRepo: MockCollectionRepo;
  let refreshTokenRepo: MockRefreshTokenRepo;

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    collectionRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    };

    refreshTokenRepo = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hache le mot de passe et persiste le nouvel utilisateur', async () => {
      const user = await service.create(
        'djawad@planai.app',
        'Djawad',
        'motdepasse',
      );

      expect(repo.save).toHaveBeenCalled();
      expect(user.email).toBe('djawad@planai.app');
      expect(user.nomUtilisateur).toBe('Djawad');
      expect(user.motDePasseHache).not.toBe('motdepasse');
    });
  });

  describe('findByEmail / findById', () => {
    it('exclut les utilisateurs soft-supprimés de la recherche', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.findByEmail('djawad@planai.app');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ email: 'djawad@planai.app' }),
        }),
      );
    });
  });

  describe('updateProfile', () => {
    it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateProfile('unknown', { nomUtilisateur: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ConflictException si le nouvel email est déjà pris par un autre compte', async () => {
      const current = makeUser();
      repo.findOne
        .mockResolvedValueOnce(current) // findById
        .mockResolvedValueOnce(
          makeUser({ id: 'other', email: 'pris@planai.app' }),
        ); // email check

      await expect(
        service.updateProfile('user-1', { email: 'pris@planai.app' }),
      ).rejects.toThrow(ConflictException);
    });

    it('met à jour le pseudo quand il est disponible', async () => {
      const current = makeUser();
      repo.findOne
        .mockResolvedValueOnce(current) // findById
        .mockResolvedValueOnce(null); // nomUtilisateur check, libre

      const updated = await service.updateProfile('user-1', {
        nomUtilisateur: 'NouveauPseudo',
      });
      expect(updated.nomUtilisateur).toBe('NouveauPseudo');
    });
  });

  describe('addBadge', () => {
    it('ajoute un badge inédit et ne duplique pas un badge déjà obtenu', async () => {
      const current = makeUser({ insignes: ['premiere-capture'] });
      repo.findOne.mockResolvedValue(current);

      const afterAdd = await service.addBadge('user-1', 'explorateur');
      expect(afterAdd.insignes).toEqual(['premiere-capture', 'explorateur']);

      repo.findOne.mockResolvedValue(afterAdd);
      const afterDuplicate = await service.addBadge('user-1', 'explorateur');
      expect(afterDuplicate.insignes).toEqual([
        'premiere-capture',
        'explorateur',
      ]);
    });
  });

  describe('softDelete', () => {
    it("lève NotFoundException si l'utilisateur est inconnu", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.softDelete('unknown')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("lève NotFoundException si aucune ligne n'est affectée par le softDelete final", async () => {
      repo.findOne.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(undefined);
      repo.softDelete.mockResolvedValue({ affected: 0 });
      await expect(service.softDelete('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('anonymise email/pseudo/avatar puis résout sans erreur quand la suppression réussit', async () => {
      repo.findOne.mockResolvedValue(makeUser());
      repo.update.mockResolvedValue(undefined);
      repo.softDelete.mockResolvedValue({ affected: 1 });

      await expect(service.softDelete('user-1')).resolves.toBeUndefined();

      expect(repo.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          email: expect.stringMatching(/^deleted-.+@planai\.invalid$/),
          nomUtilisateur: expect.stringContaining('Utilisateur supprimé'),
          urlAvatar: null,
        }),
      );
    });
  });

  describe('getPublicProfile', () => {
    it("lève NotFoundException si l'utilisateur est inconnu ou supprimé", async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.getPublicProfile('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('recalcule captures/especes/rares à partir de la collection (jamais stockées)', async () => {
      repo.findOne.mockResolvedValue(
        makeUser({
          niveau: 8,
          experience: 1920,
          urlAvatar: '/uploads/avatars/a.jpg',
        }),
      );
      collectionRepo.count.mockResolvedValueOnce(12).mockResolvedValueOnce(34);
      const qb = collectionRepo.createQueryBuilder();
      (qb.getCount as jest.Mock).mockResolvedValue(5);
      collectionRepo.createQueryBuilder.mockReturnValue(qb);

      const profile = await service.getPublicProfile('user-1');

      expect(profile.stats).toEqual({ captures: 12, especes: 34, rares: 5 });
      expect(profile.urlAvatar).toBe('/uploads/avatars/a.jpg');
      expect(profile.niveau).toBe(8);
    });
  });
});
