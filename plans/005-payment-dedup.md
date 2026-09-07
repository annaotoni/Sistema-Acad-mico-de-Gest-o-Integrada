# Plan 005: Payment webhook idempotente via unique constraint em gateway_id

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/modules/finance/finance.repository.ts apps/api/prisma/schema.prisma`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

A Asaas re-entrega webhooks em falhas de rede (retry automático). Se o mesmo evento
de pagamento chegar duas vezes antes da primeira transação completar, podem ser criados
dois registros `Payment` para a mesma fatura. O status da `Invoice` fica `PAGO` apenas
uma vez (a segunda chamada retorna cedo), mas o ledger de pagamentos fica com registros
duplicados — corrupção silenciosa de dados financeiros.

A solução: adicionar `gatewayId` como campo único em `Payment` (via `@@unique` no schema)
e verificar no `confirmPaymentAtomic` antes de criar o payment. A constraint de DB garante
idempotência mesmo em race conditions.

## Current state

### `apps/api/prisma/schema.prisma` — modelo Payment (estado atual)

```prisma
model Payment {
  id             String      @id @default(uuid()) @db.Uuid
  invoiceId      String      @map("invoice_id") @db.Uuid
  paidAt         DateTime    @map("paid_at") @db.Timestamptz
  method         PaymentMethod
  amount         Decimal     @db.Decimal(10, 2)
  gatewayPayload Json        @map("gateway_payload")
  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamptz
  invoice        Invoice     @relation(fields: [invoiceId], references: [id])
  @@map("payments")
  @@index([invoiceId], map: "payments_invoice_id_idx")
  // ← Sem campo gatewayId, sem unique constraint
}
```

### `apps/api/src/modules/finance/finance.repository.ts` — confirmPaymentAtomic

Leia o arquivo real para ver a implementação atual de `confirmPaymentAtomic`.
A lógica deve ser aproximadamente:
1. Buscar invoice por ID dentro de transação
2. Checar se status é PENDENTE
3. Criar Payment
4. Atualizar Invoice para PAGO

O problema: o passo 3 não verifica se já existe um Payment com o mesmo `gatewayId`.

### `apps/api/src/modules/finance/finance.service.ts` — confirmPaymentFromWebhook

Leia o arquivo real para ver como `gatewayId` é passado ao repository.
Provavelmente recebe o ID do evento Asaas como parâmetro.

## Commands you will need

| Purpose       | Command (em `apps/api`)                           | Expected  |
|--------------|---------------------------------------------------|-----------|
| Generate      | `npx prisma generate`                             | exit 0    |
| Migrate       | Não rodar — ver instrução abaixo                  | —         |
| Typecheck     | `npx tsc --noEmit`                                | exit 0    |
| Lint          | `npm run lint -- --max-warnings=0`                | exit 0    |
| Unit tests    | `npm test -- --testPathPattern=finance`           | exit 0    |

**IMPORTANTE sobre migrations**: Este plano cria um novo arquivo de migration mas
NÃO a aplica automaticamente. A migration deve ser aplicada manualmente pelo
desenvolvedor em seu banco local com `npx prisma migrate dev`.
O arquivo de migration gerado deve ser commitado junto com as mudanças de schema.

## Scope

**In scope**:
- `apps/api/prisma/schema.prisma` (adicionar campo e constraint em Payment)
- `apps/api/src/modules/finance/finance.repository.ts` (dedup check em confirmPaymentAtomic)
- `apps/api/src/modules/finance/finance.service.ts` (se necessário, para passar gatewayId)
- `apps/api/src/modules/finance/finance.service.spec.ts` (atualizar mocks)
- Novo arquivo de migration gerado em `apps/api/prisma/migrations/`

**Out of scope**:
- `apps/api/src/webhooks/` — não muda a assinatura do controller
- Qualquer outro módulo

## Git workflow

- Commit: `fix(finance): unique constraint em gateway_id previne pagamentos duplicados no webhook`

## Steps

### Step 1: Ler o estado atual dos arquivos finance

Antes de qualquer edição, leia:
- `apps/api/src/modules/finance/finance.repository.ts` (completo)
- `apps/api/src/modules/finance/finance.service.ts` (método `confirmPaymentFromWebhook`)

Identifique:
- Como `gatewayId` chega ao repository (nome do campo, tipo)
- A estrutura exata de `confirmPaymentAtomic`

**Verify**: Você consegue responder: "qual é o tipo de `gatewayId` (string? campo em gatewayPayload?)?"
Se não encontrar, pare e reporte.

### Step 2: Adicionar campo `gatewayId` e unique constraint no schema

Edite `apps/api/prisma/schema.prisma`, modelo `Payment`:

```prisma
model Payment {
  id             String      @id @default(uuid()) @db.Uuid
  invoiceId      String      @map("invoice_id") @db.Uuid
  gatewayId      String      @map("gateway_id")          // ← NOVO
  paidAt         DateTime    @map("paid_at") @db.Timestamptz
  method         PaymentMethod
  amount         Decimal     @db.Decimal(10, 2)
  gatewayPayload Json        @map("gateway_payload")
  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamptz
  invoice        Invoice     @relation(fields: [invoiceId], references: [id])
  @@map("payments")
  @@index([invoiceId], map: "payments_invoice_id_idx")
  @@unique([gatewayId], map: "payments_gateway_id_key")  // ← NOVO
}
```

Se `gatewayId` já existia dentro de `gatewayPayload` como JSON, adicionar um campo
de nível superior é a solução correta (permite índice eficiente).

**Verify**: `npx prisma generate` → exit 0 (Prisma client regenerado)

### Step 3: Criar migration

```bash
npx prisma migrate dev --create-only --name add_payment_gateway_id_unique
```

Isso cria o arquivo de migration sem aplicar. Revise o SQL gerado para confirmar
que contém `ALTER TABLE "payments" ADD COLUMN "gateway_id" TEXT` e
`CREATE UNIQUE INDEX "payments_gateway_id_key" ON "payments"("gateway_id")`.

**STOP**: Se o SQL gerado contiver DROP ou ALTER em outras tabelas além de `payments`,
pare e reporte antes de prosseguir.

**Verify**: `find apps/api/prisma/migrations -name "*.sql" | tail -1` → mostra novo arquivo

### Step 4: Atualizar confirmPaymentAtomic no repository

No `finance.repository.ts`, dentro de `confirmPaymentAtomic`:

Adicione verificação de idempotência ANTES de criar o Payment:

```typescript
// Idempotência: se já existe pagamento com este gateway_id, não duplicar
const existing = await tx.payment.findUnique({
  where: { gatewayId: data.gatewayId },
});
if (existing) return false; // já processado
```

E ao criar o Payment, inclua `gatewayId`:
```typescript
await tx.payment.create({
  data: {
    invoiceId: data.invoiceId,
    gatewayId: data.gatewayId,   // ← incluir
    paidAt: data.paidAt,
    method: data.method,
    amount: data.amount,
    gatewayPayload: data.gatewayPayload,
  },
});
```

**Verify**: `npx tsc --noEmit` → exit 0

### Step 5: Garantir que o service passa gatewayId

No `finance.service.ts`, confirme que `confirmPaymentFromWebhook` passa o `gatewayId`
(ID do evento Asaas) para o repository. Se o campo existia apenas dentro de `gatewayPayload`,
extraia-o antes de chamar o repository.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 6: Atualizar spec

No `apps/api/src/modules/finance/finance.service.spec.ts`, garanta que os mocks
de `confirmPaymentAtomic` aceitam `gatewayId` no argumento.

**Verify**: `npm test -- --testPathPattern=finance` → exit 0

## Done criteria

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test -- --testPathPattern=finance` exits 0
- [ ] `grep "gateway_id" apps/api/prisma/schema.prisma` → encontra campo e unique constraint
- [ ] `grep "gatewayId" apps/api/src/modules/finance/finance.repository.ts` → encontra check de idempotência
- [ ] Novo arquivo de migration existe em `apps/api/prisma/migrations/`
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- O schema real de `Payment` não tem o campo `gatewayPayload` como mostrado — leia o arquivo e adapte.
- `gatewayId` não é um campo string mas sim parte de um JSON aninhado — pare e reporte,
  pois a estratégia de unique constraint muda.
- O SQL gerado pela migration afeta tabelas além de `payments` — pare e reporte.
- `npx tsc --noEmit` falha após 2 tentativas.

## Maintenance notes

- Com a unique constraint em `gatewayId`, qualquer retry da Asaas com o mesmo event ID
  será ignorado silenciosamente (retorna `false`) — a Invoice permanece PAGO, sem duplicata.
- Se no futuro o campo `gatewayId` precisar ser nullable (gateways sem ID), remover o
  `@@unique` e implementar dedup via soft check apenas.
