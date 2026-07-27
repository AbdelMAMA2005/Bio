import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (entity) => ({ id: 'user-1', ...entity })),
    };
    jwtService = { sign: jest.fn(() => 'signed.jwt.token') };
    configService = { get: jest.fn(() => 'test-google-client-id') };
    mockVerifyIdToken.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('rejette un email déjà utilisé', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.register({ email: 'djawad@planai.app', nomUtilisateur: 'Djawad', motDePasse: 'motdepasse' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejette un nom d\'utilisateur déjà pris', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // email libre
        .mockResolvedValueOnce({ id: 'existing' }); // pseudo pris

      await expect(
        service.register({ email: 'nouveau@planai.app', nomUtilisateur: 'Djawad', motDePasse: 'motdepasse' }),
      ).rejects.toThrow(ConflictException);
    });

    it("crée le compte avec un mot de passe haché et sans token dans la réponse", async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.register({
        email: 'nouveau@planai.app',
        nomUtilisateur: 'Nouveau',
        motDePasse: 'motdepasse',
      });

      expect(result).not.toHaveProperty('accessToken');
      expect(result.experience).toBe(0);
      expect(result.niveau).toBe(1);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ motDePasseHache: expect.not.stringMatching('motdepasse') }),
      );
    });
  });

  describe('login', () => {
    it('rejette un email inconnu avec 401', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'inconnu@planai.app', motDePasse: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejette un mauvais mot de passe avec 401', async () => {
      const motDePasseHache = await argon2.hash('bon-mot-de-passe');
      userRepo.findOne.mockResolvedValue({ id: 'user-1', email: 'djawad@planai.app', motDePasseHache });

      await expect(
        service.login({ email: 'djawad@planai.app', motDePasse: 'mauvais-mot-de-passe' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('renvoie un accessToken et le user quand les identifiants sont bons', async () => {
      const motDePasseHache = await argon2.hash('bon-mot-de-passe');
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'djawad@planai.app',
        motDePasseHache,
        nomUtilisateur: 'Djawad',
        experience: 10,
        niveau: 1,
        insignes: [],
      });

      const result = await service.login({ email: 'djawad@planai.app', motDePasse: 'bon-mot-de-passe' });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('djawad@planai.app');
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'djawad@planai.app' });
    });
  });

  describe('loginWithGoogle', () => {
    it('rejette si GOOGLE_CLIENT_ID n\'est pas configuré côté serveur', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(service.loginWithGoogle('un-token')).rejects.toThrow(UnauthorizedException);
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('rejette un jeton Google invalide ou expiré', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('invalid token signature'));

      await expect(service.loginWithGoogle('un-token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejette un compte Google sans email vérifié', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'leo@gmail.com', email_verified: false }),
      });

      await expect(service.loginWithGoogle('un-token')).rejects.toThrow(UnauthorizedException);
    });

    it('crée un nouvel utilisateur quand aucun compte ne correspond à cet email', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'leo@gmail.com', email_verified: true, given_name: 'Léo' }),
      });
      userRepo.findOne.mockResolvedValue(null); // pas de compte existant, pas de collision de pseudo

      const result = await service.loginWithGoogle('un-token');

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'leo@gmail.com', nomUtilisateur: 'Léo' }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('leo@gmail.com');
    });

    it('reconnecte directement un utilisateur existant avec le même email (pas de doublon)', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'djawad@planai.app', email_verified: true, given_name: 'Djawad' }),
      });
      userRepo.findOne.mockResolvedValue({
        id: 'user-existant',
        email: 'djawad@planai.app',
        nomUtilisateur: 'Djawad',
        experience: 40,
        niveau: 2,
        insignes: [],
      });

      const result = await service.loginWithGoogle('un-token');

      expect(userRepo.save).not.toHaveBeenCalled();
      expect(result.user.id).toBe('user-existant');
    });

    it('déduplique le pseudo si le prénom Google est déjà pris', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({ email: 'nouveau.leo@gmail.com', email_verified: true, given_name: 'Djawad' }),
      });
      userRepo.findOne
        .mockResolvedValueOnce(null) // pas de compte pour cet email
        .mockResolvedValueOnce({ id: 'autre-user' }) // "Djawad" déjà pris
        .mockResolvedValueOnce(null); // "Djawad_1" libre

      await service.loginWithGoogle('un-token');

      expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ nomUtilisateur: 'Djawad_1' }));
    });
  });
});
