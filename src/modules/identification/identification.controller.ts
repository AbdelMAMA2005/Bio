import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdentificationService } from './identification.service';
import { IdentifyPlantResponseDto } from '../../dto/shared.dto'; // ou @planai/shared
import { Multer } from 'multer';

@Controller('identification')
export class IdentificationController {
  constructor(private readonly identificationService: IdentificationService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async identify(
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
      throw new BadRequestException('Aucune image fournie. Envoyez un fichier via le champ `image`.');
    }
    return this.identificationService.identifyPlantFromBuffer(file.buffer);
  }
}