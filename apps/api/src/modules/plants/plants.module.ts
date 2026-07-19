import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plant } from '../../entities/plant.entity';
import { Collection } from '../../entities/collection.entity';
import { PlantsService } from './plants.service';
import { PlantsController } from './plants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plant, Collection])],
  controllers: [PlantsController],
  providers: [PlantsService],
  exports: [PlantsService],
})
export class PlantsModule {}