// apps/api/src/scripts/migrate.ts
//
// Ce projet n'a pas de fichiers de migration TypeORM (pas de dossier
// migrations/, pas de DataSource CLI) : le schéma est créé/mis à jour
// automatiquement au démarrage via `synchronize: true`
// (voir src/config/typeorm.config.ts). Ce script sert juste à déclencher
// cette synchronisation sans démarrer tout le serveur HTTP — utile en CI ou
// via `npm run docker:migrate` avant un `docker:seed`.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function bootstrap() {
  console.log('Connexion à la base et synchronisation du schéma...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('✅ Schéma synchronisé.');
  await app.close();
}

void bootstrap();
