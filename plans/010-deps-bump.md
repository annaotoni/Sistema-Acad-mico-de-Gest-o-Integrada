# Plan 010: Atualiza Prisma para 6.x latest e ts-jest para 30.x

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/package.json`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dependencies
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

- `prisma` e `@prisma/client` estão em `^6.2.1`. Existe uma vulnerabilidade high-severity
  em `deepmerge-ts` (transitive dep de versões antigas do Prisma). Atualizar para o latest
  6.x resolve o transitive sem o risco de breaking changes de major version.
  (Pular para 8.x é rc; manter no 6.x latest é o caminho conservador.)
- `ts-jest ^29.2.5` vs `jest ^30.0.0` — latent compatibility risk. ts-jest 30.x é
  drop-in compatible com jest 30.

## Current state

```json
// apps/api/package.json (parcial)
"@prisma/client": "^6.2.1",
"prisma": "^6.2.1",
"ts-jest": "^29.2.5",
"jest": "^30.0.0"
```

## Commands you will need

| Purpose    | Command (raiz do monorepo)                          | Expected     |
|-----------|-----------------------------------------------------|--------------|
| Update     | `npm install <pacote>@latest --workspace=api`       | exit 0       |
| Generate   | `npx --workspace=api prisma generate`               | exit 0       |
| Typecheck  | `npx tsc --noEmit` (em `apps/api`)                 | exit 0       |
| Tests      | `npm test --workspace=api`                          | exit 0       |
| E2e        | `npm run test:e2e --workspace=api`                  | exit 0       |
| Audit      | `npm audit --workspace=api`                         | exit 0       |

## Scope

**In scope**:
- `apps/api/package.json` (versões atualizadas pelo npm)
- `package-lock.json` (atualizado pelo npm)

**Out of scope**:
- Código fonte — se uma atualização requer mudança de código, STOP e reporte
- `apps/api/prisma/schema.prisma`

## Git workflow

- Commit: `chore(deps): atualiza Prisma para latest 6.x e ts-jest para 30.x`

## Steps

### Step 1: Atualizar ts-jest

```bash
npm install ts-jest@^30.0.0 --save-dev --workspace=api
```

**Verify**: `grep "ts-jest" apps/api/package.json` → mostra `^30.x.x`

### Step 2: Rodar testes unitários

```bash
npm test --workspace=api
```

**Verify**: exit 0, todos os testes passam. Se algum falhar devido ao ts-jest 30,
pare e reporte o erro exato (não improvise correções).

### Step 3: Atualizar Prisma para latest 6.x

```bash
npm install prisma@^6 @prisma/client@^6 --workspace=api
```

Isso instalará o latest 6.x sem pular para 7/8.

**Verify**: `grep '"prisma"\|"@prisma/client"' apps/api/package.json` → versão 6.x

### Step 4: Regenerar Prisma client

```bash
npx --workspace=api prisma generate
```

**Verify**: exit 0

### Step 5: Rodar todos os testes

```bash
npm test --workspace=api
npm run test:e2e --workspace=api
```

**Verify**: ambos exit 0.

### Step 6: Audit

```bash
npm audit --omit=dev 2>/dev/null | tail -5
```

**Verify**: sem high/critical em runtime deps.

## Done criteria

- [ ] `npm test --workspace=api` exits 0
- [ ] `npm run test:e2e --workspace=api` exits 0
- [ ] `npx tsc --noEmit` (em `apps/api`) exits 0
- [ ] `grep "ts-jest" apps/api/package.json` → `^30`
- [ ] `grep '"prisma"' apps/api/package.json` → `^6.` (latest patch)

## STOP conditions

- Qualquer teste quebra após atualização de ts-jest — reporte erro exato, não corrija.
- `prisma generate` falha — reporte erro exato.
- Uma dependência exige mudança em código fonte — reporte e não modifique código.

## Maintenance notes

- Se quiser migrar para Prisma 8.x no futuro, ler o migration guide em pris.ly/d/major-version-upgrade.
- ts-jest 30.x é drop-in; se futuros testes quebrarem de forma estranha, verificar ts-jest changelog.
