// apps/api/src/scripts/seed.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { seedPlants } from '../seeds/plant.seed';
import { seedAdminDefaults } from '../seeds/admin.seed';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  await seedPlants(dataSource);
  await seedAdminDefaults(dataSource);
  await app.close();
}

void bootstrap();
