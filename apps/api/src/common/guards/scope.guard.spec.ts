import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope.guard';

const mockPrisma = {
  teacherAssignment: { findUnique: jest.fn() },
  enrollment: { findUnique: jest.fn() },
};

const buildCtx = (
  user: object,
  params: Record<string, string> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    getHandler: () => jest.fn(),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ScopeGuard(reflector, mockPrisma as never);
    jest.clearAllMocks();
  });

  it('passa quando não há decorator @RequireScope', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(buildCtx({}))).resolves.toBe(true);
  });

  it('ADMIN passa sem checar vínculo', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    await expect(
      guard.canActivate(buildCtx({ role: 'ADMIN' }, { classId: 'c1' })),
    ).resolves.toBe(true);
    expect(mockPrisma.teacherAssignment.findUnique).not.toHaveBeenCalled();
  });

  it('PROFESSOR com vínculo passa', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    mockPrisma.teacherAssignment.findUnique.mockResolvedValue({ id: 'ta1' });
    await expect(
      guard.canActivate(
        buildCtx({ sub: 'u1', role: 'PROFESSOR' }, { classId: 'c1' }),
      ),
    ).resolves.toBe(true);
  });

  it('PROFESSOR sem vínculo é bloqueado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    mockPrisma.teacherAssignment.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        buildCtx({ sub: 'u1', role: 'PROFESSOR' }, { classId: 'c1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ALUNO com matrícula ATIVA passa', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    mockPrisma.enrollment.findUnique.mockResolvedValue({ status: 'ATIVA' });
    await expect(
      guard.canActivate(
        buildCtx({ sub: 'u1', role: 'ALUNO' }, { classId: 'c1' }),
      ),
    ).resolves.toBe(true);
  });

  it('ALUNO com matrícula TRANCADA é bloqueado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    mockPrisma.enrollment.findUnique.mockResolvedValue({ status: 'TRANCADA' });
    await expect(
      guard.canActivate(
        buildCtx({ sub: 'u1', role: 'ALUNO' }, { classId: 'c1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ALUNO sem matrícula é bloqueado', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('class');
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        buildCtx({ sub: 'u1', role: 'ALUNO' }, { classId: 'c1' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
