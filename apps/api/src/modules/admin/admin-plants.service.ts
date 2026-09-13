import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { PlantsService } from '../plants/plants.service';
import type { AdminPlant, AdminPlantsPage } from '@planai/shared';
import type {
  AdminCreatePlantDto,
  AdminPlantsQueryDto,
  AdminUpdatePlantDto,
} from '../../dto';

/**
 * Enveloppe PlantsService (CRUD déjà existant, réutilisé tel quel pour ne jamais diverger
 * de la logique métier publique) en ajoutant ce dont la console a besoin en plus :
 * `capturesCount` par espèce (jamais exposé par GET /plants, coûteux pour le mobile qui
 * n'en a pas besoin) et un espace de routes /admin/plants distinct, gardé par RoleGuard.
 */
@Injectable()
export class AdminPlantsService {
  constructor(
    @InjectRepository(Plant) private readonly plantRepo: Repository<Plant>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly plantsService: PlantsService,
  ) {}

  async list(query: AdminPlantsQueryDto): Promise<AdminPlantsPage> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const qb = this.plantRepo.createQueryBuilder('p');

    if (query.q) {
      qb.andWhere(
        '(LOWER(p.nomScientifique) LIKE :q OR LOWER(p.nomCommun) LIKE :q OR LOWER(p.famille) LIKE :q)',
        { q: `%${query.q.toLowerCase()}%` },
      );
    }

    qb.orderBy('p.nomCommun', 'ASC');
    const total = await qb.getCount();
    const plants = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const counts = await this.capturesCounts(plants.map((p) => p.id));

    return {
      items: plants.map((p) => this.toAdminPlant(p, counts.get(p.id) ?? 0)),
      total,
    };
  }

  private async capturesCounts(
    plantIds: string[],
  ): Promise<Map<string, number>> {
    if (plantIds.length === 0) return new Map();
    const rows = await this.collectionRepo
      .createQueryBuilder('c')
      .select('c.plantId', 'plantId')
      .addSelect('COUNT(*)', 'count')
      .where('c.plantId IN (:...plantIds)', { plantIds })
      .groupBy('c.plantId')
      .getRawMany<{ plantId: string; count: string }>();
    return new Map(rows.map((r) => [r.plantId, parseInt(r.count, 10)]));
  }

  private toAdminPlant(
    p: {
      id: string;
      nomScientifique: string;
      nomCommun: string | null;
      famille: string | null;
      toxicite: Plant['toxicite'];
      badgeRarete: string | null;
      urlImage: string | null;
      aPropos: string | null;
      conseilsEntretien: Plant['conseilsEntretien'];
    },
    capturesCount: number,
  ): AdminPlant {
    return {
      id: p.id,
      nomScientifique: p.nomScientifique,
      nomCommun: p.nomCommun ?? '',
      famille: p.famille,
      toxicite: p.toxicite,
      badgeRarete: p.badgeRarete,
      urlImage: p.urlImage,
      aPropos: p.aPropos,
      conseilsEntretien: p.conseilsEntretien,
      capturesCount,
    };
  }

  async create(dto: AdminCreatePlantDto): Promise<AdminPlant> {
    const created = await this.plantsService.create(dto);
    return this.toAdminPlant(created, 0);
  }

  async update(id: string, dto: AdminUpdatePlantDto): Promise<AdminPlant> {
    const updated = await this.plantsService.update(id, dto);
    const counts = await this.capturesCounts([id]);
    return this.toAdminPlant(updated, counts.get(id) ?? 0);
  }

  async delete(id: string): Promise<void> {
    await this.plantsService.delete(id);
  }
}
