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
import { RemindersService } from './reminders.service';
import {
  CreateReminderDto,
  UpdateReminderDto,
  ReminderFilterDto,
  ReminderResponseDto,
} from '../../dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.remindersService.create(user.id, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: any, @Query() filter: ReminderFilterDto) {
    return this.remindersService.findAll(user.id, filter);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ): Promise<ReminderResponseDto> {
    return this.remindersService.update(user.id, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.remindersService.delete(user.id, id);
    return { success: true };
  }

  @Post(':id/notify')
  async notify(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ): Promise<ReminderResponseDto> {
    return this.remindersService.notify(user.id, id);
  }
}
