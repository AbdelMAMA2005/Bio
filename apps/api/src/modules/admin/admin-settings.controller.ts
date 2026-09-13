import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminSettingsService } from './admin-settings.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminUpdateFeatureFlagDto } from '../../dto';
import type {
  AdminApiKeyStatus,
  AdminAuditLogEntry,
  AdminFeatureFlag,
} from '@planai/shared';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin')
export class AdminSettingsController {
  constructor(
    private readonly settingsService: AdminSettingsService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get('api-keys')
  getApiKeys(): AdminApiKeyStatus[] {
    return this.settingsService.getApiKeysStatus();
  }

  @Get('flags')
  async listFlags(): Promise<AdminFeatureFlag[]> {
    return this.settingsService.listFlags();
  }

  @Patch('flags/:cle')
  async setFlag(
    @Param('cle') cle: string,
    @Body() dto: AdminUpdateFeatureFlagDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminFeatureFlag> {
    const flag = await this.settingsService.setFlag(cle, dto.actif);
    await this.auditService.log(
      admin,
      `a ${dto.actif ? 'activé' : 'désactivé'} la fonctionnalité "${flag.libelle}"`,
      flag.cle,
    );
    return flag;
  }

  @Get('audit-log')
  async auditLog(): Promise<AdminAuditLogEntry[]> {
    return this.auditService.recent(50);
  }
}
