import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/posts.entity';
import { Like } from '../../entities/like.entity';
import { Comment } from '../../entities/comment.entity';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Post, Like, Comment, User, Collection])],
  controllers: [FeedController],
  providers: [FeedService],
  exports: [FeedService],
})
export class FeedModule {}
