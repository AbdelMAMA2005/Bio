import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto, UpdatePlantDto, PlantListQueryDto, PlantResponseDto } from '../../dto';
import { JwtAuthGuard, AdminGuard } from '../../common/guards';

@Controller('plants')
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {}

  @Get()
  async findAll(@Query() query: PlantListQueryDto) {
    return this.plantsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PlantResponseDto> {
    return this.plantsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() dto: CreatePlantDto): Promise<PlantResponseDto> {
    return this.plantsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlantDto,
  ): Promise<PlantResponseDto> {
    return this.plantsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.plantsService.delete(id);
    return { success: true };
  }
}