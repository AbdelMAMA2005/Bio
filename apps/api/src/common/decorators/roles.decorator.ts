import { SetMetadata } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user';

export const ROLES_KEY = 'roles';

/**
 * Marque une route comme réservée à un ou plusieurs rôles — voir RoleGuard, qui lit cette
 * métadonnée. Toujours combiné avec JwtAuthGuard (RoleGuard suppose `request.user` déjà
 * posé) : `@UseGuards(JwtAuthGuard, RoleGuard) @Roles('admin')`.
 */
export const Roles = (...roles: AuthenticatedUser['role'][]) =>
  SetMetadata(ROLES_KEY, roles);
