# Plan 008: Remove scaffold AppController e AppService não utilizados

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/app.controller.ts apps/api/src/app.service.ts apps/api/src/app.module.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

`AppController` (`GET /` → "Hello World!") e `AppService` são o scaffold padrão do NestJS
nunca evoluídos. São ruído em Swagger (quando adicionado), confundem novos contribuidores
e violam o princípio de menor surpresa num sistema acadêmico complexo.

## Current state

```typescript
// app.controller.ts — retorna "Hello World!" em GET /
// app.service.ts — retorna string "Hello World!"
// app.module.ts:7-8 — importa AppController e AppService
// app.module.ts:65 — controllers: [AppController], providers: [AppService, ...]
```

**Antes de deletar**: confirme com grep que AppController e AppService não são
referenciados em nenhum outro arquivo além de `app.module.ts`.

## Commands you will need

| Purpose    | Command (em `apps/api`)              | Expected  |
|-----------|--------------------------------------|-----------|
| Check refs | `grep -r "AppController\|AppService" apps/api/src --include="*.ts"` | apenas app.module.ts |
| Typecheck  | `npx tsc --noEmit`                   | exit 0    |
| Lint       | `npm run lint -- --max-warnings=0`   | exit 0    |
| Tests      | `npm test`                           | exit 0    |
| Build      | `npm run build`                      | exit 0    |

## Scope

**In scope**:
- `apps/api/src/app.controller.ts` (deletar)
- `apps/api/src/app.service.ts` (deletar)
- `apps/api/src/app.module.ts` (remover referências)

**Out of scope**:
- `apps/api/test/app.e2e-spec.ts` — se existir, atualizar (ver instrução abaixo)
- Qualquer outro arquivo

## Git workflow

- Commit: `chore: remove AppController e AppService do scaffold não utilizados`

## Steps

### Step 1: Confirmar que não há referências externas

```bash
grep -r "AppController\|AppService" apps/api/src --include="*.ts"
```

**Verify**: resultado mostra APENAS `app.module.ts`. Se aparecer outros arquivos, STOP.

### Step 2: Verificar e2e spec

```bash
grep -r "AppController\|AppService\|Hello World" apps/api/test --include="*.ts" 2>/dev/null
```

Se `apps/api/test/app.e2e-spec.ts` importar `AppController` ou `AppService`:
- Edite o spec para remover essas referências (o spec atualmente usa TestingModule
  mínimo — veja o conteúdo antes de editar)

Se o e2e spec testar `GET /` retornando "Hello World!", remova esse teste.

### Step 3: Remover referências em app.module.ts

Edite `apps/api/src/app.module.ts`:
- Remova `import { AppController } from './app.controller';`
- Remova `import { AppService } from './app.service';`
- Remova `AppController` da lista `controllers:`
- Remova `AppService` da lista `providers:`

**Verify**: `npx tsc --noEmit` → exit 0

### Step 4: Deletar os arquivos

```bash
rm apps/api/src/app.controller.ts
rm apps/api/src/app.service.ts
```

**Verify**: `ls apps/api/src/app.*.ts` → mostra apenas `app.module.ts`

### Step 5: Build e testes

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm test
npm run build
```

**Verify**: todos exit 0.

## Done criteria

- [ ] `apps/api/src/app.controller.ts` não existe
- [ ] `apps/api/src/app.service.ts` não existe
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep -r "AppController\|AppService" apps/api/src` → sem resultados

## STOP conditions

- `AppController` ou `AppService` aparecem em arquivos além de `app.module.ts` — não delete, reporte.
- `npm test` quebra com erro relacionado ao AppService — reporte.

## Maintenance notes

- Se no futuro for necessário um health-check endpoint, criar `apps/api/src/health/health.controller.ts`
  com `GET /health` retornando `{ status: 'ok' }`, não ressuscitar o scaffold.
