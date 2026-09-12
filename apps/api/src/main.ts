import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Le front (Expo web + device) est servi depuis une autre origine/port : sans
  // CORS, le navigateur bloque les requêtes avant même qu'elles n'atteignent l'API.
  // CORS_ORIGIN (liste séparée par des virgules) restreint aux origines explicitement
  // autorisées en prod ; à défaut (dev), on n'autorise que localhost/IP LAN (Expo web +
  // device sur le même réseau), jamais un `origin: true`/`*` ouvert à tout le web.
  const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const devLanOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):\d+$/;
  app.enableCors({
    origin: configuredOrigins.length > 0 ? configuredOrigins : devLanOrigin,
    credentials: true,
  });

  // Servir les fichiers statiques du dossier 'uploads'
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Validation DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PlanAI API')
    .setDescription("Documentation de l'API PlanAI pour le front-end")
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
