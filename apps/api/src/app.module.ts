// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'path';
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
import { FollowersModule } from './modules/followers/followers.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../.env'), resolve(__dirname, '../../.env')],
    }),
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
    FollowersModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
