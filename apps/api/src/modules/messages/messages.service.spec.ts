import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Story } from '../../entities/story.entity';
import { User } from '../../entities/user.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let conversationRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let messageRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  let storyRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    conversationRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (c) => ({
        id: c.id ?? 'conv-1',
        dateDernierMessage: new Date(),
        ...c,
      })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    messageRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (m) => ({
        id: 'message-1',
        dateEnvoi: new Date(),
        lu: false,
        ...m,
      })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
    };
    storyRepo = { findOne: jest.fn() };
    userRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: conversationRepo,
        },
        { provide: getRepositoryToken(Message), useValue: messageRepo },
        { provide: getRepositoryToken(Story), useValue: storyRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  describe('sendMessage', () => {
    it("refuse un message qu'on s'envoie à soi-même", async () => {
      await expect(
        service.sendMessage('user-1', 'user-1', { contenu: 'salut' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si le destinataire est inconnu ou supprimé', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.sendMessage('user-1', 'user-2', { contenu: 'salut' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève NotFoundException si le storyId cité est inconnu', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      storyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.sendMessage('user-1', 'user-2', {
          contenu: 'salut',
          storyId: 'story-x',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("refuse de citer le statut d'un tiers dans un message adressé à quelqu'un d'autre", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      storyRepo.findOne.mockResolvedValue({
        id: 'story-x',
        userId: 'quelqu-un-d-autre',
        urlMedia: '/a.jpg',
        mediaType: 'image',
      });
      await expect(
        service.sendMessage('user-1', 'user-2', {
          contenu: 'salut',
          storyId: 'story-x',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée la conversation (ids normalisés) puis le message quand aucune conversation existante', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      conversationRepo.findOne.mockResolvedValue(null);

      const result = await service.sendMessage('user-2', 'user-1', {
        contenu: 'salut',
      });

      expect(conversationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ user1Id: 'user-1', user2Id: 'user-2' }),
      );
      expect(messageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: 'user-2', contenu: 'salut' }),
      );
      expect(result.idExpediteur).toBe('user-2');
      expect(result.storyPreview).toBeNull();
    });

    it('réutilise la conversation existante plutôt que d’en recréer une', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-existing',
        user1Id: 'user-1',
        user2Id: 'user-2',
      });

      await service.sendMessage('user-1', 'user-2', { contenu: 'salut' });

      expect(conversationRepo.create).not.toHaveBeenCalled();
      expect(messageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: 'conv-existing' }),
      );
    });

    it('attache un aperçu du statut cité quand storyId est valide et appartient au destinataire', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      storyRepo.findOne.mockResolvedValue({
        id: 'story-x',
        userId: 'user-2',
        urlMedia: '/a.jpg',
        mediaType: 'image',
      });
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
      });

      const result = await service.sendMessage('user-1', 'user-2', {
        contenu: 'Jolie plante !',
        storyId: 'story-x',
      });

      expect(result.storyPreview).toEqual({
        id: 'story-x',
        urlMedia: '/a.jpg',
        mediaType: 'image',
      });
    });
  });

  describe('getMessagesWith', () => {
    it("renvoie un tableau vide si aucune conversation n'existe encore (jamais 404)", async () => {
      conversationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getMessagesWith('user-1', 'user-2'),
      ).resolves.toEqual([]);
      expect(messageRepo.update).not.toHaveBeenCalled();
    });

    it('marque comme lus les messages reçus du pair et renvoie l’historique complet', async () => {
      conversationRepo.findOne.mockResolvedValue({
        id: 'conv-1',
        user1Id: 'user-1',
        user2Id: 'user-2',
      });
      messageRepo.find.mockResolvedValue([
        {
          id: 'm1',
          conversationId: 'conv-1',
          senderId: 'user-2',
          contenu: 'salut',
          dateEnvoi: new Date(),
          lu: true,
          storyId: null,
        },
      ]);

      const messages = await service.getMessagesWith('user-1', 'user-2');

      expect(messageRepo.update).toHaveBeenCalledWith(
        { conversationId: 'conv-1', senderId: 'user-2', lu: false },
        { lu: true },
      );
      expect(messages).toHaveLength(1);
    });
  });

  describe('listConversations', () => {
    it('résout le pair, le dernier message et le compte de non-lus pour chaque conversation', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'conv-1', user1Id: 'user-1', user2Id: 'user-2' },
          ]),
      };
      conversationRepo.createQueryBuilder.mockReturnValue(qb);
      userRepo.findOne.mockResolvedValue({
        id: 'user-2',
        nomUtilisateur: 'Marco',
        urlAvatar: null,
      });
      messageRepo.findOne.mockResolvedValue({
        id: 'm1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        contenu: 'salut',
        dateEnvoi: new Date(),
        lu: false,
        storyId: null,
      });
      messageRepo.count.mockResolvedValue(1);

      const conversations = await service.listConversations('user-1');

      expect(conversations).toHaveLength(1);
      expect(conversations[0].autreUtilisateur.id).toBe('user-2');
      expect(conversations[0].dernierMessage?.estDeMoi).toBe(false);
      expect(conversations[0].nonLusCount).toBe(1);
    });
  });
});
