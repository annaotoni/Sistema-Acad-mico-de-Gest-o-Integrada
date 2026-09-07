import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleGuard } from './role.guard';

const buildCtx = (user: object): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => jest.fn(),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RoleGuard', () => {
  let guard: RoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RoleGuard(reflector);
    jest.clearAllMocks();
  });

  it('passa quando não há decorator @Roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(buildCtx({ role: 'ALUNO' }))).toBe(true);
  });

  it('passa quando role do usuário está na lista', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(['PROFESSOR', 'ADMIN']);
    expect(guard.canActivate(buildCtx({ role: 'PROFESSOR' }))).toBe(true);
  });

  it('bloqueia quando role do usuário não está na lista', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => guard.canActivate(buildCtx({ role: 'ALUNO' }))).toThrow(
      ForbiddenException,
    );
  });
});
