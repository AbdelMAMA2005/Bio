import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from '../../entities/story.entity';
import { StoryView } from '../../entities/story-view.entity';
import { User } from '../../entities/user.entity';
import { Follower } from '../../entities/follower.entity';
import { StoryLike } from '../../entities/story-like.entity';
import { StoryComment } from '../../entities/story-comment.entity';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Story, StoryView, User, Follower, StoryLike, StoryComment]), NotificationsModule],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule {}
