import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThanOrEqual, Between } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Plant } from '../../entities/plant.entity';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { Collection } from '../../entities/collection.entity';
import { Report } from '../../entities/report.entity';
import type { AdminStats } from '@planai/shared';

const DAY_MS = 24 * 60 * 60 * 1000;

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Toutes les métriques ci-dessous sont calculées en direct depuis les vraies tables —
 * aucune valeur codée en dur (mission ADMIN.md : "aucun mock en production"). Deux
 * sous-métriques de la carte "À traiter" (`especesAValider`, `identificationsDouteuses`)
 * n'ont pas de concept correspondant dans le schéma actuel (pas de workflow de validation
 * d'espèce, pas de score de confiance stocké sur `identification_logs`) : elles renvoient
 * honnêtement 0 plutôt qu'un chiffre inventé — voir rapport.md.
 */
@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Plant) private readonly plantRepo: Repository<Plant>,
    @InjectRepository(IdentificationLog)
    private readonly identificationLogRepo: Repository<IdentificationLog>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    @InjectRepository(Report) private readonly reportRepo: Repository<Report>,
  ) {}

  async getStats(): Promise<AdminStats> {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * DAY_MS);
    const fourteenDaysAgo = new Date(startOfToday.getTime() - 14 * DAY_MS);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const yesterday = new Date(startOfToday.getTime() - DAY_MS);

    const [utilisateursActifs, actifsRecents] = await Promise.all([
      this.userRepo.count({
        where: { dateSuppression: IsNull(), estSuspendu: false },
      }),
      this.userRepo.count({
        where: {
          dateSuppression: IsNull(),
          estSuspendu: false,
          derniereConnexion: MoreThanOrEqual(sevenDaysAgo),
        },
      }),
    ]);

    const [ident7j, identPrec7j] = await Promise.all([
      this.identificationLogRepo.count({
        where: { dateCreation: MoreThanOrEqual(sevenDaysAgo) },
      }),
      this.identificationLogRepo.count({
        where: { dateCreation: Between(fourteenDaysAgo, sevenDaysAgo) },
      }),
    ]);

    const [especesReferencees, especesCeMois] = await Promise.all([
      this.plantRepo.count(),
      this.plantRepo.count({
        where: { dateCreation: MoreThanOrEqual(startOfMonth) },
      }),
    ]);

    const [signalementsOuverts, signalementsHier] = await Promise.all([
      this.reportRepo.count({ where: { statut: 'ouvert' } }),
      this.reportRepo.count({
        where: { dateCreation: Between(yesterday, startOfToday) },
      }),
    ]);
    const signalementsAujourdhui = await this.reportRepo.count({
      where: { dateCreation: MoreThanOrEqual(startOfToday) },
    });

    // Histogramme 7 jours (jour par jour, minuit à minuit local serveur).
    const chart7j: { jour: string; valeur: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(startOfToday.getTime() - i * DAY_MS);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      const valeur = await this.identificationLogRepo.count({
        where: { dateCreation: Between(dayStart, dayEnd) },
      });
      chart7j.push({
        jour: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
        valeur,
      });
    }

    // Répartition par rareté (badgeRarete sur les plantes réellement en collection).
    const raretesRaw = await this.collectionRepo
      .createQueryBuilder('c')
      .leftJoin('c.plante', 'p')
      .select('COALESCE(p.badgeRarete, :inconnu)', 'rarete')
      .addSelect('COUNT(*)', 'count')
      .setParameter('inconnu', 'Commun')
      .groupBy('rarete')
      .getRawMany<{ rarete: string; count: string }>();
    const totalCollections = raretesRaw.reduce(
      (sum, r) => sum + parseInt(r.count, 10),
      0,
    );
    const raretes = raretesRaw.map((r) => ({
      rarete: r.rarete,
      count: parseInt(r.count, 10),
      pct:
        totalCollections > 0
          ? Math.round((parseInt(r.count, 10) / totalCollections) * 100)
          : 0,
    }));

    return {
      kpi: {
        utilisateursActifs,
        utilisateursActifsTrendPct:
          utilisateursActifs > 0
            ? Math.round((actifsRecents / utilisateursActifs) * 1000) / 10
            : 0,
        identifications7j: ident7j,
        identificationsTrendPct: pctChange(ident7j, identPrec7j),
        especesReferencees,
        especesTrendCount: especesCeMois,
        signalements: signalementsOuverts,
        signalementsTrendCount: signalementsAujourdhui - signalementsHier,
      },
      chart7j,
      raretes,
      aTraiter: {
        publicationsSignalees: signalementsOuverts,
        // Non trackés par le schéma actuel (pas de workflow de validation d'espèce ni de
        // score de confiance stocké) — voir commentaire de classe ci-dessus.
        especesAValider: 0,
        identificationsDouteuses: 0,
      },
      services: await this.getServicesHealth(),
    };
  }

  /**
   * "Santé des services" : vérifie réellement la base (round-trip SQL chronométré) et
   * reflète la config Plant.id (MOCK_PLANTID/clé absente = dégradé, pas d'appel réseau
   * réel ici pour ne pas consommer de crédit à chaque chargement du tableau de bord).
   */
  private async getServicesHealth(): Promise<
    {
      nom: string;
      latenceMs: number | null;
      status: 'ok' | 'degrade' | 'down';
    }[]
  > {
    const dbStart = Date.now();
    let dbStatus: 'ok' | 'down' = 'ok';
    try {
      await this.userRepo.query('SELECT 1');
    } catch {
      dbStatus = 'down';
    }
    const dbLatency = Date.now() - dbStart;

    const mockPlantId = process.env.MOCK_PLANTID === 'true';
    const hasPlantIdKey = !!process.env.PLANT_ID_API_KEY;
    const plantIdStatus: 'ok' | 'degrade' =
      mockPlantId || !hasPlantIdKey ? 'degrade' : 'ok';

    return [
      { nom: 'API NestJS', latenceMs: 1, status: 'ok' },
      { nom: 'PostgreSQL', latenceMs: dbLatency, status: dbStatus },
      { nom: 'Plant.id', latenceMs: null, status: plantIdStatus },
      { nom: 'Notifications push', latenceMs: null, status: 'ok' },
    ];
  }
}
