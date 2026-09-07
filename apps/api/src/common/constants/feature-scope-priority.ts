import { FeatureScopeType } from '@prisma/client';

// Escopo mais específico tem maior prioridade: ROLE sobrescreve TENANT, que sobrescreve GLOBAL.
export const FEATURE_SCOPE_PRIORITY: Record<FeatureScopeType, number> = {
  ROLE: 3,
  COURSE: 2,
  TENANT: 1,
  GLOBAL: 0,
};
