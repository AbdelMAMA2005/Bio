import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../../entities/user.entity';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  softDelete: jest.Mock;
  restore: jest.Mock;
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'djawad@planai.app',
    motDePasseHache: 'hashed',
    username: 'Djawad',
    experience: 0,
    estAdmin: false,
    niveau: 1,
    urlAvatar: null as any,
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

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => entity),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: repo },
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
        'Djawad Doe',
        'motdepasse',
      );

      expect(repo.save).toHaveBeenCalled();
      expect(user.email).toBe('djawad@planai.app');
      expect(user.username).toBe('Djawad');
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
        service.updateProfile('unknown', { fullName: 'X' }),
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
        .mockResolvedValueOnce(null); // username check, libre

      const updated = await service.updateProfile('user-1', {
        fullName: 'Nouveau Pseudo',
      });
      expect(updated.fullName).toBe('Nouveau Pseudo');
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
    it("lève NotFoundException si aucune ligne n'est affectée", async () => {
      repo.softDelete.mockResolvedValue({ affected: 0 });
      await expect(service.softDelete('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('résout sans erreur quand la suppression logique réussit', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 });
      await expect(service.softDelete('user-1')).resolves.toBeUndefined();
    });
  });
});
