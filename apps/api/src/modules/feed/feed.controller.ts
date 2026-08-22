import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Delete,
  Patch,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FeedService } from './feed.service';
import {
  CreatePostRequestDto,
  CreateCommentRequestDto,
  FeedQueryDto,
  UpdatePostDto,
} from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // ----- Créer une publication -----
  // `image` (multipart) optionnelle : la vraie photo prise dans le composeur, voir
  // feed.service.ts#createPost. `contenuTexte`/`collectionId` arrivent comme champs
  // multipart classiques, parsés par la même DTO que l'ancien corps JSON.
  @Post('posts')
  @UseInterceptors(FileInterceptor('image'))
  async createPost(
    @CurrentUser() user: any,
    @Body() dto: CreatePostRequestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.feedService.createPost(user.id, dto, file);
  }

  // ----- Modifier une publication -----
  @Patch('posts/:id')
  async updatePost(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.feedService.updatePost(user.id, postId, dto);
  }

  // ----- Récupérer le feed -----
  @Get()
  async getFeed(@CurrentUser() user: any, @Query() query: FeedQueryDto) {
    return this.feedService.getFeed(user.id, query);
  }

  // ----- Liker/Unliker une publication (toggle) -----
  @Post('posts/:id/like')
  async toggleLike(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.feedService.toggleLike(user.id, postId);
  }

  // ----- Retirer un like (déliker) -----
  @Delete('posts/:id/like')
  async unlikePost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.feedService.unlikePost(user.id, postId);
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

  // ----- Supprimer un commentaire -----
  @Delete('posts/:id/comments/:commentId')
  async deleteComment(
    @CurrentUser() user: any,
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.feedService.deleteComment(user.id, postId, commentId);
    return { success: true };
  }

  // ----- Supprimer une publication -----
  @Delete('posts/:id')
  async deletePost(@CurrentUser() user: any, @Param('id') postId: string) {
    return this.feedService.deletePost(user.id, postId);
  }
}
