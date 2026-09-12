import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CollectionService } from './collection.service';
import {
  CollectionQueryDto,
  CreateCollectionRequestDto,
  UpdateCollectionDto,
} from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('collection')
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCollectionRequestDto,
  ) {
    return this.collectionService.create(user.id, dto);
  }

  @Get()
  async findAllByUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CollectionQueryDto,
  ) {
    return this.collectionService.findByUserAndType(
      user.id,
      query.type,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.collectionService.findOneByUser(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.collectionService.delete(user.id, id);
    return { success: true };
  }

  // Ajouter une photo de suivi
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('image'))
  async addPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') collectionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucune image fournie.');
    }
    return this.collectionService.addPhoto(user.id, collectionId, file);
  }

  // Marquer la plante comme arrosée maintenant (recalcule prochainArrosage)
  @Post(':id/water')
  async water(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.collectionService.waterNow(user.id, id);
  }
}
