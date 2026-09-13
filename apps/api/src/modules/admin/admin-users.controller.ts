import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminUsersService } from './admin-users.service';
import { AdminAuditService } from './admin-audit.service';
import {
  AdminUpdateRoleDto,
  AdminUpdateStatusDto,
  AdminUsersQueryDto,
} from '../../dto';
import type { AdminUser, AdminUsersPage } from '@planai/shared';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminUsersController {
  constructor(
    private readonly usersService: AdminUsersService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Roles('admin', 'moderateur')
  @Get()
  async list(@Query() query: AdminUsersQueryDto): Promise<AdminUsersPage> {
    return this.usersService.list(query);
  }

  /** Changer le rôle d'un compte : réservé à un admin (un modérateur ne peut pas s'auto-promouvoir). */
  @Roles('admin')
  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: AdminUpdateRoleDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminUser> {
    const user = await this.usersService.updateRole(id, dto.role);
    await this.auditService.log(
      admin,
      `a changé le rôle de ${user.nomUtilisateur} en "${dto.role}"`,
      user.id,
    );
    return user;
  }

  @Roles('admin', 'moderateur')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateStatusDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminUser> {
    const user = await this.usersService.updateStatus(id, dto.suspendu, admin);
    await this.auditService.log(
      admin,
      dto.suspendu
        ? `a suspendu le compte ${user.nomUtilisateur}`
        : `a réactivé le compte ${user.nomUtilisateur}`,
      user.id,
    );
    return user;
  }

  @Roles('admin')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.usersService.delete(id, admin);
    await this.auditService.log(
      admin,
      'a supprimé un compte utilisateur (RGPD)',
      id,
    );
    return { success: true };
  }
}
