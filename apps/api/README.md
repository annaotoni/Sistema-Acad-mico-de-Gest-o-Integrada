# Sistema Acadêmico de Gestão Integrada — API

Backend de um portal acadêmico multi-perfil construído com **NestJS 11 + TypeScript**, seguindo arquitetura hexagonal em camadas com três guardas de segurança de domínio.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 11 + TypeScript 5 |
| ORM | Prisma 6 + PostgreSQL |
| Fila / Jobs | BullMQ + Redis |
| Validação | Zod |
| Autenticação | JWT (Passport) + Argon2 + MFA (TOTP) |
| Gateway de pagamento | Asaas (Pix + Boleto) |
| LLM | Anthropic Claude (interface trocável) |
| PDF | pdfkit |
| Testes | Jest + ts-jest |

---

## Arquitetura em Camadas

Todo request percorre o seguinte fluxo, sem atalhos:

```
HTTP Request
     │
     ▼
  Guards (FeatureGuard → RoleGuard → ScopeGuard)
     │
     ▼
  Controller        ← valida DTO com Zod, orquestra HTTP
     │
     ▼
  Service           ← regra de negócio pura, sem SQL nem HTTP
     │
     ▼
  Repository        ← único ponto de acesso ao Prisma/banco
     │
     ▼
  Prisma / PostgreSQL
```

**Invariantes:**
- Controller nunca acessa Repository diretamente.
- Service nunca conhece HTTP (sem `Request`, sem `Response`).
- Repository nunca contém regra de negócio.
- SQL fora de Repository → proibido.

---

## Os 3 Guards de Segurança de Domínio

Toda rota de domínio passa pelos três guards **nesta ordem**. A request só chega ao controller se os três aprovarem.

### 1. `FeatureGuard` — `@RequireFeature('chave')`

Verifica se a feature está habilitada para o tenant/curso/role do usuário.
Lê a tabela `feature_configs` com resolução em camadas:

```
GLOBAL (0) → TENANT (1) → COURSE (2) → ROLE (3)
```

O override mais específico vence. Features marcadas como `is_core` sempre passam.
Sem configuração = habilitada por padrão.

```typescript
@RequireFeature('financeiro')
@Controller('finance')
export class FinanceController {}
```

### 2. `RoleGuard` — `@Roles(...roles)`

Verifica se a role do usuário logado está na lista permitida.
Sem decorator `@Roles` = passa (rota pública dentro da autenticação).

```typescript
@Roles(Role.ADMIN, Role.SECRETARIA)
@Post('invoices')
createInvoice() {}
```

### 3. `ScopeGuard` — `@RequireScope('class')`

Garante que o usuário tem vínculo com o recurso referenciado na rota.
Extrai `classId` de `req.params` e valida:

- **PROFESSOR** → `TeacherAssignment` deve existir para `(teacherId, classId)`.
- **ALUNO** → `Enrollment` deve existir com status `ATIVA` para `(studentId, classId)`.
- **ADMIN / SECRETARIA** → passam sem checagem de vínculo.

```typescript
@RequireScope('class')
@Get('class/:classId/lessons')
listLessons() {}
```

> **Regra crítica:** nunca filtrar só por role. Toda query de professor/aluno é
> filtrada por vínculo. Esconder no front não basta — o guard vive no backend.

---

## Módulos de Domínio

```
src/
  common/
    guards/         feature.guard.ts  role.guard.ts  scope.guard.ts
    decorators/     require-feature   roles           require-scope
    audit/          AuditService (@Global)
    interfaces/     AccessTokenPayload

  infrastructure/
    bullmq/         BullMqModule (forRootAsync)
    redis/          RedisModule

  integrations/
    payment/        IPaymentGateway  AsaasGateway
    llm/            ILlmProvider     AnthropicProvider
    pdf/            PdfService

  jobs/
    processors/     NotificationProcessor  OverdueInvoicesProcessor
    schedulers/     OverdueInvoicesScheduler (cron 06h UTC)

  webhooks/
    WebhooksController  ← /webhooks/pagamentos (sem JWT, valida assinatura Asaas)

  modules/
    auth/           login, refresh, MFA, reset de senha
    users/          perfil + PATCH /:id/role (admin, auditado)
    settings/       FeatureConfig, GET /me/features
    academic/       Course, Discipline, AcademicPeriod, Class, Enrollment, TeacherAssignment
    content/        Lesson, Material (draft/published)
    assignments/    Assignment, Submission (entrega com flag is_late)
    grades/         Grade (toda alteração auditada)
    attendance/     AttendanceRecord (toda alteração auditada)
    notifications/  Notification + NotificationPref, fila BullMQ
    finance/        Invoice, Payment (Pix + Boleto via Asaas)
    documents/      Document PDF (SOLICITADO→EM_ANALISE→EMITIDO|RECUSADO)
    live-classes/   LiveClass (AGENDADA→AO_VIVO→ENCERRADA, gravação vira Material)
    tickets/        Ticket + TicketMessage (ABERTO→EM_ATENDIMENTO→RESOLVIDO|FECHADO)
    assistant/      Chatbot: tool-calling + RAG institucional
```

