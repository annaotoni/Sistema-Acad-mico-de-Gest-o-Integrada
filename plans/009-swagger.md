# Plan 009: Swagger/OpenAPI configurado em /api-docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/main.ts apps/api/package.json`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

Projeto de portfólio sem documentação interativa. Qualquer recrutador ou contribuidor
precisa ler o código para descobrir os endpoints. Swagger é standard no ecossistema
NestJS e adiciona credibilidade ao projeto.

## Current state

```typescript
// apps/api/src/main.ts (estado atual — sem Swagger)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// ... sem SwaggerModule

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... sem setupSwagger
  await app.listen(port);
}
```

`@nestjs/swagger` NÃO está em `apps/api/package.json`.

## Commands you will need

| Purpose    | Command (em `apps/api`)              | Expected  |
|-----------|--------------------------------------|-----------|
| Install    | `npm install @nestjs/swagger`        | exit 0    |
| Typecheck  | `npx tsc --noEmit`                   | exit 0    |
| Lint       | `npm run lint -- --max-warnings=0`   | exit 0    |
| Build      | `npm run build`                      | exit 0    |

## Scope

**In scope**:
- `apps/api/package.json` (adicionar dependência)
- `apps/api/src/main.ts` (configurar SwaggerModule)

**Out of scope**:
- Controllers e DTOs — decorators `@ApiOperation` etc. são incrementais e opcionais agora
- Qualquer outro arquivo

## Git workflow

- Commit: `feat(dx): configura Swagger em /api-docs`

## Steps

### Step 1: Instalar @nestjs/swagger

```bash
# Executar da raiz do monorepo:
npm install @nestjs/swagger --workspace=api
```

**Verify**: `grep "@nestjs/swagger" apps/api/package.json` → encontra a dependência

### Step 2: Configurar SwaggerModule em main.ts

Edite `apps/api/src/main.ts`. Adicione APENAS em ambiente não-production
(para não vazar documentação):

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... configurações existentes (cors, helmet, etc) — não mexa nelas

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Sistema Acadêmico API')
      .setDescription('API do portal acadêmico multi-perfil')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
```

Leia o `main.ts` atual ANTES de editar para não perder nenhuma configuração existente
(cors, helmet, validação global, cookie parser, etc.).

**Verify**: `npx tsc --noEmit` → exit 0

### Step 3: Build

```bash
npm run build
```

**Verify**: exit 0, sem erros de compilação.

## Done criteria

- [ ] `grep "@nestjs/swagger" apps/api/package.json` → encontra
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] `grep "SwaggerModule" apps/api/src/main.ts` → encontra
- [ ] `grep "api-docs" apps/api/src/main.ts` → encontra
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- `main.ts` tem estrutura muito diferente — leia o arquivo completo antes de editar.
- `npm install @nestjs/swagger` falha com conflito de peer deps — reporte versão exata do erro.

## Maintenance notes

- Swagger só ativa fora de production (`NODE_ENV !== 'production'`) — para dev/local é automático.
- Em versões futuras, adicionar `@ApiOperation`, `@ApiResponse`, `@ApiProperty` aos endpoints
  mais usados para melhorar a documentação incrementalmente.
