import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  Body,
  Patch,
} from '@nestjs/common';
import { FollowerService } from './followers.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConnectionCircle } from '../../entities/enums/connection-circle.enum';

@Controller('connections')
export class FollowersController {
  constructor(private readonly followerService: FollowerService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':userId/connect')
  async followUser(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToFollow: string,
  ) {
    return this.followerService.followUser(currentUser.id, userIdToFollow);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':userId/disconnect')
  async unfollowUser(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToUnfollow: string,
  ) {
    await this.followerService.unfollowUser(currentUser.id, userIdToUnfollow);
    return { message: 'Vous ne suivez plus cet utilisateur' };
  }

  @Get(':userId/connections')
  async getFollowers(@Param('userId') userId: string) {
    const followers = await this.followerService.getFollowers(userId);
    const count = await this.followerService.getFollowersCount(userId);
    return {
      count,
      connections: followers.map((f) => ({ ...f.follower, id: f.follower.id, circle: f.circle })),
    };
  }

  @Get(':userId/connected')
  async getFollowing(@Param('userId') userId: string) {
    const following = await this.followerService.getFollowing(userId);
    const count = await this.followerService.getFollowingCount(userId);
    return {
      count,
      connections: following.map((f) => ({ ...f.following, id: f.following.id, circle: f.circle })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':userId/circle')
  async setCircle(
    @CurrentUser() currentUser: any,
    @Param('userId') userId: string,
    @Body('circle') circle: ConnectionCircle,
  ) {
    if (![1, 2, 3].includes(Number(circle))) throw new BadRequestException('Cercle invalide');
    return this.followerService.setCircle(currentUser.id, userId, Number(circle) as ConnectionCircle);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId/is-connected')
  async isConnected(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToCheck: string,
  ) {
    const isFollowing = await this.followerService.isFollowing(
      currentUser.id,
      userIdToCheck,
    );
    return { isConnected: isFollowing };
  }
}
