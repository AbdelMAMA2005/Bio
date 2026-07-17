import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Delete,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import {
  CreatePostRequestDto,
  CreateCommentRequestDto,
  FeedQueryDto,
} from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // ----- Créer une publication -----
  @Post('posts')
  async createPost(
    @CurrentUser() user: any,
    @Body() dto: CreatePostRequestDto,
  ) {
    return this.feedService.createPost(user.id, dto);
  }

  // ----- Récupérer le feed -----
  @Get()
  async getFeed(
    @CurrentUser() user: any,
    @Query() query: FeedQueryDto,
  ) {
    return this.feedService.getFeed(user.id, query);
  }

  // ----- Liker/Unliker une publication -----
  @Post('posts/:id/like')
  async toggleLike(
    @CurrentUser() user: any,
    @Param('id') postId: string,
  ) {
    return this.feedService.toggleLike(user.id, postId);
  }

  // ----- Ajouter un commentaire -----
  @Post('posts/:id/comments')
  async addComment(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Body() dto: CreateCommentRequestDto,
  ) {
    return this.feedService.addComment(user.id, postId, dto);
  }

  // ----- Récupérer les commentaires -----
  @Get('posts/:id/comments')
  async getComments(@Param('id') postId: string) {
    return this.feedService.getComments(postId);
  }

  // ----- Supprimer une publication -----
  @Delete('posts/:id')
  async deletePost(
    @CurrentUser() user: any,
    @Param('id') postId: string,
  ) {
    return this.feedService.deletePost(user.id, postId);
  }
}