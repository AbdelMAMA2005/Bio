import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { DeviceToken } from '../../entities/device-token.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let deviceTokenRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    deviceTokenRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (t) => ({ id: 'device-1', ...t })),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(DeviceToken), useValue: deviceTokenRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('registerDevice', () => {
    it("crée une nouvelle ligne si le token n'existe pas encore", async () => {
      deviceTokenRepo.findOne.mockResolvedValue(null);

      await service.registerDevice('user-1', { expoPushToken: 'ExponentPushToken[abc]', plateforme: 'android' });

      expect(deviceTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', expoPushToken: 'ExponentPushToken[abc]', plateforme: 'android' }),
      );
    });

    it('réassocie le token existant au nouvel utilisateur plutôt que de dupliquer (upsert)', async () => {
      const existing = { id: 'device-1', userId: 'user-old', expoPushToken: 'ExponentPushToken[abc]', plateforme: 'ios' };
      deviceTokenRepo.findOne.mockResolvedValue(existing);

      await service.registerDevice('user-new', { expoPushToken: 'ExponentPushToken[abc]', plateforme: 'android' });

      expect(deviceTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'device-1', userId: 'user-new', plateforme: 'android' }),
      );
    });
  });

  describe('unregisterDevice', () => {
    it('supprime uniquement le token précisé quand fourni', async () => {
      await service.unregisterDevice('user-1', 'ExponentPushToken[abc]');
      expect(deviceTokenRepo.delete).toHaveBeenCalledWith({ userId: 'user-1', expoPushToken: 'ExponentPushToken[abc]' });
    });

    it('supprime tous les tokens de l\'utilisateur si aucun token précisé', async () => {
      await service.unregisterDevice('user-1');
      expect(deviceTokenRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });
});
