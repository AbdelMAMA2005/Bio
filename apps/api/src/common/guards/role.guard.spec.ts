import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard';
import type { AuthenticatedUser } from '../types/authenticated-user';

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RoleGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RoleGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RoleGuard(reflector as unknown as Reflector);
  });

  it('refuse par défaut une route sans @Roles(...) (deny-by-default), même authentifié', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({
      id: 'u1',
      email: 'a@a.com',
      nomUtilisateur: 'a',
      estAdmin: true,
      role: 'admin',
      estSuspendu: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("refuse un 'membre' sur une route réservée à 'admin'", () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = buildContext({
      id: 'u1',
      email: 'a@a.com',
      nomUtilisateur: 'a',
      estAdmin: false,
      role: 'membre',
      estSuspendu: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("refuse un 'moderateur' sur une route réservée à 'admin' seul", () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = buildContext({
      id: 'u1',
      email: 'm@a.com',
      nomUtilisateur: 'm',
      estAdmin: false,
      role: 'moderateur',
      estSuspendu: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("autorise un 'moderateur' sur une route ouverte à 'admin' et 'moderateur'", () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'moderateur']);
    const ctx = buildContext({
      id: 'u1',
      email: 'm@a.com',
      nomUtilisateur: 'm',
      estAdmin: false,
      role: 'moderateur',
      estSuspendu: false,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('refuse quand request.user est absent (pas passé par JwtAuthGuard)', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const ctx = buildContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
