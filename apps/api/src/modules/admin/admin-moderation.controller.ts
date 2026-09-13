import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminModerationService } from './admin-moderation.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminModerationQueryDto } from '../../dto';
import type { AdminReportGroup } from '@planai/shared';

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin', 'moderateur')
export class AdminModerationController {
  constructor(
    private readonly moderationService: AdminModerationService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get()
  async list(
    @Query() query: AdminModerationQueryDto,
  ): Promise<{ items: AdminReportGroup[]; total: number }> {
    return this.moderationService.list(query);
  }

  @Post(':id/ignore')
  async ignore(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.moderationService.ignore(id);
    await this.auditService.log(admin, 'a ignoré un signalement', id);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.moderationService.remove(id);
    await this.auditService.log(
      admin,
      'a supprimé une publication signalée',
      id,
    );
    return { success: true };
  }
}
