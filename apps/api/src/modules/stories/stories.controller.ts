import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  // ----- Bulles groupées par auteur (comportement "statuts WhatsApp") -----
  @Get()
  async getStories(@CurrentUser() user: any) {
    return this.storiesService.getGroupedStories(user.id);
  }

  // ----- Ajouter un média à sa story du jour (s'empile dans la même bulle) -----
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async createStory(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Aucun fichier fourni. Envoyez un fichier via le champ `image`.',
      );
    }
    return this.storiesService.createStoryMedia(user.id, file);
  }

  // ----- Enregistrer une vue sur un média -----
  @Post(':mediaId/view')
  @HttpCode(204)
  async recordView(
    @CurrentUser() user: any,
    @Param('mediaId') mediaId: string,
  ) {
    await this.storiesService.recordView(mediaId, user.id);
  }

  @Post(':mediaId/like')
  async toggleLike(@CurrentUser() user: any, @Param('mediaId') mediaId: string) {
    return this.storiesService.toggleLike(mediaId, user.id);
  }

  @Post(':mediaId/comments')
  async addComment(@CurrentUser() user: any, @Param('mediaId') mediaId: string, @Body('content') content: string) {
    return this.storiesService.addComment(mediaId, user.id, content);
  }

  @Get(':mediaId/comments')
  async getComments(@CurrentUser() user: any, @Param('mediaId') mediaId: string) {
    return this.storiesService.getComments(mediaId, user.id);
  }

  // ----- Liste des vues d'un média (réservé à son auteur) -----
  @Get(':mediaId/viewers')
  async getViewers(
    @CurrentUser() user: any,
    @Param('mediaId') mediaId: string,
  ) {
    return this.storiesService.getViewers(mediaId, user.id);
  }
}