---

## Roles

| Role | Descrição |
|---|---|
| `ADMIN` | Acesso total, troca de roles, baixa manual de pagamento |
| `SECRETARIA` | Gerencia matrículas, documentos, tickets |
| `PROFESSOR` | Acessa apenas turmas onde está vinculado |
| `ALUNO` | Acessa apenas turmas com matrícula ATIVA |
| `SISTEMA` | Webhooks e jobs internos |

---

## Auditoria

`AuditLog` gerado obrigatoriamente em:

| Ação | Módulo | `action` |
|---|---|---|
| Alteração de nota | `grades` | `UPDATE` |
| Alteração de frequência | `attendance` | `UPDATE` |
| Baixa manual de pagamento | `finance` | `MANUAL_PAYMENT` |
| Troca de role de usuário | `users` | `ROLE_CHANGE` |
| Emissão / recusa de documento | `documents` | `EMITIDO` / `RECUSADO` |

---

## Financeiro — Regra de Ouro

`Invoice` só transita para `PAGO` por dois caminhos:

1. **Webhook** `POST /webhooks/pagamentos` — único ponto automático. Valida `asaas-access-token`, sem JWT.
2. **Baixa manual** `POST /finance/invoices/:id/manual-payment` — restrito a ADMIN/SECRETARIA, sempre gera `AuditLog`.

Job diário (BullMQ, `0 6 * * *`) varre faturas `PENDENTE` vencidas → marca `VENCIDO` + notifica.

---

## Assistente (Chatbot)

`POST /assistant/chat` — protegido por `@RequireFeature('assistant')`.

**Fluxo:**

```
Usuário → AgentService
              │
              ├─ RAG: busca conhecimento institucional (ILIKE → pgvector futuro)
              │
              └─ LLM (Anthropic Claude) com tool-calling
                    │
                    └─ Tools executam no contexto do usuário logado
                       (mesma filtragem dos services de domínio)
```

**Tools disponíveis:** `consultarFaturas`, `consultarNotas`, `consultarFrequencia`,
`proximasAulasAoVivo`, `statusDocumento`, `meusProtocolos`, `proximosPrazos`.

O agente nunca inventa dados — só usa o que as tools retornarem. Guardrail temático
impede respostas fora do domínio acadêmico.

---

## Como Rodar

### Pré-requisitos

- Node.js 20+
- Docker (para PostgreSQL + Redis)
- PNPM ou NPM

### 1. Sobe a infra

```bash
docker-compose up -d
```

### 2. Copia e preenche o `.env`

```bash
cp apps/api/.env.example apps/api/.env
```

Variáveis obrigatórias:

```env
# Banco
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sistema_academico

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=troque-por-secret-forte
JWT_REFRESH_SECRET=troque-por-outro-secret

# Asaas (gateway de pagamento)
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=sua-api-key
ASAAS_WEBHOOK_TOKEN=token-que-asaas-envia-no-header

# Anthropic (assistente)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-4-5-20251001   # opcional, esse é o default

# E-mail (SMTP)
MAIL_HOST=smtp.exemplo.com
MAIL_PORT=587
MAIL_USER=usuario
MAIL_PASS=senha
MAIL_FROM=noreply@exemplo.com
```

### 3. Instala dependências

```bash
cd apps/api && npm install
```

### 4. Gera o Prisma Client e aplica migrations

