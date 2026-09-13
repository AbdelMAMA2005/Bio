import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { UserService } from '../user/user.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

function qbMock(result: {
  getCount?: number;
  getMany?: any[];
  getRawMany?: any[];
}) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
  };
  qb.getCount = jest.fn().mockResolvedValue(result.getCount ?? 0);
  qb.getMany = jest.fn().mockResolvedValue(result.getMany ?? []);
  qb.getManyAndCount = jest
    .fn()
    .mockResolvedValue([result.getMany ?? [], result.getCount ?? 0]);
  qb.getRawMany = jest.fn().mockResolvedValue(result.getRawMany ?? []);
  return qb;
}

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let userRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let collectionRepo: { createQueryBuilder: jest.Mock };
  let userService: { softDelete: jest.Mock };

  const actingAdmin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@planai.app',
    nomUtilisateur: 'Admin',
    estAdmin: true,
    role: 'admin',
    estSuspendu: false,
  };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (u) => u),
      createQueryBuilder: jest.fn(),
    };
    collectionRepo = {
      createQueryBuilder: jest.fn(() => qbMock({ getRawMany: [] })),
    };
    userService = { softDelete: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = module.get(AdminUsersService);
  });

  describe('updateRole', () => {
    it("synchronise estAdmin=true quand le rôle passe à 'admin' (compat AdminGuard existant)", async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'membre',
        estAdmin: false,
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });

      const result = await service.updateRole('u1', 'admin');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin', estAdmin: true }),
      );
      expect(result.role).toBe('admin');
    });

    it("repasse estAdmin=false quand le rôle redescend à 'moderateur'", async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'admin',
        estAdmin: true,
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });

      await service.updateRole('u1', 'moderateur');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'moderateur', estAdmin: false }),
      );
    });

    it('lève NotFoundException si le compte est inconnu ou déjà supprimé', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.updateRole('inconnu', 'admin')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('un admin ne peut pas se suspendre lui-même', async () => {
      await expect(
        service.updateStatus('admin-1', true, actingAdmin),
      ).rejects.toThrow(BadRequestException);
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('suspend un autre compte sans problème', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'membre',
        estAdmin: false,
        estSuspendu: false,
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });

      const result = await service.updateStatus('u1', true, actingAdmin);

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ estSuspendu: true }),
      );
      expect(result.statut).toBe('suspendu');
    });
  });

  describe('statut calculé (actif/inactif/suspendu)', () => {
    it('un compte jamais connecté et non suspendu est "inactif"', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'membre',
        estAdmin: false,
        estSuspendu: false,
        derniereConnexion: null,
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });
      const result = await service.updateRole('u1', 'membre');
      expect(result.statut).toBe('inactif');
    });

    it('un compte connecté récemment est "actif"', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'membre',
        estAdmin: false,
        estSuspendu: false,
        derniereConnexion: new Date(),
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });
      const result = await service.updateRole('u1', 'membre');
      expect(result.statut).toBe('actif');
    });

    it('la suspension prime toujours sur la fraîcheur de connexion', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        role: 'membre',
        estAdmin: false,
        estSuspendu: true,
        derniereConnexion: new Date(),
        nomUtilisateur: 'Bob',
        email: 'bob@x.com',
        urlAvatar: null,
        niveau: 1,
        experience: 0,
      });
      const result = await service.updateRole('u1', 'membre');
      expect(result.statut).toBe('suspendu');
    });
  });

  describe('delete (RGPD)', () => {
    it('refuse la suppression de son propre compte', async () => {
      await expect(service.delete('admin-1', actingAdmin)).rejects.toThrow(
        BadRequestException,
      );
      expect(userService.softDelete).not.toHaveBeenCalled();
    });

    it("refuse la suppression d'un autre administrateur", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u2', role: 'admin' });
      await expect(service.delete('u2', actingAdmin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(userService.softDelete).not.toHaveBeenCalled();
    });

    it('délègue à UserService#softDelete pour un membre normal', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u2', role: 'membre' });
      await service.delete('u2', actingAdmin);
      expect(userService.softDelete).toHaveBeenCalledWith('u2');
    });
  });

  describe('list', () => {
    it('filtre par recherche pseudo/email et calcule capturesCount par utilisateur', async () => {
      const qb = qbMock({
        getMany: [
          {
            id: 'u1',
            role: 'membre',
            estAdmin: false,
            estSuspendu: false,
            derniereConnexion: new Date(),
            nomUtilisateur: 'Alice',
            email: 'alice@x.com',
            urlAvatar: null,
            niveau: 3,
            experience: 100,
          },
        ],
        getCount: 1,
      });
      userRepo.createQueryBuilder.mockReturnValue(qb);
      collectionRepo.createQueryBuilder.mockReturnValue(
        qbMock({ getRawMany: [{ userId: 'u1', count: '7' }] }),
      );

      const result = await service.list({
        page: 1,
        limit: 20,
        q: 'alice',
        filtre: 'tous',
      });

      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 'u1', capturesCount: 7 });
    });
  });
});
