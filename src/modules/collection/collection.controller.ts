import { Controller, Post, Get, Body, Query, Request, UseGuards } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CreateCollectionRequestDto } from '../../dto';
import { PlantType } from '../../entities/enums/plant-type.enum';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('collection')
@UseGuards(JwtAuthGuard)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateCollectionRequestDto,
  ) {
    return this.collectionService.create(user.id, dto);
  }

  @Get()
  async findAllByUser(
    @CurrentUser() user: any,
    @Query('type') type?: PlantType,
  ) {
    return this.collectionService.findByUserAndType(user.id, type);
  }
}