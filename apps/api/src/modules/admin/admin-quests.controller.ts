import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AdminQuestsService } from './admin-quests.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminCreateQuestDto, AdminUpdateQuestDto } from '../../dto';
import type { AdminQuest } from '@planai/shared';

@Controller('admin/quests')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminQuestsController {
  constructor(
    private readonly questsService: AdminQuestsService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Roles('admin', 'moderateur')
  @Get()
  async list(): Promise<AdminQuest[]> {
    return this.questsService.list();
  }

  @Roles('admin')
  @Post()
  async create(
    @Body() dto: AdminCreateQuestDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminQuest> {
    const quest = await this.questsService.create(dto);
    await this.auditService.log(
      admin,
      `a créé le défi "${quest.libelle}"`,
      quest.id,
    );
    return quest;
  }

  /**
   * Édition complète réservée à un admin ; un modérateur ne peut que basculer `actif` —
   * imposé ici (pas seulement caché côté front) : un modérateur qui enverrait d'autres
   * champs via un appel direct à l'API se voit refuser la requête entière.
   */
  @Roles('admin', 'moderateur')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: AdminUpdateQuestDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AdminQuest> {
    // Ne PAS utiliser Object.keys(dto) : une fois passé par le ValidationPipe global,
    // l'instance de la DTO porte toutes ses propriétés déclarées (à `undefined` si non
    // fournies) — Object.keys en compterait 5 même pour un simple {actif: false} envoyé
    // par le client, faisant échouer À TORT ce contrôle pour un modérateur légitime.
    const isToggleOnly =
      dto.actif !== undefined &&
      dto.libelle === undefined &&
      dto.type === undefined &&
      dto.objectif === undefined &&
      dto.recompenseXp === undefined &&
      dto.recompensePieces === undefined;
    if (admin.role === 'moderateur' && !isToggleOnly) {
      throw new ForbiddenException(
        "Un modérateur ne peut qu'activer/désactiver un défi, pas modifier ses autres propriétés.",
      );
    }
    const quest = await this.questsService.update(id, dto);
    await this.auditService.log(
      admin,
      isToggleOnly
        ? `a ${dto.actif ? 'activé' : 'désactivé'} le défi "${quest.libelle}"`
        : `a modifié le défi "${quest.libelle}"`,
      quest.id,
    );
    return quest;
  }
}
