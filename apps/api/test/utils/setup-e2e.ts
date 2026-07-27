import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

/**
 * Bootstrap identique à main.ts (ValidationPipe whitelist) pour que les tests
 * e2e observent le même comportement que le serveur réel.
 */
export async function createE2eApp(): Promise<INestApplication> {
  // Les tests e2e doivent rester déterministes et gratuits (pas d'appel réseau
  // réel à Plant.id) quel que soit le réglage de apps/api/.env pour le serveur de
  // dev réel (qui peut légitimement avoir MOCK_PLANTID=false une fois une vraie
  // clé API configurée). dotenv (utilisé par ConfigModule.forRoot()) ne
  // réécrit jamais une variable déjà présente dans process.env, donc fixer ces
  // deux valeurs ICI, avant la compilation du module, les rend prioritaires sur
  // le contenu réel du fichier .env pour toute la durée des tests.
  process.env.MOCK_PLANTID = 'true';
  process.env.FORCE_MOCK = 'true';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
  return app;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}@e2e.test`;
}
