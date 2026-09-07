import { SetMetadata } from '@nestjs/common';

export type ScopeType = 'class';
export const SCOPE_KEY = 'scope';
export const RequireScope = (scope: ScopeType) => SetMetadata(SCOPE_KEY, scope);
