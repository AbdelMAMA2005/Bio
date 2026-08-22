import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { Collection } from '../../entities/collection.entity';
import { Post } from '../../entities/posts.entity';
import { Like } from '../../entities/like.entity';
import { User } from '../../entities/user.entity';
import { QuestProgress } from '../../entities/quest-progress.entity';
import { PlantType } from '../../entities/enums/plant-type.enum';
import { QuestResponseDto } from '../../dto';
import { QUEST_CATALOG } from './quest-catalog';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(IdentificationLog)
    private readonly identificationLogRepo: Repository<IdentificationLog>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(Like)
    private readonly likeRepo: Repository<Like>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(QuestProgress)
    private readonly questProgressRepo: Repository<QuestProgress>,
  ) {}

  /**
   * Calcule la progression réelle de chaque défi du jour à partir des tables
   * métier (identification_logs, collection, posts, likes) — jamais d'une valeur
   * stockée qui pourrait diverger de la réalité. Crédite XP + pièces exactement
   * une fois par défi/jour/utilisateur, au moment où la progression bascule sur
   * "complet" (voir QuestProgress).
   */
  async getDailyQuests(userId: string): Promise<QuestResponseDto[]> {
    const date = todayUtc();
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const progressions = await this.computeRealProgressions(
      userId,
      startOfDay,
      endOfDay,
    );

    const results: QuestResponseDto[] = [];
    for (const quest of QUEST_CATALOG) {
      const progression = Math.min(progressions[quest.id] ?? 0, quest.objectif);
      const complete = progression >= quest.objectif;

      // creditRewardOnce renvoie directement si la récompense est (déjà ou
      // désormais) créditée — évite une relecture séparée qui pourrait ne pas
      // refléter l'écriture qu'on vient de faire selon le niveau d'isolation.
      const recompenseCreditee = complete
        ? await this.creditRewardOnce(
            userId,
            quest.id,
            date,
            quest.recompenseXp,
            quest.recompensePieces,
          )
        : false;

      results.push({
        id: quest.id,
        libelle: quest.libelle,
        type: 'quotidien',
        progression,
        objectif: quest.objectif,
        complete,
        recompense: {
          xp: recompenseCreditee ? quest.recompenseXp : 0,
          pieces: recompenseCreditee ? quest.recompensePieces : 0,
        },
      });
    }
    return results;
  }

  private async computeRealProgressions(
    userId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<Record<string, number>> {
    const [scanRows, gardenAdds, postsToday, likesToday] = await Promise.all([
      // Espèces distinctes identifiées aujourd'hui.
      this.identificationLogRepo
        .createQueryBuilder('log')
        .select('DISTINCT log.plantId', 'plantId')
        .where('log.userId = :userId', { userId })
        .andWhere('log.dateCreation BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getRawMany(),
      // Ajouts au Jardin (owned) aujourd'hui.
      this.collectionRepo
        .createQueryBuilder('c')
        .where('c.userId = :userId', { userId })
        .andWhere('c.typeCollection = :type', { type: PlantType.OWNED })
        .andWhere('c.dateAjout BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getCount(),
      // Publications créées aujourd'hui.
      this.postRepo
        .createQueryBuilder('p')
        .where('p.userId = :userId', { userId })
        .andWhere('p.dateCreation BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getCount(),
      // Likes reçus aujourd'hui sur n'importe laquelle de ses publications.
      this.likeRepo
        .createQueryBuilder('l')
        .innerJoin('l.publication', 'p')
        .where('p.userId = :userId', { userId })
        .andWhere('l.dateCreation BETWEEN :start AND :end', {
          start: startOfDay,
          end: endOfDay,
        })
        .getCount(),
    ]);

    return {
      'scan-3': scanRows.length,
      'add-garden': gardenAdds,
      'publish-tip': postsToday,
      'get-5-likes': likesToday,
    };
  }

  private async creditRewardOnce(
    userId: string,
    questId: string,
    date: string,
    xp: number,
    pieces: number,
  ): Promise<boolean> {
    const existing = await this.questProgressRepo.findOne({
      where: { userId, questId, date },
    });
    if (existing?.recompenseCreditee) return true;

    if (xp > 0) {
      await this.userRepo.increment({ id: userId }, 'experience', xp);
    }
    if (pieces > 0) {
      await this.userRepo.increment({ id: userId }, 'pieces', pieces);
    }

    if (existing) {
      existing.recompenseCreditee = true;
      await this.questProgressRepo.save(existing);
    } else {
      await this.questProgressRepo.save(
        this.questProgressRepo.create({
          userId,
          questId,
          date,
          recompenseCreditee: true,
        }),
      );
    }
    return true;
  }
}
