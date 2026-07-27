import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Le front (Expo web + device) est servi depuis une autre origine/port : sans
  // CORS, le navigateur bloque les requêtes avant même qu'elles n'atteignent l'API.
  app.enableCors();

  // Servir les fichiers statiques du dossier 'uploads'
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Validation DTO
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

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
bootstrap();