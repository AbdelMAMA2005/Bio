import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Collection } from '../../entities/collection.entity';
import { Plant } from '../../entities/plant.entity';
import { DiagnosisController } from './diagnosis.controller';
import { DiagnosisService } from './diagnosis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Collection, Plant]),
    HttpModule.register({
      timeout: 30000,
    }),
  ],
  controllers: [DiagnosisController],
  providers: [DiagnosisService],
  exports: [DiagnosisService],
})
export class DiagnosisModule {}