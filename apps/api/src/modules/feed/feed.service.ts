import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
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
  async createPost(
    userId: string,
    dto: CreatePostRequestDto,
    file?: Express.Multer.File,
  ): Promise<CreatePostResponseDto> {
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

    // La vraie photo prise par l'utilisateur (multipart), pas une URL pré-hébergée : avant
    // le 24/07/2026, POST /feed/posts n'acceptait que `imageUrl` en JSON, mais aucun
    // endpoint d'upload générique n'existait pour le feed — la photo du composeur n'était
    // donc jamais envoyée (voir rapport.md). `imageUrl` reste accepté en repli pour ne pas
    // casser un appel JSON existant, mais un fichier fourni est toujours prioritaire.
    let urlImage: string | null = dto.imageUrl || null;
    if (file) {
      const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'posts');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const extension = path.extname(file.originalname) || '.jpg';
      const filename = `${uuidv4()}${extension}`;
      fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
      urlImage = `/uploads/posts/${filename}`;
    }

    const post = new PostEntity();
    post.userId = userId;
    post.collectionId = dto.collectionId || null;
    post.contenuTexte = dto.contenuTexte;
    post.urlImage = urlImage;
    // Hérite du Geo-Tag de la plante taguée (si elle en a un) : c'est ce qui
    // permet au filtre "Près de moi" (cahier des charges §3.3) de fonctionner
    // avec de vraies coordonnées plutôt que de ne jamais matcher aucun post.
    post.latitude = collection?.latitude ?? null;
    post.longitude = collection?.longitude ?? null;

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
    const qb = this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.utilisateur', 'u')
      .leftJoinAndSelect('p.collection', 'c')
      .leftJoinAndSelect('c.plante', 'pl')
      .where('u.dateSuppression IS NULL');

    // Filtre "Près de moi" (cahier des charges §3.3) : appliqué en base, pas seulement
    // calculé puis filtré côté front — sinon un post proche mais hors de la première page
    // (triée par date) ne serait jamais vu. Distance réelle via la formule de haversine en
    // SQL (acos/cos/sin natifs à Postgres, pas besoin de PostGIS) ; LEAST/GREATEST bornent
    // l'argument d'acos à [-1,1] pour éviter un NaN dû aux arrondis flottants sur une
    // distance quasi nulle.
    if (query.filter === 'near' && query.latitude !== undefined && query.longitude !== undefined) {
      const radius = query.radiusMetres ?? 5000;
      qb.andWhere('p.latitude IS NOT NULL AND p.longitude IS NOT NULL').andWhere(
        `(6371000 * acos(
            LEAST(1, GREATEST(-1,
              cos(radians(:lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(:lon))
              + sin(radians(:lat)) * sin(radians(p.latitude))
            ))
          )) <= :radius`,
        { lat: query.latitude, lon: query.longitude, radius },
      );
    }

    const [posts, total] = await qb
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

        const dto = this.mapToResponseDto(post, userId, query.latitude, query.longitude);
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

  // ----- Distance à vol d'oiseau (formule de haversine), en mètres -----
  private static readonly EARTH_RADIUS_METERS = 6_371_000;

  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return FeedService.EARTH_RADIUS_METERS * c;
  }

  // ----- Méthode utilitaire de mapping -----
  private mapToResponseDto(
    post: PostEntity,
    currentUserId: string,
    callerLatitude?: number,
    callerLongitude?: number,
  ): CreatePostResponseDto {
    const distanceMetres =
      callerLatitude !== undefined &&
      callerLongitude !== undefined &&
      post.latitude !== null &&
      post.longitude !== null
        ? Math.round(this.haversineMeters(callerLatitude, callerLongitude, post.latitude, post.longitude))
        : null;

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
      typeCollection: post.collection?.typeCollection,
      likesCount: 0, // sera mis à jour par le service
      commentairesCount: 0,
      estLikedParUtilisateur: false, // sera mis à jour par le service
      distanceMetres,
    };
  }
}