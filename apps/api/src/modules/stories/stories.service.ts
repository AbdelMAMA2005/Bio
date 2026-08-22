import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Story } from '../../entities/story.entity';
import { StoryView } from '../../entities/story-view.entity';
import { User } from '../../entities/user.entity';
import { StoryMediaType } from '../../entities/enums/story-media-type.enum';
import {
  CreateStoryResponseDto,
  StoryGroupDto,
  StoryMediaDto,
  StoryViewerDto,
} from '../../dto';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private storyRepo: Repository<Story>,
    @InjectRepository(StoryView)
    private storyViewRepo: Repository<StoryView>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Regroupe tous les médias actifs par auteur — comportement "statuts WhatsApp" : plusieurs
   * médias du même utilisateur = UNE seule bulle (`StoryGroupDto`), pas une bulle par média.
   * Tri : bulles avec au moins un média non vu par l'appelant d'abord (par activité la plus
   * récente), puis les bulles entièrement vues — comme la liste de statuts WhatsApp.
   */
  async getGroupedStories(callerId: string): Promise<StoryGroupDto[]> {
    const stories = await this.storyRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.utilisateur', 'u')
      .where('s.dateExpiration > :now', { now: new Date() })
      .andWhere('u.dateSuppression IS NULL')
      .orderBy('s.dateCreation', 'ASC')
      .getMany();

    if (stories.length === 0) {
      return [];
    }

    const storyIds = stories.map((s) => s.id);

    const myViews = await this.storyViewRepo.find({
      where: { storyId: In(storyIds), viewerId: callerId },
    });
    const viewedByMeIds = new Set(myViews.map((v) => v.storyId));

    const viewCountRows = await this.storyViewRepo
      .createQueryBuilder('v')
      .select('v.storyId', 'storyId')
      .addSelect('COUNT(*)', 'count')
      .where('v.storyId IN (:...storyIds)', { storyIds })
      .groupBy('v.storyId')
      .getRawMany<{ storyId: string; count: string }>();
    const viewCountByStoryId = new Map(
      viewCountRows.map((row) => [row.storyId, parseInt(row.count, 10)]),
    );

    const mediasByUserId = new Map<string, Story[]>();
    for (const story of stories) {
      const bucket = mediasByUserId.get(story.userId) ?? [];
      bucket.push(story);
      mediasByUserId.set(story.userId, bucket);
    }

    const groups: StoryGroupDto[] = [];
    for (const [userId, medias] of mediasByUserId) {
      const estMoi = userId === callerId;
      const author = medias[0].utilisateur;

      const mediaDtos: StoryMediaDto[] = medias.map((media) => ({
        id: media.id,
        urlMedia: media.urlMedia,
        mediaType: media.mediaType,
        dateCreation: media.dateCreation,
        dateExpiration: media.dateExpiration,
        // Un auteur a toujours "vu" son propre média — jamais d'anneau "non vu" sur sa
        // propre bulle.
        vuParMoi: estMoi || viewedByMeIds.has(media.id),
        vuesCount: viewCountByStoryId.get(media.id) ?? 0,
      }));

      groups.push({
        idUtilisateur: userId,
        username: author.username ?? '',
        urlAvatar: author.urlAvatar ?? null,
        estMoi,
        entierementVue: mediaDtos.every((m) => m.vuParMoi),
        medias: mediaDtos,
      });
    }

    const latestActivity = (group: StoryGroupDto) =>
      Math.max(...group.medias.map((m) => new Date(m.dateCreation).getTime()));

    groups.sort((a, b) => {
      if (a.entierementVue !== b.entierementVue)
        return a.entierementVue ? 1 : -1;
      return latestActivity(b) - latestActivity(a);
    });

    return groups;
  }

  /** Ajoute un média à la story du jour de l'utilisateur (s'empile dans sa bulle). */
  async createStoryMedia(
    userId: string,
    file: Express.Multer.File,
  ): Promise<CreateStoryResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, dateSuppression: IsNull() },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé ou supprimé');
    }

    // 3 x '..' pour remonter jusqu'à apps/api/ (depuis dist/modules/stories en exécution
    // compilée, ou src/modules/stories en ts-node) — voir collection.service.ts#addPhoto
    // pour le détail du bug corrigé le 24/07/2026 (2 x '..' écrivait dans dist/uploads/,
    // jamais servi par main.ts).
    const uploadDir = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'uploads',
      'stories',
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const extension = path.extname(file.originalname) || '.jpg';
    const filename = `${uuidv4()}${extension}`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
    const urlMedia = `/uploads/stories/${filename}`;
    const mediaType = file.mimetype.startsWith('video/')
      ? StoryMediaType.VIDEO
      : StoryMediaType.IMAGE;

    const story = this.storyRepo.create({
      userId,
      urlMedia,
      mediaType,
      dateExpiration: new Date(Date.now() + STORY_LIFETIME_MS),
    });
    const saved = await this.storyRepo.save(story);

    return {
      id: saved.id,
      idUtilisateur: userId,
      username: user.username ?? '',
      urlAvatar: user.urlAvatar ?? null,
      urlMedia: saved.urlMedia,
      mediaType: saved.mediaType,
      dateCreation: saved.dateCreation,
      dateExpiration: saved.dateExpiration,
    };
  }

  /**
   * Enregistre une vue (une seule par viewer et par média, jamais l'auteur sur son propre
   * média — comportement WhatsApp : on ne "voit" pas son propre statut).
   */
  async recordView(mediaId: string, viewerId: string): Promise<void> {
    const story = await this.storyRepo.findOne({ where: { id: mediaId } });
    if (!story) {
      throw new NotFoundException('Média de story non trouvé');
    }
    if (story.userId === viewerId) {
      return;
    }

    const existing = await this.storyViewRepo.findOne({
      where: { storyId: mediaId, viewerId },
    });
    if (existing) {
      return;
    }

    const view = this.storyViewRepo.create({ storyId: mediaId, viewerId });
    await this.storyViewRepo.save(view);
  }

  /** Liste des vues d'un média — réservée à l'auteur (comportement WhatsApp : privé). */
  async getViewers(
    mediaId: string,
    callerId: string,
  ): Promise<StoryViewerDto[]> {
    const story = await this.storyRepo.findOne({ where: { id: mediaId } });
    if (!story) {
      throw new NotFoundException('Média de story non trouvé');
    }
    if (story.userId !== callerId) {
      throw new ForbiddenException(
        "Seul l'auteur d'une story peut voir qui l'a consultée",
      );
    }

    const views = await this.storyViewRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.viewer', 'u')
      .where('v.storyId = :mediaId', { mediaId })
      .orderBy('v.dateVue', 'DESC')
      .getMany();

    return views.map((view) => ({
      idUtilisateur: view.viewer.id,
      username: view.viewer.username ?? '',
      urlAvatar: view.viewer.urlAvatar ?? null,
      dateVue: view.dateVue,
    }));
  }
}
