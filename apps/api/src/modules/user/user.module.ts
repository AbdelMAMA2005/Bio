import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Collection } from '../../entities/collection.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Collection, RefreshToken]),
    FeedModule,
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
