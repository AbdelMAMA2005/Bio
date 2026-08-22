import {
  Controller,
  Post,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DiagnosisService } from './diagnosis.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('collection')
@UseGuards(JwtAuthGuard)
export class DiagnosisController {
  constructor(private readonly diagnosisService: DiagnosisService) {}

  @Post(':id/diagnosis')
  @UseInterceptors(FileInterceptor('image'))
  async diagnose(
    @CurrentUser() user: any,
    @Param('id') collectionId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false, // L'image est optionnelle si l'historique existe déjà
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.diagnosisService.diagnosePlantHealth(
      user.id,
      collectionId,
      file?.buffer,
    );
  }
}
