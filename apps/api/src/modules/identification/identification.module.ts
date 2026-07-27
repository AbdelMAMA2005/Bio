import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { IdentificationLog } from '../../entities/identification-log.entity';
import { IdentificationController } from './identification.controller';
import { IdentificationService } from './identification.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Plant, Collection, IdentificationLog]),
  ],
  controllers: [IdentificationController],
  providers: [IdentificationService],
  exports: [IdentificationService],
})
export class IdentificationModule {}