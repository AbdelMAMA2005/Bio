import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from '../../entities/quest.entity';
import { QuestProgress } from '../../entities/quest-progress.entity';
import { User } from '../../entities/user.entity';
import { QUEST_CATALOG } from '../quests/quest-catalog';
import type { AdminQuest } from '@planai/shared';
import type { AdminCreateQuestDto, AdminUpdateQuestDto } from '../../dto';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class AdminQuestsService {
  constructor(
    @InjectRepository(Quest) private readonly questRepo: Repository<Quest>,
    @InjectRepository(QuestProgress)
    private readonly questProgressRepo: Repository<QuestProgress>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Graine la table depuis QUEST_CATALOG au tout premier accès (jamais si des lignes
   * existent déjà, même partielles) — filet de sécurité pour ne jamais présenter une
   * console vide avant qu'un `npm run seed` explicite ait tourné (voir scripts/seed.ts).
   */
  private async ensureSeeded(): Promise<void> {
    const count = await this.questRepo.count();
    if (count > 0) return;
    await this.questRepo.save(
      QUEST_CATALOG.map((q) =>
        this.questRepo.create({
          id: q.id,
          libelle: q.libelle,
          type: q.type ?? 'quotidien',
          objectif: q.objectif,
          recompenseXp: q.recompenseXp,
          recompensePieces: q.recompensePieces,
          actif: true,
        }),
      ),
    );
  }

  async list(): Promise<AdminQuest[]> {
    await this.ensureSeeded();
    const quests = await this.questRepo.find({ order: { libelle: 'ASC' } });
    const activeUsers = await this.userRepo.count({
      where: { estSuspendu: false },
    });
    const date = todayUtc();

    const results: AdminQuest[] = [];
    for (const q of quests) {
      const completions = await this.questProgressRepo.count({
        where: { questId: q.id, date, recompenseCreditee: true },
      });
      results.push({
        id: q.id,
        libelle: q.libelle,
        type: q.type,
        objectif: q.objectif,
        recompenseXp: q.recompenseXp,
        recompensePieces: q.recompensePieces,
        actif: q.actif,
        tauxCompletion:
          activeUsers > 0 ? Math.round((completions / activeUsers) * 100) : 0,
      });
    }
    return results;
  }

  async create(dto: AdminCreateQuestDto): Promise<AdminQuest> {
    await this.ensureSeeded();
    const existing = await this.questRepo.findOne({ where: { id: dto.id } });
    if (existing) {
      throw new ConflictException('Un défi avec cet identifiant existe déjà.');
    }
    const quest = await this.questRepo.save(
      this.questRepo.create({ ...dto, actif: true }),
    );
    return {
      id: quest.id,
      libelle: quest.libelle,
      type: quest.type,
      objectif: quest.objectif,
      recompenseXp: quest.recompenseXp,
      recompensePieces: quest.recompensePieces,
      actif: quest.actif,
      tauxCompletion: 0,
    };
  }

  async update(id: string, dto: AdminUpdateQuestDto): Promise<AdminQuest> {
    const quest = await this.questRepo.findOne({ where: { id } });
    if (!quest) throw new NotFoundException('Défi non trouvé.');

    if (dto.libelle !== undefined) quest.libelle = dto.libelle;
    if (dto.type !== undefined) quest.type = dto.type;
    if (dto.objectif !== undefined) quest.objectif = dto.objectif;
    if (dto.recompenseXp !== undefined) quest.recompenseXp = dto.recompenseXp;
    if (dto.recompensePieces !== undefined)
      quest.recompensePieces = dto.recompensePieces;
    if (dto.actif !== undefined) quest.actif = dto.actif;
    await this.questRepo.save(quest);

    const all = await this.list();
    return all.find((q) => q.id === id)!;
  }
}
