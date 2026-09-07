# Plan 007: Extrai SCOPE_PRIORITY para constante compartilhada

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/common/guards/feature.guard.ts apps/api/src/modules/settings/settings.service.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

A constante de prioridade de escopo de feature está duplicada:
- `apps/api/src/common/guards/feature.guard.ts:14` — `SCOPE_PRIORITY`
- `apps/api/src/modules/settings/settings.service.ts:20` — constante idêntica

Se um novo tipo de escopo for adicionado (ex: `DISCIPLINE`), ambas as cópias
precisam ser atualizadas manualmente. Divergência silenciosa = decisões de autorização
inconsistentes entre FeatureGuard e SettingsService.

## Current state

```typescript
// feature.guard.ts:14-19
const SCOPE_PRIORITY: Record<FeatureScopeType, number> = {
  ROLE: 3,
  COURSE: 2,
  TENANT: 1,
  GLOBAL: 0,
};

// settings.service.ts:20 — confirme lendo o arquivo (deve ser idêntico)
```

Convenção do projeto: constantes compartilhadas ficam em
`apps/api/src/common/constants/` (existe `argon2-options.ts` como exemplo).

## Commands you will need

| Purpose    | Command (em `apps/api`)              | Expected  |
|-----------|--------------------------------------|-----------|
| Typecheck  | `npx tsc --noEmit`                   | exit 0    |
| Lint       | `npm run lint -- --max-warnings=0`   | exit 0    |
| Tests      | `npm test`                           | exit 0    |

## Scope

**In scope**:
- `apps/api/src/common/constants/feature-scope-priority.ts` (criar)
- `apps/api/src/common/guards/feature.guard.ts`
- `apps/api/src/modules/settings/settings.service.ts`

**Out of scope**:
- Qualquer outro arquivo

## Git workflow

- Commit: `refactor(settings): extrai SCOPE_PRIORITY para constante compartilhada`

## Steps

### Step 1: Criar arquivo de constante compartilhada

Crie `apps/api/src/common/constants/feature-scope-priority.ts`:

```typescript
import { FeatureScopeType } from '@prisma/client';

export const FEATURE_SCOPE_PRIORITY: Record<FeatureScopeType, number> = {
  ROLE: 3,
  COURSE: 2,
  TENANT: 1,
  GLOBAL: 0,
};
```

**Verify**: O arquivo foi criado e `npx tsc --noEmit` exit 0.

### Step 2: Atualizar feature.guard.ts

Substitua a definição local pelo import:

```typescript
import { FEATURE_SCOPE_PRIORITY } from '../constants/feature-scope-priority';
// Remover: const SCOPE_PRIORITY = { ... }
// Atualizar usos de SCOPE_PRIORITY → FEATURE_SCOPE_PRIORITY
```

**Verify**: `grep "SCOPE_PRIORITY" apps/api/src/common/guards/feature.guard.ts` → não encontra a definição local

### Step 3: Atualizar settings.service.ts

Leia o arquivo para confirmar a constante idêntica. Substitua pelo import:

```typescript
import { FEATURE_SCOPE_PRIORITY } from '../../common/constants/feature-scope-priority';
// Remover: const local de prioridade
// Atualizar usos
```

**Verify**: `grep "SCOPE_PRIORITY\|FEATURE_SCOPE_PRIORITY" apps/api/src/modules/settings/settings.service.ts` → apenas o import novo

### Step 4: Typecheck, lint e testes

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm test
```

**Verify**: todos exit 0.

## Done criteria

- [ ] `apps/api/src/common/constants/feature-scope-priority.ts` existe
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` exits 0
- [ ] `grep -r "SCOPE_PRIORITY" apps/api/src/common/guards/feature.guard.ts` → sem definição local
- [ ] `grep -r "SCOPE_PRIORITY" apps/api/src/modules/settings/settings.service.ts` → sem definição local
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- A constante em `settings.service.ts` é diferente da de `feature.guard.ts` — não consolide sem entender a divergência; pare e reporte.
- Alguma constante tem valores diferentes da mostrada no plano — pare e reporte.

## Maintenance notes

- Ao adicionar novos `FeatureScopeType` no schema Prisma, atualizar apenas `feature-scope-priority.ts`.
