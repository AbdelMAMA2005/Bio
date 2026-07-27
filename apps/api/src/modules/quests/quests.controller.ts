import { Controller, Get, UseGuards } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QuestResponseDto } from '../../dto';

@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  // Tableau nu (pas d'enveloppe paginée), conforme à API_CONTRACT.md §6.
  @Get('daily')
  async getDaily(@CurrentUser() user: any): Promise<QuestResponseDto[]> {
    return this.questsService.getDailyQuests(user.id);
  }
}
