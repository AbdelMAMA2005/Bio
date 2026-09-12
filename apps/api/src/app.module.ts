// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { typeOrmConfig } from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { IdentificationModule } from './modules/identification/identification.module';
import { CollectionModule } from './modules/collection/collection.module';
import { UserModule } from './modules/user/user.module';
import { FeedModule } from './modules/feed/feed.module';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module';
import { PlantsModule } from './modules/plants/plants.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { QuestsModule } from './modules/quests/quests.module';
import { StoriesModule } from './modules/stories/stories.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting global (défaut : 100 req/min/IP) ; des limites plus strictes sont
    // posées via @Throttle sur les endpoints sensibles (auth, identification, diagnosis,
    // uploads) directement dans leurs contrôleurs.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        typeOrmConfig(configService),
      inject: [ConfigService],
    }),
    AuthModule,
    IdentificationModule,
    CollectionModule,
    UserModule,
    FeedModule,
    DiagnosisModule,
    PlantsModule,
    RemindersModule,
    QuestsModule,
    StoriesModule,
    NotificationsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
