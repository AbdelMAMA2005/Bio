import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminStatsService } from './admin-stats.service';
import type { AdminStats } from '@planai/shared';

@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin', 'moderateur')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get()
  async getStats(): Promise<AdminStats> {
    return this.statsService.getStats();
  }
}
