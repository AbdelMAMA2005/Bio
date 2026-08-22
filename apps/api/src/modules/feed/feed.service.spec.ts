import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import { FeedService } from './feed.service';
import { Post as PostEntity } from '../../entities/posts.entity';
import { Like as LikeEntity } from '../../entities/like.entity';
import { Comment as CommentEntity } from '../../entities/comment.entity';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';

// createPost() écrit la photo du post sur disque (uploads/posts) quand un fichier est
// fourni : on mocke fs pour rester sans effet de bord réel, comme les autres services
// d'upload (collection.service.spec.ts, diagnosis.service.spec.ts).
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FeedService', () => {
  let service: FeedService;
  let postRepo: {
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let likeRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    count: jest.Mock;
  };
  let commentRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let userRepo: { findOne: jest.Mock };
  let collectionRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    postRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    likeRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    commentRepo = {
      create: jest.fn((d) => d),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    userRepo = { findOne: jest.fn() };
    collectionRepo = { findOne: jest.fn() };
    jest.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: getRepositoryToken(PostEntity), useValue: postRepo },
        { provide: getRepositoryToken(LikeEntity), useValue: likeRepo },
        { provide: getRepositoryToken(CommentEntity), useValue: commentRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Collection), useValue: collectionRepo },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  describe('createPost', () => {
    it("lève NotFoundException si la collection taguée n'appartient pas à l'utilisateur", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      collectionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPost('user-1', {
          contenuTexte: 'Trouvée en forêt',
          collectionId: 'collection-autre',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crée un post texte seul sans collection taguée', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      postRepo.save.mockResolvedValue({ id: 'post-1' });
      postRepo.findOne.mockResolvedValue({
        id: 'post-1',
        userId: 'user-1',
        collectionId: null,
        contenuTexte: 'Trouvée en forêt',
        urlImage: null,
        dateCreation: new Date('2026-07-15'),
        utilisateur: { id: 'user-1', username: 'Djawad', urlAvatar: null },
        collection: null,
      });

      const result = await service.createPost('user-1', {
        contenuTexte: 'Trouvée en forêt',
      });

      expect(result.contenuTexte).toBe('Trouvée en forêt');
      expect(result.plante).toBeUndefined();
      expect(collectionRepo.findOne).not.toHaveBeenCalled();
    });

    it(
      "enregistre la vraie photo envoyée (multipart) sur disque et l'expose comme imageUrl " +
        "— avant le 24/07/2026, aucun fichier n'était jamais accepté ici (voir rapport.md)",
      async () => {
        userRepo.findOne.mockResolvedValue({ id: 'user-1' });
        postRepo.save.mockResolvedValue({ id: 'post-1' });
        postRepo.findOne.mockImplementation(async () => ({
          id: 'post-1',
          userId: 'user-1',
          collectionId: null,
          contenuTexte: 'Ma tomate',
          urlImage: '/uploads/posts/some-uuid.jpg',
          dateCreation: new Date('2026-07-24'),
          utilisateur: { id: 'user-1', username: 'Djawad', urlAvatar: null },
          collection: null,
        }));

        const file = {
          originalname: 'photo.jpg',
          buffer: Buffer.from('img'),
        } as Express.Multer.File;
        const result = await service.createPost(
          'user-1',
          { contenuTexte: 'Ma tomate' },
          file,
        );

        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
          expect.stringContaining('uploads'),
          file.buffer,
        );
        expect(result.imageUrl).toBe('/uploads/posts/some-uuid.jpg');
      },
    );

    it("retombe sur imageUrl (JSON) quand aucun fichier multipart n'est fourni", async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-1' });
      postRepo.save.mockResolvedValue({ id: 'post-1' });
      postRepo.findOne.mockResolvedValue({
        id: 'post-1',
        userId: 'user-1',
        collectionId: null,
        contenuTexte: 'Texte seul',
        urlImage: null,
        dateCreation: new Date('2026-07-24'),
        utilisateur: { id: 'user-1', username: 'Djawad', urlAvatar: null },
        collection: null,
      });

      await service.createPost('user-1', { contenuTexte: 'Texte seul' });

      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('getFeed — filtre "Près de moi"', () => {
    function buildQb() {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      postRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('applique le filtre de distance réel (haversine SQL) quand filter=near avec une position', async () => {
      const qb = buildQb();
      likeRepo.find.mockResolvedValue([]);

      await service.getFeed('user-1', {
        filter: 'near',
        latitude: 45.75,
        longitude: 4.85,
        radiusMetres: 5000,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'p.latitude IS NOT NULL AND p.longitude IS NOT NULL',
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('acos'),
        { lat: 45.75, lon: 4.85, radius: 5000 },
      );
    });

    it("n'applique aucun filtre de distance sans position réelle, même avec filter=near", async () => {
      const qb = buildQb();
      likeRepo.find.mockResolvedValue([]);

      await service.getFeed('user-1', { filter: 'near' } as any);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it("n'applique aucun filtre de distance pour filter=all même avec une position", async () => {
      const qb = buildQb();
      likeRepo.find.mockResolvedValue([]);

      await service.getFeed('user-1', {
        filter: 'all',
        latitude: 45.75,
        longitude: 4.85,
      } as any);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('toggleLike', () => {
    it("aime un post pas encore aimé par l'utilisateur", async () => {
      postRepo.findOne.mockResolvedValue({ id: 'post-1' });
      likeRepo.findOne.mockResolvedValue(null);
      likeRepo.count.mockResolvedValue(249);

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: true, likesCount: 249 });
      expect(likeRepo.save).toHaveBeenCalled();
    });

    it('retire le like en toggle si déjà aimé', async () => {
      postRepo.findOne.mockResolvedValue({ id: 'post-1' });
      const existingLike = { id: 'like-1', postId: 'post-1', userId: 'user-1' };
      likeRepo.findOne.mockResolvedValue(existingLike);
      likeRepo.count.mockResolvedValue(248);

      const result = await service.toggleLike('user-1', 'post-1');

      expect(result).toEqual({ liked: false, likesCount: 248 });
      expect(likeRepo.remove).toHaveBeenCalledWith(existingLike);
    });

    it('lève NotFoundException sur un post inexistant', async () => {
      postRepo.findOne.mockResolvedValue(null);
      await expect(
        service.toggleLike('user-1', 'post-inconnu'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteComment', () => {
    it("refuse la suppression si l'appelant n'est ni l'auteur du commentaire ni l'auteur du post", async () => {
      commentRepo.findOne.mockResolvedValue({
        id: 'comment-1',
        userId: 'auteur-commentaire',
        publication: { userId: 'auteur-post' },
      });

      await expect(
        service.deleteComment('quelqu-un-d-autre', 'post-1', 'comment-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("autorise l'auteur du post à supprimer le commentaire d'un tiers", async () => {
      const comment = {
        id: 'comment-1',
        userId: 'auteur-commentaire',
        publication: { userId: 'auteur-post' },
      };
      commentRepo.findOne.mockResolvedValue(comment);

      await service.deleteComment('auteur-post', 'post-1', 'comment-1');
      expect(commentRepo.remove).toHaveBeenCalledWith(comment);
    });
  });

  describe('deletePost', () => {
    it("lève NotFoundException si l'appelant n'est pas l'auteur", async () => {
      postRepo.findOne.mockResolvedValue(null);
      await expect(service.deletePost('pas-auteur', 'post-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
