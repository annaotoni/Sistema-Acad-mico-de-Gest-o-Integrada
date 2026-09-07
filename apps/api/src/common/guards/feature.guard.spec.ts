import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureScopeType } from '@prisma/client';
import { FeatureGuard } from './feature.guard';

const mockPrisma = {
  feature: { findUnique: jest.fn() },
  featureConfig: { findMany: jest.fn() },
};

const buildCtx = (user: object, handler = jest.fn()): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('FeatureGuard', () => {
  let guard: FeatureGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new FeatureGuard(reflector, mockPrisma as never);
    jest.clearAllMocks();
  });

  it('passa quando não há decorator', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(buildCtx({}))).resolves.toBe(true);
  });

  it('passa para feature core independente de config', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('financeiro');
    mockPrisma.feature.findUnique.mockResolvedValue({ isCore: true });
    await expect(
      guard.canActivate(buildCtx({ sub: '1', role: 'ALUNO', tenantId: null })),
    ).resolves.toBe(true);
  });

  it('passa quando não há FeatureConfig (padrão habilitado)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('assistant');
    mockPrisma.feature.findUnique.mockResolvedValue({ isCore: false });
    mockPrisma.featureConfig.findMany.mockResolvedValue([]);
    await expect(
      guard.canActivate(buildCtx({ sub: '1', role: 'ALUNO', tenantId: 't1' })),
    ).resolves.toBe(true);
  });

  it('bloqueia quando TENANT config diz disabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('assistant');
    mockPrisma.feature.findUnique.mockResolvedValue({ isCore: false });
    mockPrisma.featureConfig.findMany.mockResolvedValue([
      { scopeType: FeatureScopeType.TENANT, enabled: false },
    ]);
    await expect(
      guard.canActivate(buildCtx({ sub: '1', role: 'ALUNO', tenantId: 't1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ROLE override vence TENANT: ROLE=enabled ganha TENANT=disabled', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('assistant');
    mockPrisma.feature.findUnique.mockResolvedValue({ isCore: false });
    mockPrisma.featureConfig.findMany.mockResolvedValue([
      { scopeType: FeatureScopeType.TENANT, enabled: false },
      { scopeType: FeatureScopeType.ROLE, enabled: true },
    ]);
    await expect(
      guard.canActivate(buildCtx({ sub: '1', role: 'ADMIN', tenantId: 't1' })),
    ).resolves.toBe(true);
  });
});
