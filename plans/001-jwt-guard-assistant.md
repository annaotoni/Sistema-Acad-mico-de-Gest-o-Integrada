# Plan 001: AssistantController requer autenticação JWT antes de FeatureGuard

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/modules/assistant/assistant.controller.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

`AssistantController` usa apenas `@UseGuards(FeatureGuard)`, sem `JwtAuthGuard`.
`FeatureGuard` acessa `req.user.tenantId` e `req.user.role` na linha 51-60 do guard.
Sem JWT guard validando o token primeiro, `req.user` é `undefined` para requisições
não autenticadas → o guard lança TypeError → NestJS retorna 500 em vez de 401.
Pior: se a feature `assistant` for marcada `isCore=true` no banco (linha 43 do guard
retorna `true` sem checar user), a rota fica completamente aberta.

## Current state

Arquivo relevante: `apps/api/src/modules/assistant/assistant.controller.ts`

```typescript
// apps/api/src/modules/assistant/assistant.controller.ts:1-27 (estado atual)
import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Post, Req, UnprocessableEntityException, UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { AgentService } from './agent.service';

// ...

@Controller('assistant')
@UseGuards(FeatureGuard)            // ← falta JwtAuthGuard aqui
@RequireFeature('assistant')
export class AssistantController {
```

Como outros controllers autenticados fazem (exemplo canônico):
`apps/api/src/modules/grades/grades.controller.ts` — usa
`@UseGuards(JwtAuthGuard, FeatureGuard, RoleGuard, ScopeGuard)` (na ordem JWT primeiro).

O `JwtAuthGuard` está em:
`apps/api/src/modules/auth/strategies/jwt-access.strategy.ts`
O guard wrapper conveniente provavelmente é `AuthGuard('jwt')` do `@nestjs/passport`.

Verifique como outros controllers importam o guard de JWT:
```bash
grep -r "JwtAuthGuard\|AuthGuard('jwt')" apps/api/src/modules --include="*.ts" -l
```

## Commands you will need

| Purpose    | Command (executar em `apps/api`)                          | Expected on success          |
|-----------|----------------------------------------------------------|------------------------------|
| Typecheck  | `npx tsc --noEmit`                                       | exit 0, no errors            |
| Lint       | `npm run lint -- --max-warnings=0`                       | exit 0                       |
| Unit tests | `npm test -- --testPathPattern=assistant`                | exit 0, all pass             |
| Build      | `npm run build`                                          | exit 0                       |

(Run all from `apps/api/` working directory, or from root with `--workspace=api`.)

## Scope

**In scope** (only files you should modify):
- `apps/api/src/modules/assistant/assistant.controller.ts`
- `apps/api/src/modules/assistant/assistant.module.ts` (if guard needs to be registered as provider)

**Out of scope** (do NOT touch):
- `apps/api/src/common/guards/feature.guard.ts` — guard logic is not the issue
- `apps/api/src/modules/auth/` — auth system is not changing
- Any other controller

## Git workflow

- Branch: already in worktree — commit directly
- Commit message style (match existing): `fix(assistant): adiciona JwtAuthGuard para autenticar requisições antes de checar feature`
- Do NOT push or open a PR

## Steps

### Step 1: Identificar como outros controllers importam o JWT guard

Run:
```bash
grep -r "JwtAuthGuard\|AuthGuard" apps/api/src/modules --include="*.ts" | head -20
```

Identifique o import path exato. Provavelmente é uma das opções:
- `import { AuthGuard } from '@nestjs/passport';` com `@UseGuards(AuthGuard('jwt'), ...)`
- `import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';`

Se `JwtAuthGuard` não existir como classe separada e o projeto usar `AuthGuard('jwt')` do passport:
use `AuthGuard('jwt')` diretamente.

**Verify**: `grep -r "JwtAuthGuard\|AuthGuard" apps/api/src/modules --include="*.ts" | wc -l` → retorna > 0

### Step 2: Adicionar JwtAuthGuard no AssistantController

Edite `apps/api/src/modules/assistant/assistant.controller.ts`.

Adicione o import do guard JWT (use o mesmo import que os outros controllers usam — veja resultado do Step 1).

Mude:
```typescript
@UseGuards(FeatureGuard)
```
para:
```typescript
@UseGuards(<JwtGuard>, FeatureGuard)
```
onde `<JwtGuard>` é a classe ou expressão que os outros controllers usam (ex: `AuthGuard('jwt')`).

A ordem DEVE ser: JWT primeiro (autentica), Feature depois (verifica se feature está ativa).

**Verify**: `grep -A2 "@UseGuards" apps/api/src/modules/assistant/assistant.controller.ts` → deve mostrar JWT guard antes de FeatureGuard.

### Step 3: Se necessário, registrar o guard no módulo

Se o projeto usa uma classe `JwtAuthGuard` customizada (não `AuthGuard('jwt')` direto), ela
precisa estar disponível no módulo. Verifique `assistant.module.ts` e adicione se necessário.

Se usar `AuthGuard('jwt')` do `@nestjs/passport`, nenhuma mudança no módulo é necessária
(é auto-configurado pelo PassportModule que já está em `AuthModule`, que é importado globalmente).

**Verify**: `npx tsc --noEmit` → exit 0 (sem erros de DI ou import)

### Step 4: Typecheck e lint

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

**Verify**: ambos saem com exit 0.

## Test plan

Não há spec para o controller assistant. A verificação aqui é:
1. Typecheck passa (nenhum import quebrado)
2. Build compila

Se quiser adicionar teste (opcional, pois o controller é mínimo):
Crie `apps/api/src/modules/assistant/assistant.controller.spec.ts` modelando após
`apps/api/src/modules/grades/grades.controller.spec.ts` (se existir) — teste que
uma requisição sem token retorna 401, não 500.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0 (run from `apps/api/`)
- [ ] `npm run lint -- --max-warnings=0` exits 0
- [ ] `grep "@UseGuards" apps/api/src/modules/assistant/assistant.controller.ts` mostra JWT guard antes de FeatureGuard
- [ ] Nenhum arquivo fora do escopo foi modificado (`git diff --name-only`)

## STOP conditions

- O arquivo `assistant.controller.ts` não tem o trecho `@UseGuards(FeatureGuard)` exatamente como mostrado acima — drift, pare e reporte.
- `JwtAuthGuard` ou `AuthGuard('jwt')` não existe no projeto — pare e reporte (precisa ser criado primeiro).
- `npx tsc --noEmit` continua com erros após 2 tentativas.

## Maintenance notes

- Se no futuro um guard adicional for adicionado a outros controllers, lembre de
  incluí-lo no AssistantController também (a ordem de guards é: JWT → Feature → Role → Scope).
- Se a feature `assistant` for marcada `isCore=true` no banco, o FeatureGuard retorna
  true sem verificar user — o JwtAuthGuard que acabamos de adicionar é a única proteção
  nesses casos.
