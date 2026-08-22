import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  let userService: {
    findById: jest.Mock;
    updateProfile: jest.Mock;
    updateAvatar: jest.Mock;
    addBadge: jest.Mock;
    softDelete: jest.Mock;
  };

  const currentUser = { id: 'user-1', email: 'djawad@planai.app' };

  beforeEach(async () => {
    userService = {
      findById: jest.fn(),
      updateProfile: jest.fn(),
      updateAvatar: jest.fn(),
      addBadge: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('renvoie le profil mappé (insignes toujours un tableau)', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'djawad@planai.app',
        username: 'Djawad',
        experience: 120,
        niveau: 2,
        insignes: null,
        urlAvatar: null,
      });

      const result = await controller.getMe(currentUser as any);
      expect(result.insignes).toEqual([]);
      expect(result.niveau).toBe(2);
    });
  });

  describe('deleteMe', () => {
    it('rejette avec 401 si le mot de passe fourni est incorrect', async () => {
      const hache = await argon2.hash('bon-mot-de-passe');
      userService.findById.mockResolvedValue({
        id: 'user-1',
        motDePasseHache: hache,
      });

      await expect(
        controller.deleteMe(
          currentUser as any,
          { motDePasse: 'mauvais-mot-de-passe' } as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
      expect(userService.softDelete).not.toHaveBeenCalled();
    });

    it('supprime le compte quand le mot de passe est correct', async () => {
      const hache = await argon2.hash('bon-mot-de-passe');
      userService.findById.mockResolvedValue({
        id: 'user-1',
        motDePasseHache: hache,
      });
      userService.softDelete.mockResolvedValue(undefined);

      const result = await controller.deleteMe(currentUser as any, {
        motDePasse: 'bon-mot-de-passe',
      });
      expect(userService.softDelete).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true, message: expect.any(String) });
    });
  });

  describe('addBadge', () => {
    it("délègue au service avec l'id de l'utilisateur courant et le badge fourni", async () => {
      userService.addBadge.mockResolvedValue({
        id: 'user-1',
        email: 'djawad@planai.app',
        username: 'Djawad',
        experience: 0,
        niveau: 1,
        insignes: ['explorateur'],
        urlAvatar: null,
      });

      const result = await controller.addBadge(currentUser as any, {
        badge: 'explorateur',
      });
      expect(userService.addBadge).toHaveBeenCalledWith(
        'user-1',
        'explorateur',
      );
      expect(result.insignes).toContain('explorateur');
    });
  });
});
