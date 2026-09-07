import { Inject, Injectable } from '@nestjs/common';
import { FeatureScopeType } from '@prisma/client';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.provider';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { PrismaService } from '../../prisma/prisma.service';

export interface FeatureTab {
  key: string;
  name: string;
  order: number;
  configJson: unknown;
}

export interface ResolvedFeatures {
  tabs: FeatureTab[];
  config: Record<string, unknown>;
}

const PRIORITY: Record<FeatureScopeType, number> = {
  ROLE: 3,
  COURSE: 2,
  TENANT: 1,
  GLOBAL: 0,
};

const CACHE_TTL_SEC = 300;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async resolveFeatures(user: AccessTokenPayload): Promise<ResolvedFeatures> {
    const cacheKey = `features:${user.tenantId ?? 'global'}:${user.role}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as ResolvedFeatures;

    const features = await this.prisma.feature.findMany({
      include: {
        configs: {
          where: {
            OR: [
              { scopeType: FeatureScopeType.GLOBAL },
              ...(user.tenantId
                ? [
                    {
                      scopeType: FeatureScopeType.TENANT,
                      scopeId: user.tenantId,
                    },
                  ]
                : []),
              { scopeType: FeatureScopeType.ROLE, scopeId: user.role },
            ],
          },
        },
      },
    });

    const tabs: FeatureTab[] = [];
    const config: Record<string, unknown> = {};

    for (const feature of features) {
      if (feature.isCore) {
        tabs.push({
          key: feature.key,
          name: feature.name,
          order: 0,
          configJson: null,
        });
        continue;
      }

      const sorted = [...feature.configs].sort(
        (a, b) => PRIORITY[b.scopeType] - PRIORITY[a.scopeType],
      );
      const resolved = sorted[0];

      // Sem config = habilitada por padrão
      if (!resolved || resolved.enabled) {
        tabs.push({
          key: feature.key,
          name: resolved?.labelOverride ?? feature.name,
          order: resolved?.order ?? 0,
          configJson: resolved?.configJson ?? null,
        });
        if (resolved?.configJson) {
          config[feature.key] = resolved.configJson;
        }
      }
    }

    tabs.sort((a, b) => a.order - b.order);
    const result: ResolvedFeatures = { tabs, config };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SEC);
    return result;
  }

  // Invalida cache ao alterar FeatureConfig (chamado pelo futuro admin endpoint)
  async invalidateCache(tenantId: string | null, role?: string): Promise<void> {
    if (role) {
      await this.redis.del(`features:${tenantId ?? 'global'}:${role}`);
      return;
    }
    const keys = await this.redis.keys(`features:${tenantId ?? 'global'}:*`);
    if (keys.length) await this.redis.del(...keys);
  }
}
