import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Garde de rôle pour la console admin — distincte de l'auth mobile (AdminGuard/estAdmin,
 * conservé tel quel pour ne pas casser plants.controller) : lit les rôles autorisés posés
 * par `@Roles(...)` et compare à `request.user.role` (posé par JwtAuthGuard/JwtStrategy en
 * amont, toujours relu depuis la base à chaque requête — jamais depuis le JWT lui-même).
 * Sans `@Roles(...)` sur la route, l'accès est refusé par défaut (deny-by-default) plutôt
 * que d'autoriser silencieusement n'importe quel membre authentifié.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedRoles = this.reflector.getAllAndOverride<
      AuthenticatedUser['role'][] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!allowedRoles || allowedRoles.length === 0) {
      throw new ForbiddenException('Accès refusé.');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Accès refusé. Rôle insuffisant.');
    }

    return true;
  }
}
