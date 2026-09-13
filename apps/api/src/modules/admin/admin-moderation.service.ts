import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportTargetType } from '../../entities/report.entity';
import { Post } from '../../entities/posts.entity';
import { Comment } from '../../entities/comment.entity';
import { Story } from '../../entities/story.entity';
import type { AdminReportGroup } from '@planai/shared';
import type { AdminModerationQueryDto } from '../../dto';

/**
 * File de modération — groupe les signalements par contenu ciblé (`targetType` +
 * `targetId`) : plusieurs personnes peuvent signaler la même publication, la console
 * affiche UNE carte avec un compteur, pas une carte par signalement (voir maquette).
 */
@Injectable()
export class AdminModerationService {
  constructor(
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
    @InjectRepository(Post) private readonly postRepo: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepo: Repository<Comment>,
    @InjectRepository(Story) private readonly storyRepo: Repository<Story>,
  ) {}

  async list(
    query: AdminModerationQueryDto,
  ): Promise<{ items: AdminReportGroup[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    // Un groupe = (targetType, targetId) parmi les signalements encore ouverts. On lit
    // toutes les lignes ouvertes puis on groupe en mémoire — le volume de signalements
    // reste faible par nature (pas un flux à haut débit comme les posts eux-mêmes).
    const openReports = await this.reportRepo.find({
      where: { statut: 'ouvert' },
      order: { dateCreation: 'DESC' },
    });

    const groups = new Map<string, Report[]>();
    for (const r of openReports) {
      const key = `${r.targetType}:${r.targetId}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(r);
      groups.set(key, bucket);
    }

    const allGroups: AdminReportGroup[] = Array.from(groups.values()).map(
      (reports) => {
        const latest = reports[0];
        return {
          id: latest.id,
          targetType: latest.targetType,
          targetId: latest.targetId,
          auteurCible: latest.auteurCible,
          motif: latest.motif,
          extrait: latest.extrait,
          signalementsCount: reports.length,
          statut: latest.statut,
          dateCreation: latest.dateCreation.toISOString(),
        };
      },
    );

    const total = allGroups.length;
    const items = allGroups.slice(
      (page - 1) * limit,
      (page - 1) * limit + limit,
    );
    return { items, total };
  }

  /** Marque tous les signalements ouverts visant ce contenu comme ignorés (contenu conservé). */
  async ignore(reportId: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement non trouvé.');
    await this.reportRepo.update(
      {
        targetType: report.targetType,
        targetId: report.targetId,
        statut: 'ouvert',
      },
      { statut: 'ignore', dateTraitement: new Date() },
    );
  }

  /** Supprime réellement le contenu signalé (post/story/commentaire) + clôt les signalements. */
  async remove(reportId: string): Promise<void> {
    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement non trouvé.');

    await this.deleteTarget(report.targetType, report.targetId);

    await this.reportRepo.update(
      {
        targetType: report.targetType,
        targetId: report.targetId,
        statut: 'ouvert',
      },
      { statut: 'supprime', dateTraitement: new Date() },
    );
  }

  private async deleteTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<void> {
    if (targetType === 'post') {
      const post = await this.postRepo.findOne({ where: { id: targetId } });
      if (post) await this.postRepo.remove(post);
    } else if (targetType === 'comment') {
      const comment = await this.commentRepo.findOne({
        where: { id: targetId },
      });
      if (comment) await this.commentRepo.remove(comment);
    } else if (targetType === 'story') {
      const story = await this.storyRepo.findOne({ where: { id: targetId } });
      if (story) await this.storyRepo.remove(story);
    } else {
      throw new BadRequestException('Type de contenu signalé inconnu.');
    }
  }
}
