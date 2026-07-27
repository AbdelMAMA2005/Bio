import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from '../../entities/story.entity';
import { StoryView } from '../../entities/story-view.entity';
import { User } from '../../entities/user.entity';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Story, StoryView, User])],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