```bash
npx prisma generate
npx prisma migrate deploy   # aplica migrations existentes
```

> Para RAG com pgvector, habilite a extensão antes:
> ```sql
> CREATE EXTENSION IF NOT EXISTS vector;
> ```
> Depois crie a tabela `knowledge_base` (veja `rag.service.ts` para o DDL esperado).

### 5. Roda o servidor

```bash
# desenvolvimento (watch)
npm run start:dev

# produção
npm run build && npm run start:prod
```

### 6. Roda os testes

```bash
# testes unitários (sem banco)
npm test

# com cobertura
npm run test:cov
```

---

## Variáveis de Ambiente — Referência Completa

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `REDIS_URL` | Sim | Connection string Redis |
| `JWT_ACCESS_SECRET` | Sim | Secret do access token |
| `JWT_REFRESH_SECRET` | Sim | Secret do refresh token |
| `ASAAS_BASE_URL` | Sim | URL base da API Asaas |
| `ASAAS_API_KEY` | Sim | Chave da API Asaas |
| `ASAAS_WEBHOOK_TOKEN` | Sim | Token de validação de webhook |
| `ANTHROPIC_API_KEY` | Sim* | Chave da API Anthropic (*se feature assistant ativa) |
| `ANTHROPIC_MODEL` | Não | Modelo Claude (default: `claude-haiku-4-5-20251001`) |
| `MAIL_HOST` | Sim | Servidor SMTP |
| `MAIL_PORT` | Sim | Porta SMTP |
| `MAIL_USER` | Sim | Usuário SMTP |
| `MAIL_PASS` | Sim | Senha SMTP |
| `MAIL_FROM` | Sim | Endereço remetente |

---

## Endpoints Principais

| Método | Rota | Roles | Feature |
|---|---|---|---|
| `POST` | `/auth/login` | — | — |
| `GET` | `/me/features` | todos | — |
| `GET` | `/users/me` | todos | — |
| `PATCH` | `/users/:id/role` | ADMIN | — |
| `GET/POST` | `/academic/courses` | ADMIN, SECRETARIA | — |
| `GET/POST` | `/classes` | vários | — |
| `GET` | `/content/class/:classId/lessons` | todos | — |
| `GET/POST` | `/assignments/class/:classId` | vários | — |
| `GET/POST` | `/grades/class/:classId` | vários | — |
| `GET/POST` | `/attendance/class/:classId` | PROFESSOR | — |
| `GET` | `/notifications` | todos | — |
| `GET/POST` | `/finance/invoices` | vários | `financeiro` |
| `POST` | `/finance/invoices/:id/pix` | vários | `financeiro` |
| `POST` | `/finance/invoices/:id/boleto` | vários | `financeiro` |
| `POST` | `/webhooks/pagamentos` | — (token) | — |
| `GET/POST` | `/documents` | vários | `documentos` |
| `GET/POST` | `/live-classes` | vários | `aulas-ao-vivo` |
| `GET/POST` | `/tickets` | vários | `tickets` |
| `POST` | `/assistant/chat` | todos | `assistant` |

---

## Decisões de Projeto

**Por que Zod em vez de class-validator?**
Zod valida e infere o tipo TypeScript na mesma declaração. Menos boilerplate, zero decorators nas classes de DTO.

**Por que fetch nativo no gateway Asaas e no LLM?**
Evita adicionar SDKs para o que uma função com fetch resolve. O isolamento atrás de interface (`IPaymentGateway`, `ILlmProvider`) permite trocar a implementação sem alterar o domínio.

**Por que RAG com ILIKE em vez de pgvector agora?**
A extensão `vector` exige migration DDL. O `RagService` faz fallback silencioso se a tabela não existir, então o assistente funciona sem RAG até a migration ser aplicada. A interface de busca não muda — só a implementação interna.

**Por que o Invoice só vira PAGO via webhook?**
Garantia de consistência: o único estado de verdade é o que o gateway confirma. Baixa manual existe mas é auditada e restrita a admin — o fluxo normal nunca passa por ela.

**Por que máximo 5 iterações no loop de tool-calling?**
Evita loop infinito caso o provider envie `tool_use` indefinidamente por bug ou prompt injection. Cinco iterações cobrem qualquer fluxo legítimo do domínio.
