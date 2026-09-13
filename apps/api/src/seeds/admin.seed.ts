// apps/api/src/seeds/admin.seed.ts
import { DataSource } from 'typeorm';
import { Quest } from '../entities/quest.entity';
import { FeatureFlag } from '../entities/feature-flag.entity';
import { QUEST_CATALOG } from '../modules/quests/quest-catalog';
import { DEFAULT_FEATURE_FLAGS } from '../modules/admin/admin-seed-defaults';

/**
 * Graine les tables éditables depuis la console admin (défis + fonctionnalités) — même
 * filet de sécurité que AdminQuestsService/AdminSettingsService (repli paresseux au 1er
 * accès), exécuté ici explicitement pour un premier démarrage propre via `npm run seed`.
 */
export async function seedAdminDefaults(dataSource: DataSource) {
  const questRepo = dataSource.getRepository(Quest);
  const flagRepo = dataSource.getRepository(FeatureFlag);

  if ((await questRepo.count()) === 0) {
    await questRepo.save(
      QUEST_CATALOG.map((q) =>
        questRepo.create({
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
    console.log(`✅ ${QUEST_CATALOG.length} défis seedés avec succès.`);
  } else {
    console.log('✅ Les défis sont déjà seedés.');
  }

  if ((await flagRepo.count()) === 0) {
    await flagRepo.save(DEFAULT_FEATURE_FLAGS.map((f) => flagRepo.create(f)));
    console.log(
      `✅ ${DEFAULT_FEATURE_FLAGS.length} fonctionnalités seedées avec succès.`,
    );
  } else {
    console.log('✅ Les fonctionnalités sont déjà seedées.');
  }
}
