import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Post as PostEntity } from '../../entities/posts.entity';
import { Like as LikeEntity } from '../../entities/like.entity';
import { Comment as CommentEntity } from '../../entities/comment.entity';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import {
  CreatePostRequestDto,
  CreatePostResponseDto,
  CreateCommentRequestDto,
  CreateCommentResponseDto,
  FeedQueryDto,
  UpdatePostDto,
} from '../../dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
    @InjectRepository(LikeEntity)
    private likeRepo: Repository<LikeEntity>,
    @InjectRepository(CommentEntity)
    private commentRepo: Repository<CommentEntity>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Collection)
    private collectionRepo: Repository<Collection>,
  ) {}

  // ----- Créer une publication -----
  async createPost(userId: string, dto: CreatePostRequestDto): Promise<CreatePostResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, dateSuppression: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé ou supprimé');
    }

    let collection: Collection | null = null;
    if (dto.collectionId) {
      collection = await this.collectionRepo.findOne({
        where: { id: dto.collectionId, userId },
        relations: { plante: true },
      });
      if (!collection) {
        throw new NotFoundException('Collection non trouvée ou ne vous appartient pas');
      }
    }

    const post = new PostEntity();
    post.userId = userId;
    post.collectionId = dto.collectionId || null;
    post.contenuTexte = dto.contenuTexte;
    post.urlImage = dto.imageUrl || null;

    const saved = await this.postRepo.save(post);

    // Recharger avec les relations
    const fullPost = await this.postRepo.findOne({
      where: { id: saved.id },
      relations: { utilisateur: true, collection: { plante: true } },
    });

    if (!fullPost) {
      throw new NotFoundException('Publication créée mais non trouvée');
    }

    return this.mapToResponseDto(fullPost, userId);
  }

  // ----- Récupérer le feed (paginé) -----
  async getFeed(userId: string, query: FeedQueryDto): Promise<{ items: CreatePostResponseDto[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Récupérer les posts des utilisateurs non supprimés
    const [posts, total] = await this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.utilisateur', 'u')
      .leftJoinAndSelect('p.collection', 'c')
      .leftJoinAndSelect('c.plante', 'pl')
      .where('u.dateSuppression IS NULL')
      .orderBy('p.dateCreation', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Récupérer les likes de l'utilisateur pour ces posts
    const postIds = posts.map((p) => p.id);
    const userLikes = await this.likeRepo.find({
      where: {
        postId: In(postIds),
        userId: userId,
      },
    });
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // Compter les likes et commentaires pour chaque post
    const items = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentairesCount] = await Promise.all([
          this.likeRepo.count({ where: { postId: post.id } }),
          this.commentRepo.count({ where: { postId: post.id } }),
        ]);

        const dto = this.mapToResponseDto(post, userId);
        dto.likesCount = likesCount;
        dto.commentairesCount = commentairesCount;
        dto.estLikedParUtilisateur = likedPostIds.has(post.id);
        return dto;
      }),
    );

    return { items, total };
  }

  // ----- Mettre à jour une publication -----
  async updatePost(userId: string, postId: string, dto: UpdatePostDto): Promise<CreatePostResponseDto> {
    const post = await this.postRepo.findOne({
      where: { id: postId, userId },
      relations: { utilisateur: true, collection: { plante: true } },
    });
    if (!post) {
      throw new NotFoundException('Publication non trouvée ou vous n\'êtes pas l\'auteur');
    }

    if (dto.contenuTexte !== undefined) {
      post.contenuTexte = dto.contenuTexte;
    }
    if (dto.imageUrl !== undefined) {
      post.urlImage = dto.imageUrl;
    }

    const saved = await this.postRepo.save(post);

    const [likesCount, commentairesCount] = await Promise.all([
      this.likeRepo.count({ where: { postId: saved.id } }),
      this.commentRepo.count({ where: { postId: saved.id } }),
    ]);

    const isLiked = await this.likeRepo.count({ where: { postId: saved.id, userId } });

    const response = this.mapToResponseDto(saved, userId);
    response.likesCount = likesCount;
    response.commentairesCount = commentairesCount;
    response.estLikedParUtilisateur = isLiked > 0;
    return response;
  }

  // ----- Liker ou unliker une publication (toggle) -----
  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Publication non trouvée');
    }

    const existingLike = await this.likeRepo.findOne({
      where: { postId: postId, userId: userId },
    });

    if (existingLike) {
      await this.likeRepo.remove(existingLike);
      const likesCount = await this.likeRepo.count({ where: { postId: postId } });
      return { liked: false, likesCount };
    } else {
      const like = this.likeRepo.create({
        postId: postId,
        userId: userId,
      });
      await this.likeRepo.save(like);
      const likesCount = await this.likeRepo.count({ where: { postId: postId } });
      return { liked: true, likesCount };
    }
  }

  // ----- Retirer un like explicitement -----
  async unlikePost(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Publication non trouvée');
    }

    const existingLike = await this.likeRepo.findOne({
      where: { postId: postId, userId: userId },
    });

    if (existingLike) {
      await this.likeRepo.remove(existingLike);
    }
    const likesCount = await this.likeRepo.count({ where: { postId: postId } });
    return { liked: false, likesCount };
  }

  // ----- Ajouter un commentaire -----
  async addComment(
    userId: string,
    postId: string,
    dto: CreateCommentRequestDto,
  ): Promise<CreateCommentResponseDto> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Publication non trouvée');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, dateSuppression: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé ou supprimé');
    }

    const comment = this.commentRepo.create({
      postId: postId,
      userId: userId,
      contenu: dto.contenu,
    });

    const saved = await this.commentRepo.save(comment);

    return {
      id: saved.id,
      idPost: saved.postId,
      idUtilisateur: saved.userId,
      contenu: saved.contenu,
      dateCreation: saved.dateCreation,
      auteur: {
        id: user.id,
        nomUtilisateur: user.nomUtilisateur,
        urlAvatar: user.urlAvatar,
      },
    };
  }

  // ----- Récupérer les commentaires d'une publication -----
  async getComments(postId: string): Promise<CreateCommentResponseDto[]> {
    const comments = await this.commentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.utilisateur', 'u')
      .where('c.postId = :postId', { postId })
      .orderBy('c.dateCreation', 'ASC')
      .getMany();

    return comments.map((c) => ({
      id: c.id,
      idPost: c.postId,
      idUtilisateur: c.userId,
      contenu: c.contenu,
      dateCreation: c.dateCreation,
      auteur: {
        id: c.utilisateur.id,
        nomUtilisateur: c.utilisateur.nomUtilisateur,
        urlAvatar: c.utilisateur.urlAvatar,
      },
    }));
  }

  // ----- Supprimer un commentaire -----
  async deleteComment(userId: string, postId: string, commentId: string): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id: commentId, postId },
      relations: { publication: true },
    });
    if (!comment) {
      throw new NotFoundException('Commentaire non trouvé');
    }

    if (comment.userId !== userId && comment.publication.userId !== userId) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à supprimer ce commentaire");
    }

    await this.commentRepo.remove(comment);
  }

  // ----- Supprimer une publication (seulement si c'est l'auteur) -----
  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.postRepo.findOne({
      where: { id: postId, userId: userId },
    });
    if (!post) {
      throw new NotFoundException('Publication non trouvée ou vous n\'êtes pas l\'auteur');
    }

    // Supprimer les likes et commentaires en cascade via TypeORM
    await this.postRepo.remove(post);
  }

  // ----- Méthode utilitaire de mapping -----
  private mapToResponseDto(post: PostEntity, currentUserId: string): CreatePostResponseDto {
    return {
      id: post.id,
      idUtilisateur: post.userId,
      idCollection: post.collectionId || undefined,
      contenuTexte: post.contenuTexte,
      imageUrl: post.urlImage || undefined,
      dateCreation: post.dateCreation,
      auteur: {
        id: post.utilisateur.id,
        nomUtilisateur: post.utilisateur.nomUtilisateur,
        urlAvatar: post.utilisateur.urlAvatar,
      },
      plante: post.collection?.plante
        ? {
            id: post.collection.plante.id,
            nomScientifique: post.collection.plante.nomScientifique,
            nomCommun: post.collection.plante.nomCommun,
            badgeRarete: post.collection.plante.badgeRarete,
            urlImage: post.collection.plante.urlImage,
          }
        : undefined,
      likesCount: 0, // sera mis à jour par le service
      commentairesCount: 0,
      estLikedParUtilisateur: false, // sera mis à jour par le service
    };
  }
}