import { FeatureScopeType } from '@prisma/client';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { SettingsService } from './settings.service';

const mockPrisma = { feature: { findMany: jest.fn() } };
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
};

const adminUser: AccessTokenPayload = {
  sub: 'u1',
  jti: 'j1',
  role: 'ADMIN',
  tenantId: 't1',
  iat: 0,
  exp: 0,
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    service = new SettingsService(mockPrisma as never, mockRedis as never);
    jest.clearAllMocks();
  });

  it('retorna resultado cacheado quando Redis tem a chave', async () => {
    const cached = {
      tabs: [
        { key: 'financeiro', name: 'Financeiro', order: 0, configJson: null },
      ],
      config: {},
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await service.resolveFeatures(adminUser);
    expect(result).toEqual(cached);
    expect(mockPrisma.feature.findMany).not.toHaveBeenCalled();
  });

  it('busca do banco e armazena em cache quando Redis vazio', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockPrisma.feature.findMany.mockResolvedValue([
      { key: 'financeiro', name: 'Financeiro', isCore: false, configs: [] },
    ]);

    const result = await service.resolveFeatures(adminUser);
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0].key).toBe('financeiro');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'features:t1:ADMIN',
      expect.any(String),
      'EX',
      300,
    );
  });

  it('feature core sempre incluída independente de configs', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockPrisma.feature.findMany.mockResolvedValue([
      { key: 'auth', name: 'Auth', isCore: true, configs: [] },
    ]);

    const result = await service.resolveFeatures(adminUser);
    expect(result.tabs[0].key).toBe('auth');
  });

  it('feature desabilitada por TENANT não aparece nos tabs', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockPrisma.feature.findMany.mockResolvedValue([
      {
        key: 'assistant',
        name: 'Assistente',
        isCore: false,
        configs: [
          {
            scopeType: FeatureScopeType.TENANT,
            enabled: false,
            order: 0,
            labelOverride: null,
            configJson: null,
          },
        ],
      },
    ]);

    const result = await service.resolveFeatures(adminUser);
    expect(result.tabs).toHaveLength(0);
  });

  it('ROLE override habilita feature desabilitada no TENANT', async () => {
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockPrisma.feature.findMany.mockResolvedValue([
      {
        key: 'assistant',
        name: 'Assistente',
        isCore: false,
        configs: [
          {
            scopeType: FeatureScopeType.TENANT,
            enabled: false,
            order: 0,
            labelOverride: null,
            configJson: null,
          },
          {
            scopeType: FeatureScopeType.ROLE,
            enabled: true,
            order: 1,
            labelOverride: 'Assistente Admin',
            configJson: null,
          },
        ],
      },
    ]);

    const result = await service.resolveFeatures(adminUser);
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0].name).toBe('Assistente Admin');
  });

  it('invalida cache por tenant e role', async () => {
    mockRedis.del.mockResolvedValue(1);
    await service.invalidateCache('t1', 'ADMIN');
    expect(mockRedis.del).toHaveBeenCalledWith('features:t1:ADMIN');
  });

  it('invalida todo o cache do tenant quando sem role', async () => {
    mockRedis.keys.mockResolvedValue([
      'features:t1:ADMIN',
      'features:t1:ALUNO',
    ]);
    mockRedis.del.mockResolvedValue(2);
    await service.invalidateCache('t1');
    expect(mockRedis.del).toHaveBeenCalledWith(
      'features:t1:ADMIN',
      'features:t1:ALUNO',
    );
  });
});
