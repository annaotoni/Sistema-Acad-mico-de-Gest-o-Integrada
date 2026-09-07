import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  jti: string;
  role: Role;
  tenantId: string | null;
  iat: number;
  exp: number;
}
