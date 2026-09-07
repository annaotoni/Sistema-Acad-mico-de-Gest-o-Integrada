# Plan 006: Remove timing leak do webhook — padroniza buffers antes de timingSafeEqual

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/webhooks/webhooks.controller.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

O código atual verifica `tokenBuf.length !== expectedBuf.length` antes de chamar
`timingSafeEqual`. Isso cria um timing leak: requisições com token de tamanho errado
retornam mais rápido do que as com tamanho correto (que chegam ao `timingSafeEqual`).
Um atacante pode usar isso para determinar o comprimento do token por análise de tempo
antes de fazer brute-force do valor.

## Current state

```typescript
// apps/api/src/webhooks/webhooks.controller.ts:46-56 (estado atual)
private validateToken(token: string | undefined): void {
  const tokenBuf = Buffer.from(token ?? '');
  const expectedBuf = Buffer.from(this.asaasToken);
  if (!token || tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
    throw new UnauthorizedException('Token inválido');
  }
}
```

O problema: `tokenBuf.length !== expectedBuf.length` retorna antes de `timingSafeEqual`
em tokens de comprimento errado.

## Commands you will need

| Purpose    | Command (em `apps/api`)              | Expected  |
|-----------|--------------------------------------|-----------|
| Typecheck  | `npx tsc --noEmit`                   | exit 0    |
| Lint       | `npm run lint -- --max-warnings=0`   | exit 0    |
| Tests      | `npm test -- --testPathPattern=webhooks` | exit 0 |

## Scope

**In scope**:
- `apps/api/src/webhooks/webhooks.controller.ts`

**Out of scope**:
- Qualquer outro arquivo

## Git workflow

- Commit: `fix(webhooks): remove timing leak ao padronizar tamanho dos buffers antes de timingSafeEqual`

## Steps

### Step 1: Corrigir validateToken

Edite `apps/api/src/webhooks/webhooks.controller.ts`.

Substitua `validateToken` para usar buffers de tamanho fixo, eliminando o early-exit
por comprimento:

```typescript
private validateToken(token: string | undefined): void {
  // Buffers de tamanho idêntico garantem que timingSafeEqual sempre executa
  // em tempo constante, sem leak de comprimento do token por timing.
  const expected = Buffer.from(this.asaasToken);
  const received = Buffer.alloc(expected.length);
  if (token) Buffer.from(token).copy(received, 0, 0, expected.length);
  if (!token || !timingSafeEqual(received, expected)) {
    throw new UnauthorizedException('Token inválido');
  }
}
```

Esta abordagem:
1. Cria `received` com mesmo tamanho de `expected` (preenchido com zeros)
2. Copia os bytes do token recebido até `expected.length` bytes
3. Sempre chama `timingSafeEqual` — tempo constante

**Verify**: `grep -A8 "validateToken" apps/api/src/webhooks/webhooks.controller.ts` → mostra o novo código

### Step 2: Typecheck e lint

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
```

**Verify**: ambos exit 0.

### Step 3: Verificar testes existentes

```bash
npm test -- --testPathPattern=webhooks
```

Os testes existentes para token inválido/válido devem continuar passando.

**Verify**: exit 0, todos os testes passam.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint -- --max-warnings=0` exits 0
- [ ] `npm test -- --testPathPattern=webhooks` exits 0
- [ ] `grep "length !== " apps/api/src/webhooks/webhooks.controller.ts` → não encontra (early length check removido)
- [ ] `grep "timingSafeEqual" apps/api/src/webhooks/webhooks.controller.ts` → encontra
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- O método `validateToken` tem assinatura diferente da mostrada — leia o arquivo e adapte.
- Testes de webhook quebram com a nova implementação — reporte o erro exato.

## Maintenance notes

- `Buffer.alloc(expected.length)` cria buffer zerado — se o token recebido for mais
  curto que o esperado, os bytes extras são 0, garantindo comparação incorreta (correto).
- Se o token esperado for vazio (ASAAS_WEBHOOK_TOKEN não configurado), `expected.length = 0`
  e `timingSafeEqual(Buffer.alloc(0), Buffer.alloc(0))` retorna `true` — o check `!token`
  antes protege esse caso, mas é mais seguro garantir no ConfigModule que ASAAS_WEBHOOK_TOKEN
  tem mínimo de chars (já tratado em `env.validation.ts`).
