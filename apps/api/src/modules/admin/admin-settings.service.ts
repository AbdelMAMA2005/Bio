import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from '../../entities/feature-flag.entity';
import { DEFAULT_FEATURE_FLAGS } from './admin-seed-defaults';
import type { AdminApiKeyStatus, AdminFeatureFlag } from '@planai/shared';

/**
 * Clés d'API jamais affichées en clair (mission ADMIN.md §4) : seule leur PRÉSENCE/état
 * est exposé, jamais leur valeur — lues depuis `process.env`, jamais depuis une table.
 */
@Injectable()
export class AdminSettingsService {
  constructor(
    @InjectRepository(FeatureFlag)
    private readonly flagRepo: Repository<FeatureFlag>,
  ) {}

  /** Même filet de sécurité que AdminQuestsService#ensureSeeded (voir ce commentaire). */
  private async ensureSeeded(): Promise<void> {
    const count = await this.flagRepo.count();
    if (count > 0) return;
    await this.flagRepo.save(
      DEFAULT_FEATURE_FLAGS.map((f) => this.flagRepo.create(f)),
    );
  }

  async listFlags(): Promise<AdminFeatureFlag[]> {
    await this.ensureSeeded();
    const flags = await this.flagRepo.find({ order: { libelle: 'ASC' } });
    return flags.map((f) => ({
      cle: f.cle,
      libelle: f.libelle,
      description: f.description,
      actif: f.actif,
    }));
  }

  async setFlag(cle: string, actif: boolean): Promise<AdminFeatureFlag> {
    await this.ensureSeeded();
    const flag = await this.flagRepo.findOne({ where: { cle } });
    if (!flag) throw new NotFoundException('Fonctionnalité inconnue.');
    flag.actif = actif;
    await this.flagRepo.save(flag);
    return {
      cle: flag.cle,
      libelle: flag.libelle,
      description: flag.description,
      actif: flag.actif,
    };
  }

  getApiKeysStatus(): AdminApiKeyStatus[] {
    const mockPlantId = process.env.MOCK_PLANTID === 'true';
    const hasPlantIdKey = !!process.env.PLANT_ID_API_KEY;
    return [
      {
        nom: 'Plant.id',
        env: 'PLANT_ID_API_KEY',
        status: mockPlantId ? 'degrade' : hasPlantIdKey ? 'connecte' : 'absent',
      },
      {
        nom: 'Connexion Google',
        env: 'GOOGLE_CLIENT_ID',
        status: process.env.GOOGLE_CLIENT_ID ? 'connecte' : 'absent',
      },
    ];
  }
}
