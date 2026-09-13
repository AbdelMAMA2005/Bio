// apps/api/src/scripts/create-admin.ts
//
// Promeut un compte existant au rôle 'admin' pour la console (apps/admin) — le compte
// doit déjà exister (créé via POST /auth/register, dans l'app mobile ou avec curl).
// Volontairement séparé du seed automatique : un mot de passe admin par défaut connu
// dans le code serait une faille de sécurité (voir rapport.md).
//
// Usage : npm run create-admin --workspace=api -- djawad@planai.app
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

async function bootstrap() {
  const email = process.argv[2];
  if (!email) {
    console.error(
      'Usage : npm run create-admin --workspace=api -- <email>\n' +
        "(le compte doit déjà exister — inscrivez-vous d'abord via POST /auth/register)",
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { email } });
  if (!user) {
    console.error(
      `❌ Aucun compte trouvé pour ${email}. Inscrivez-vous d'abord via l'app ou POST /auth/register.`,
    );
    await app.close();
    process.exitCode = 1;
    return;
  }

  user.role = 'admin';
  user.estAdmin = true;
  await userRepo.save(user);
  console.log(
    `✅ ${email} est maintenant administrateur — connectez-vous sur la console avec ce compte.`,
  );

  await app.close();
}

void bootstrap();
