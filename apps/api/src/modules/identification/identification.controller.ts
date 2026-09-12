import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IdentificationService } from './identification.service';
import { IdentifyPlantResponseDto } from '../../dto/shared.dto'; // ou @planai/shared
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('identification')
@UseGuards(JwtAuthGuard)
export class IdentificationController {
  constructor(private readonly identificationService: IdentificationService) {}

  // Appelle une API tierce payante (Plant.id) : limite bien plus basse que le défaut
  // global (100 req/min/IP, voir app.module.ts) pour éviter l'épuisement de quota/coût.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async identify(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 Mo
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<IdentifyPlantResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'Aucune image fournie. Envoyez un fichier via le champ `image`.',
      );
    }
    return this.identificationService.identifyPlantFromBuffer(
      user.id,
      file.buffer,
    );
  }
}
