import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestsService } from './quests.service';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { Collection } from '../../entities/collection.entity';
import { Post } from '../../entities/posts.entity';
import { Like } from '../../entities/like.entity';
import { User } from '../../entities/user.entity';
import { QuestProgress } from '../../entities/quest-progress.entity';

function qbMock(finalMethod: 'getRawMany' | 'getCount', result: any) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
  };
  qb[finalMethod] = jest.fn().mockResolvedValue(result);
  return qb;
}

describe('QuestsService', () => {
  let service: QuestsService;
  let identificationLogRepo: { createQueryBuilder: jest.Mock };
  let collectionRepo: { createQueryBuilder: jest.Mock };
  let postRepo: { createQueryBuilder: jest.Mock };
  let likeRepo: { createQueryBuilder: jest.Mock };
  let userRepo: { increment: jest.Mock };
  let questProgressRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock };

  /** Par défaut, aucune progression sur aucun défi. */
  function setProgress({ scans = 0, gardenAdds = 0, posts = 0, likes = 0 } = {}) {
    identificationLogRepo.createQueryBuilder.mockReturnValue(
      qbMock('getRawMany', Array.from({ length: scans }, (_, i) => ({ plantId: `plant-${i}` }))),
    );
    collectionRepo.createQueryBuilder.mockReturnValue(qbMock('getCount', gardenAdds));
    postRepo.createQueryBuilder.mockReturnValue(qbMock('getCount', posts));
    likeRepo.createQueryBuilder.mockReturnValue(qbMock('getCount', likes));
  }

  beforeEach(async () => {
    identificationLogRepo = { createQueryBuilder: jest.fn() };
    collectionRepo = { createQueryBuilder: jest.fn() };
    postRepo = { createQueryBuilder: jest.fn() };
    likeRepo = { createQueryBuilder: jest.fn() };
    userRepo = { increment: jest.fn() };
    questProgressRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (e) => ({ id: 'progress-1', ...e })),
      create: jest.fn((d) => d),
    };
    setProgress();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        { provide: getRepositoryToken(IdentificationLog), useValue: identificationLogRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
        { provide: getRepositoryToken(Post), useValue: postRepo },
        { provide: getRepositoryToken(Like), useValue: likeRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(QuestProgress), useValue: questProgressRepo },
      ],
    }).compile();

    service = module.get<QuestsService>(QuestsService);
  });

  it('renvoie les 4 défis du catalogue avec une progression à 0 par défaut', async () => {
    const quests = await service.getDailyQuests('user-1');

    expect(quests).toHaveLength(4);
    expect(quests.map((q) => q.id)).toEqual(['scan-3', 'add-garden', 'publish-tip', 'get-5-likes']);
    expect(quests.every((q) => q.progression === 0 && !q.complete)).toBe(true);
    expect(userRepo.increment).not.toHaveBeenCalled();
  });

  it('calcule une progression partielle réelle sans la marquer complète', async () => {
    setProgress({ scans: 2 });

    const quests = await service.getDailyQuests('user-1');
    const scanQuest = quests.find((q) => q.id === 'scan-3')!;

    expect(scanQuest.progression).toBe(2);
    expect(scanQuest.objectif).toBe(3);
    expect(scanQuest.complete).toBe(false);
    expect(userRepo.increment).not.toHaveBeenCalled();
  });

  it('plafonne la progression à l\'objectif même si la vraie donnée le dépasse', async () => {
    setProgress({ scans: 7 });

    const quests = await service.getDailyQuests('user-1');
    const scanQuest = quests.find((q) => q.id === 'scan-3')!;

    expect(scanQuest.progression).toBe(3);
  });

  it('crédite XP + pièces une seule fois quand un défi devient complet', async () => {
    setProgress({ posts: 1 }); // "publish-tip" : objectif 1, récompense 25 XP + 10 pièces

    const quests = await service.getDailyQuests('user-1');
    const tipQuest = quests.find((q) => q.id === 'publish-tip')!;

    expect(tipQuest.complete).toBe(true);
    expect(tipQuest.recompense).toEqual({ xp: 25, pieces: 10 });
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 'user-1' }, 'experience', 25);
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 'user-1' }, 'pieces', 10);
    expect(questProgressRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', questId: 'publish-tip', recompenseCreditee: true }),
    );
  });

  it('ne crédite pas deux fois la même récompense si le défi est déjà complet et déjà crédité', async () => {
    setProgress({ posts: 1 });
    questProgressRepo.findOne.mockResolvedValue({
      id: 'progress-1',
      userId: 'user-1',
      questId: 'publish-tip',
      date: new Date().toISOString().slice(0, 10),
      recompenseCreditee: true,
    });

    await service.getDailyQuests('user-1');

    expect(userRepo.increment).not.toHaveBeenCalled();
  });

  it('un défi sans récompense pièces (scan-3) ne crédite que l\'XP', async () => {
    setProgress({ scans: 3 });

    const quests = await service.getDailyQuests('user-1');
    const scanQuest = quests.find((q) => q.id === 'scan-3')!;

    expect(scanQuest.complete).toBe(true);
    expect(scanQuest.recompense).toEqual({ xp: 30, pieces: 0 });
    expect(userRepo.increment).toHaveBeenCalledWith({ id: 'user-1' }, 'experience', 30);
    expect(userRepo.increment).not.toHaveBeenCalledWith({ id: 'user-1' }, 'pieces', expect.anything());
  });
});
