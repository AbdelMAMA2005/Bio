import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { Collection } from '../../entities/collection.entity';
import { Post } from '../../entities/posts.entity';
import { Like } from '../../entities/like.entity';
import { User } from '../../entities/user.entity';
import { QuestProgress } from '../../entities/quest-progress.entity';
import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdentificationLog, Collection, Post, Like, User, QuestProgress]),
  ],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
