import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RoleGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { AdminMe } from '@planai/shared';

/**
 * Session admin — réutilise le même /auth/login que le mobile (voir rapport.md pour la
 * justification de ce choix : pas de 2e système d'auth à maintenir en parallèle), mais
 * `GET /admin/me` est le SEUL point d'entrée qui confirme le rôle et sert de vérification
 * de session au chargement de la console (RoleGuard y refuse déjà tout non-admin/modérateur).
 */
@Controller('admin/me')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('admin', 'moderateur')
export class AdminMeController {
  @Get()
  me(@CurrentUser() user: AuthenticatedUser): AdminMe {
    return {
      id: user.id,
      nomUtilisateur: user.nomUtilisateur,
      email: user.email,
      role: user.role,
    };
  }
}
