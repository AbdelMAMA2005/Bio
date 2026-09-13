import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminPlantsService } from './admin-plants.service';
import { AdminAuditService } from './admin-audit.service';
import {
  AdminCreatePlantDto,
  AdminPlantsQueryDto,
  AdminUpdatePlantDto,
} from '../../dto';
import type { AdminPlant, AdminPlantsPage } from '@planai/shared';

@Controller('admin/plants')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminPlantsController {
  constructor(
    private readonly plantsService: AdminPlantsService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Roles('admin', 'moderateur')
  @Get()
  async list(@Query() query: AdminPlantsQueryDto): Promise<AdminPlantsPage> {
    return this.plantsService.list(query);
  }

  @Roles('admin')
  @Post()
  async create(
    @Body() dto: AdminCreatePlantDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminPlant> {
    const plant = await this.plantsService.create(dto);
    await this.auditService.log(
      admin,
      `a créé l'espèce "${plant.nomCommun}"`,
      plant.id,
    );
    return plant;
  }

  @Roles('admin')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: AdminUpdatePlantDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminPlant> {
    const plant = await this.plantsService.update(id, dto);
    await this.auditService.log(
      admin,
      `a modifié l'espèce "${plant.nomCommun}"`,
      plant.id,
    );
    return plant;
  }

  @Roles('admin')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<{ success: true }> {
    await this.plantsService.delete(id);
    await this.auditService.log(
      admin,
      'a supprimé une espèce du référentiel',
      id,
    );
    return { success: true };
  }
}
