import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { StoriesService } from './stories.service';
import { Story } from '../../entities/story.entity';
import { StoryView } from '../../entities/story-view.entity';
import { User } from '../../entities/user.entity';
import { StoryMediaType } from '../../entities/enums/story-media-type.enum';

jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('StoriesService', () => {
  let service: StoriesService;
  let storyRepo: { create: jest.Mock; save: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let storyViewRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock; findOne: jest.Mock; createQueryBuilder: jest.Mock };
  let userRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    storyRepo = { create: jest.fn((d) => d), save: jest.fn(async (s) => ({ id: 'story-1', ...s })), findOne: jest.fn(), createQueryBuilder: jest.fn() };
    storyViewRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(async (v) => ({ id: 'view-1', ...v })),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined as any);
    mockedFs.writeFileSync.mockReturnValue(undefined as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        { provide: getRepositoryToken(Story), useValue: storyRepo },
        { provide: getRepositoryToken(StoryView), useValue: storyViewRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
  });

  describe('createStoryMedia', () => {
    it("lève NotFoundException si l'utilisateur n'existe pas ou a été supprimé", async () => {
      userRepo.findOne.mockResolvedValue(null);
      const file = { originalname: 'story.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('img') } as Express.Multer.File;

      await expect(service.createStoryMedia('user-1', file)).rejects.toThrow(NotFoundException);
    });

    it('sauvegarde la vraie photo sur disque et fixe une expiration à +24h précises', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1', nomUtilisateur: 'Djawad', urlAvatar: null });
      const file = { originalname: 'story.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('img') } as Express.Multer.File;

      const before = Date.now();
      const result = await service.createStoryMedia('user-1', file);
      const after = Date.now();

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('stories'), file.buffer);
      expect(result.urlMedia).toMatch(/^\/uploads\/stories\//);
      expect(result.mediaType).toBe(StoryMediaType.IMAGE);
      expect(result.nomUtilisateur).toBe('Djawad');

      const expirationMs = new Date(result.dateExpiration).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      expect(expirationMs).toBeGreaterThanOrEqual(before + dayMs);
      expect(expirationMs).toBeLessThanOrEqual(after + dayMs);
    });

    it('détecte un média vidéo depuis son mimetype', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1', nomUtilisateur: 'Djawad', urlAvatar: null });
      const file = { originalname: 'clip.mp4', mimetype: 'video/mp4', buffer: Buffer.from('vid') } as Express.Multer.File;

      const result = await service.createStoryMedia('user-1', file);

      expect(result.mediaType).toBe(StoryMediaType.VIDEO);
    });
  });

  describe('getGroupedStories', () => {
    function buildQb(rows: any[]) {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      return qb;
    }

    it('regroupe plusieurs médias du même auteur en une seule bulle (comportement statuts WhatsApp)', async () => {
      const author = { id: 'author-1', nomUtilisateur: 'Marco', urlAvatar: null };
      const rows = [
        { id: 'media-1', userId: 'author-1', urlMedia: '/a.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date('2026-07-24T08:00:00.000Z'), dateExpiration: new Date('2026-07-25T08:00:00.000Z'), utilisateur: author },
        { id: 'media-2', userId: 'author-1', urlMedia: '/b.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date('2026-07-24T09:00:00.000Z'), dateExpiration: new Date('2026-07-25T09:00:00.000Z'), utilisateur: author },
      ];
      storyRepo.createQueryBuilder.mockReturnValue(buildQb(rows));
      storyViewRepo.find.mockResolvedValue([]);
      storyViewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

      const groups = await service.getGroupedStories('caller-1');

      expect(groups).toHaveLength(1);
      expect(groups[0].idUtilisateur).toBe('author-1');
      expect(groups[0].medias).toHaveLength(2);
      expect(groups[0].medias.map((m) => m.id)).toEqual(['media-1', 'media-2']);
    });

    it('marque estMoi et considère toujours ses propres médias comme vus', async () => {
      const author = { id: 'caller-1', nomUtilisateur: 'Moi', urlAvatar: null };
      const rows = [
        { id: 'media-1', userId: 'caller-1', urlMedia: '/a.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date(), dateExpiration: new Date(), utilisateur: author },
      ];
      storyRepo.createQueryBuilder.mockReturnValue(buildQb(rows));
      storyViewRepo.find.mockResolvedValue([]);
      storyViewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

      const groups = await service.getGroupedStories('caller-1');

      expect(groups[0].estMoi).toBe(true);
      expect(groups[0].entierementVue).toBe(true);
      expect(groups[0].medias[0].vuParMoi).toBe(true);
    });

    it('calcule vuParMoi et vuesCount à partir des vraies vues enregistrées', async () => {
      const author = { id: 'author-1', nomUtilisateur: 'Marco', urlAvatar: null };
      const rows = [
        { id: 'media-1', userId: 'author-1', urlMedia: '/a.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date(), dateExpiration: new Date(), utilisateur: author },
      ];
      storyRepo.createQueryBuilder.mockReturnValue(buildQb(rows));
      storyViewRepo.find.mockResolvedValue([{ storyId: 'media-1', viewerId: 'caller-1' }]);
      const countQb = buildQb([]);
      countQb.getRawMany.mockResolvedValue([{ storyId: 'media-1', count: '3' }]);
      storyViewRepo.createQueryBuilder.mockReturnValue(countQb);

      const groups = await service.getGroupedStories('caller-1');

      expect(groups[0].medias[0].vuParMoi).toBe(true);
      expect(groups[0].medias[0].vuesCount).toBe(3);
    });

    it('trie les bulles non entièrement vues avant les bulles entièrement vues', async () => {
      const seenAuthor = { id: 'seen-author', nomUtilisateur: 'Vu', urlAvatar: null };
      const unseenAuthor = { id: 'unseen-author', nomUtilisateur: 'NonVu', urlAvatar: null };
      const rows = [
        { id: 'seen-media', userId: 'seen-author', urlMedia: '/s.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date('2026-07-24T10:00:00.000Z'), dateExpiration: new Date(), utilisateur: seenAuthor },
        { id: 'unseen-media', userId: 'unseen-author', urlMedia: '/u.jpg', mediaType: StoryMediaType.IMAGE, dateCreation: new Date('2026-07-24T08:00:00.000Z'), dateExpiration: new Date(), utilisateur: unseenAuthor },
      ];
      storyRepo.createQueryBuilder.mockReturnValue(buildQb(rows));
      storyViewRepo.find.mockResolvedValue([{ storyId: 'seen-media', viewerId: 'caller-1' }]);
      storyViewRepo.createQueryBuilder.mockReturnValue(buildQb([]));

      const groups = await service.getGroupedStories('caller-1');

      expect(groups.map((g) => g.idUtilisateur)).toEqual(['unseen-author', 'seen-author']);
    });
  });

  describe('recordView', () => {
    it('lève NotFoundException si le média est inconnu', async () => {
      storyRepo.findOne.mockResolvedValue(null);
      await expect(service.recordView('media-1', 'viewer-1')).rejects.toThrow(NotFoundException);
    });

    it("n'enregistre jamais de vue de l'auteur sur son propre média", async () => {
      storyRepo.findOne.mockResolvedValue({ id: 'media-1', userId: 'author-1' });

      await service.recordView('media-1', 'author-1');

      expect(storyViewRepo.findOne).not.toHaveBeenCalled();
      expect(storyViewRepo.save).not.toHaveBeenCalled();
    });

    it('enregistre une nouvelle vue une seule fois (idempotent)', async () => {
      storyRepo.findOne.mockResolvedValue({ id: 'media-1', userId: 'author-1' });
      storyViewRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'view-1' });

      await service.recordView('media-1', 'viewer-1');
      expect(storyViewRepo.save).toHaveBeenCalledTimes(1);

      await service.recordView('media-1', 'viewer-1');
      expect(storyViewRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('getViewers', () => {
    it('lève NotFoundException si le média est inconnu', async () => {
      storyRepo.findOne.mockResolvedValue(null);
      await expect(service.getViewers('media-1', 'caller-1')).rejects.toThrow(NotFoundException);
    });

    it("refuse l'accès à un appelant qui n'est pas l'auteur (vues privées, comportement WhatsApp)", async () => {
      storyRepo.findOne.mockResolvedValue({ id: 'media-1', userId: 'author-1' });
      await expect(service.getViewers('media-1', 'quelqu-un-d-autre')).rejects.toThrow(ForbiddenException);
    });

    it('renvoie les vraies vues, les plus récentes en premier', async () => {
      storyRepo.findOne.mockResolvedValue({ id: 'media-1', userId: 'author-1' });
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { storyId: 'media-1', viewerId: 'v2', dateVue: new Date('2026-07-24T09:00:00.000Z'), viewer: { id: 'v2', nomUtilisateur: 'Bea', urlAvatar: null } },
          { storyId: 'media-1', viewerId: 'v1', dateVue: new Date('2026-07-24T08:00:00.000Z'), viewer: { id: 'v1', nomUtilisateur: 'Alice', urlAvatar: null } },
        ]),
      };
      storyViewRepo.createQueryBuilder.mockReturnValue(qb);

      const viewers = await service.getViewers('media-1', 'author-1');

      expect(qb.orderBy).toHaveBeenCalledWith('v.dateVue', 'DESC');
      expect(viewers.map((v) => v.nomUtilisateur)).toEqual(['Bea', 'Alice']);
    });
  });
});
