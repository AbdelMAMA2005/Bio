import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoriesService } from './stories.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('stories')
@UseGuards(JwtAuthGuard)
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  // ----- Bulles groupées par auteur (comportement "statuts WhatsApp") -----
  @Get()
  async getStories(@CurrentUser() user: AuthenticatedUser) {
    return this.storiesService.getGroupedStories(user.id);
  }

  // ----- Ajouter un média à sa story du jour (s'empile dans la même bulle) -----
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async createStory(
    @CurrentUser() user: AuthenticatedUser,
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
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId') mediaId: string,
  ) {
    await this.storiesService.recordView(mediaId, user.id);
  }

  // ----- Liker/Unliker un média (toggle) -----
  @Post(':mediaId/like')
  async toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId') mediaId: string,
  ) {
    return this.storiesService.toggleLike(mediaId, user.id);
  }

  // ----- Supprimer un média de sa story avant expiration (réservé à son auteur) -----
  @Delete(':mediaId')
  @HttpCode(204)
  async deleteStoryMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId') mediaId: string,
  ) {
    await this.storiesService.deleteStoryMedia(mediaId, user.id);
  }

  // ----- Liste des vues d'un média (réservé à son auteur) -----
  @Get(':mediaId/viewers')
  async getViewers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('mediaId') mediaId: string,
  ) {
    return this.storiesService.getViewers(mediaId, user.id);
  }
}
