# Plan 004: JWT_REFRESH_SECRET obrigatório e MAIL_FROM corrigido

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/config/env.validation.ts apps/api/.env.example`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

`JWT_REFRESH_SECRET` está marcado `.optional()` em `env.validation.ts:52`. Ele é crítico
para assinar tokens de refresh (rotação de sessão). Se ausente no boot, o processo pode
subir sem erro e tokens de refresh ficam sem segredo — violação silenciosa do modelo
de segurança descrito no README.

`MAIL_FROM` tem default `noreply@auth-system.local` (copiado do projeto anterior), mas
o projeto é `sistema-academico`.

## Current state

```typescript
// apps/api/src/config/env.validation.ts:51-52 (estado atual)
JWT_ACCESS_SECRET: z.string().min(32),
JWT_REFRESH_SECRET: z.string().min(32).optional(),  // ← deve ser required
```

```typescript
// apps/api/src/config/env.validation.ts:20 (estado atual)
MAIL_FROM: z.string().email().default('noreply@auth-system.local'),  // ← nome errado
```

```bash
# apps/api/.env.example:26 (estado atual)
JWT_REFRESH_SECRET=
# ↑ Sem instrução de geração
```

## Commands you will need

| Purpose    | Command (em `apps/api`)             | Expected  |
|-----------|-------------------------------------|-----------|
| Typecheck  | `npx tsc --noEmit`                  | exit 0    |
| Lint       | `npm run lint -- --max-warnings=0`  | exit 0    |
| Tests      | `npm test`                          | exit 0    |

## Scope

**In scope**:
- `apps/api/src/config/env.validation.ts`
- `apps/api/.env.example`

**Out of scope**:
- Qualquer outro arquivo

## Git workflow

- Commit: `fix(config): JWT_REFRESH_SECRET obrigatório e MAIL_FROM padrão corrigido`

## Steps

### Step 1: Tornar JWT_REFRESH_SECRET obrigatório

Edite `apps/api/src/config/env.validation.ts`.

Mude a linha 52:
```typescript
// ANTES:
JWT_REFRESH_SECRET: z.string().min(32).optional(),

// DEPOIS:
JWT_REFRESH_SECRET: z.string().min(32),
```

**Verify**: `grep "JWT_REFRESH_SECRET" apps/api/src/config/env.validation.ts` → não deve ter `.optional()`

### Step 2: Corrigir MAIL_FROM default

Na mesma linha ~20:
```typescript
// ANTES:
MAIL_FROM: z.string().email().default('noreply@auth-system.local'),

// DEPOIS:
MAIL_FROM: z.string().email().default('noreply@sistema-academico.local'),
```

**Verify**: `grep "MAIL_FROM" apps/api/src/config/env.validation.ts` → mostra `sistema-academico`

### Step 3: Atualizar .env.example

Edite `apps/api/.env.example`.

Na seção JWT, adicione instrução de geração para `JWT_REFRESH_SECRET`, idêntica à de `JWT_ACCESS_SECRET`:

```bash
# JWT — mínimo 32 caracteres.
# Gerar: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

**Verify**: `grep -A1 "JWT_REFRESH_SECRET" apps/api/.env.example` → tem comentário de geração

### Step 4: Verificar que os testes e2e não quebram

Os testes e2e (`test/jest-e2e.json` e `test/jest-e2e-real.json`) definem `JWT_REFRESH_SECRET`
em suas configs. Verifique:

```bash
grep -r "JWT_REFRESH_SECRET" apps/api/test/
```

Se algum arquivo de teste não define `JWT_REFRESH_SECRET`, adicione com valor de teste
(mínimo 32 chars):
`JWT_REFRESH_SECRET: 'e2e-refresh-secret-com-pelo-menos-32-caracteres'`

**Verify**: `npm test` → exit 0

### Step 5: Typecheck e lint

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

**Verify**: ambos exit 0.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` exits 0
- [ ] `grep "JWT_REFRESH_SECRET" apps/api/src/config/env.validation.ts` → sem `.optional()`
- [ ] `grep "MAIL_FROM" apps/api/src/config/env.validation.ts` → mostra `sistema-academico.local`
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- O arquivo de validação tem estrutura diferente dos excerpts — leia o arquivo antes de editar.
- Tests e2e quebram porque `JWT_REFRESH_SECRET` não está definido no setup de teste — adicione
  nos arquivos de setup dos testes (dentro do escopo como exceção), ou pare e reporte.

## Maintenance notes

- `JWT_REFRESH_SECRET` agora é required — qualquer deploy sem essa variável vai falhar
  no boot (que é o comportamento correto: fail-fast).
- Se o projeto for deployado via Docker, verificar que `docker-compose.yml` passa
  `JWT_REFRESH_SECRET` como variável de ambiente.
