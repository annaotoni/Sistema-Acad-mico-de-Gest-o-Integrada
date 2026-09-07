import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureScopeType } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../interfaces/access-token-payload';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';

const SCOPE_PRIORITY: Record<FeatureScopeType, number> = {
  ROLE: 3,
  COURSE: 2,
  TENANT: 1,
  GLOBAL: 0,
};

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const user = context.switchToHttp().getRequest<Request>()
      .user as AccessTokenPayload;

    // Feature core nunca pode ser desabilitada
    const feat = await this.prisma.feature.findUnique({
      where: { key: feature },
      select: { isCore: true },
    });
    if (feat?.isCore) return true;

    // Resolve: global → tenant → role (mais específico vence)
    const configs = await this.prisma.featureConfig.findMany({
      where: {
        featureKey: feature,
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
      select: { scopeType: true, enabled: true },
    });

    // Sem configuração = feature habilitada por padrão
    if (!configs.length) return true;

    const resolved = configs.sort(
      (a, b) => SCOPE_PRIORITY[b.scopeType] - SCOPE_PRIORITY[a.scopeType],
    )[0];

    if (!resolved.enabled) throw new ForbiddenException('Feature desabilitada');
    return true;
  }
}
