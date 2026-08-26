import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Follower } from '../../entities/follower.entity';
import { User } from '../../entities/user.entity';
import { FollowerService } from './followers.service';
import { FollowersController } from './followers.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follower, User]),
    NotificationsModule,
  ],
  controllers: [FollowersController],
  providers: [FollowerService],
  exports: [FollowerService],
})
export class FollowersModule {}
