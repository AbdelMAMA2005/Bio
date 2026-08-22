import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FollowerService } from './followers.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('followers')
export class FollowersController {
  constructor(private readonly followerService: FollowerService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':userId/follow')
  async followUser(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToFollow: string,
  ) {
    return this.followerService.followUser(currentUser.id, userIdToFollow);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':userId/unfollow')
  async unfollowUser(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToUnfollow: string,
  ) {
    await this.followerService.unfollowUser(currentUser.id, userIdToUnfollow);
    return { message: 'Vous ne suivez plus cet utilisateur' };
  }

  @Get(':userId/followers')
  async getFollowers(@Param('userId') userId: string) {
    const followers = await this.followerService.getFollowers(userId);
    const count = await this.followerService.getFollowersCount(userId);
    return {
      count,
      followers: followers.map((f) => ({ ...f.follower, id: f.follower.id })),
    };
  }

  @Get(':userId/following')
  async getFollowing(@Param('userId') userId: string) {
    const following = await this.followerService.getFollowing(userId);
    const count = await this.followerService.getFollowingCount(userId);
    return {
      count,
      following: following.map((f) => ({ ...f.following, id: f.following.id })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':userId/is-following')
  async isFollowing(
    @CurrentUser() currentUser: any,
    @Param('userId') userIdToCheck: string,
  ) {
    const isFollowing = await this.followerService.isFollowing(
      currentUser.id,
      userIdToCheck,
    );
    return { isFollowing };
  }
}
