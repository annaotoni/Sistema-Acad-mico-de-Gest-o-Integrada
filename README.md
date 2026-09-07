# Sistema Acadêmico de Gestão Integrada

Backend de um portal acadêmico multi-perfil construído com **NestJS 11 + TypeScript**, seguindo arquitetura hexagonal em camadas com três guardas de segurança de domínio.

Projeto de portfólio com foco em clareza arquitetural, segurança de domínio e separação de responsabilidades.

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

---

## Os 3 Guards de Segurança de Domínio

Toda rota de domínio passa pelos três guards **nesta ordem**:

### 1. `FeatureGuard` — `@RequireFeature('chave')`
Verifica se a feature está habilitada para o tenant/curso/role do usuário.
Resolução em camadas: `GLOBAL → TENANT → COURSE → ROLE` (mais específico vence).

### 2. `RoleGuard` — `@Roles(...roles)`
Verifica se a role do usuário logado está na lista permitida pela rota.

### 3. `ScopeGuard` — `@RequireScope('class')`
Garante vínculo com o recurso: professor só acessa turmas onde está vinculado,
aluno só onde tem matrícula ativa. Admin/Secretaria passam sem checagem.

> **Regra crítica:** nunca filtrar só por role. Toda query de professor/aluno é
> filtrada por vínculo. Esconder no front não basta — o guard vive no backend.

---

## Módulos de Domínio

| Módulo | Responsabilidade |
|---|---|
| `auth` | Login, refresh, MFA, reset de senha |
| `users` | Perfil + troca de role (auditada) |
| `settings` | FeatureConfig multi-camada, `GET /me/features` |
| `academic` | Cursos, disciplinas, turmas, matrículas, vínculos de professor |
| `content` | Aulas e materiais (draft/published) |
| `assignments` | Atividades, entregas com flag `is_late` |
| `grades` | Notas — toda alteração auditada |
| `attendance` | Frequência — toda alteração auditada |
| `notifications` | Eventos via fila BullMQ, in-app + e-mail |
| `finance` | Faturas, Pix e boleto via Asaas |
| `documents` | Documentos oficiais com geração de PDF |
| `live-classes` | Aulas ao vivo, gravação vira Material |
| `tickets` | Canal de atendimento aluno ↔ secretaria |
| `assistant` | Chatbot com tool-calling + RAG institucional |

---

## Auditoria

`AuditLog` gerado obrigatoriamente em:

| Ação | `action` |
|---|---|
| Alteração de nota | `UPDATE` |
| Alteração de frequência | `UPDATE` |
| Baixa manual de pagamento | `MANUAL_PAYMENT` |
| Troca de role de usuário | `ROLE_CHANGE` |
| Emissão / recusa de documento | `EMITIDO` / `RECUSADO` |

---

## Financeiro — Regra de Ouro

`Invoice` só transita para `PAGO` por dois caminhos:

1. **Webhook** `POST /webhooks/pagamentos` — único ponto automático. Valida `asaas-access-token`, sem JWT.
2. **Baixa manual** — restrita a ADMIN/SECRETARIA, sempre gera `AuditLog`.

Job diário (BullMQ, `0 6 * * *`) marca faturas vencidas como `VENCIDO` e notifica o aluno.

---

## Assistente (Chatbot)

`POST /assistant/chat` — habilitável por tenant via `@RequireFeature('assistant')`.

- **Tool-calling nativo** sobre os services de domínio existentes (sem reimplementar regras)
- **RAG institucional** via busca textual (ILIKE → pgvector quando migrado)
- Guardrail temático: só responde sobre o domínio acadêmico do portal
- Nunca inventa dados — usa apenas o que as tools retornarem

---

## Como Rodar

### Pré-requisitos
- Node.js 20+, Docker, NPM

### 1. Sobe a infra
```bash
docker-compose up -d
```

### 2. Configura o ambiente
```bash
cp apps/api/.env.example apps/api/.env
# preencha DATABASE_URL, REDIS_URL, JWT secrets, ASAAS_*, ANTHROPIC_API_KEY, MAIL_*
```

### 3. Instala e inicializa
```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate deploy
```

### 4. Roda o servidor
```bash
npm run start:dev    # desenvolvimento
npm run start:prod   # produção (após npm run build)
```

### 5. Testes
```bash
npm test             # 140 testes unitários (sem banco)
npm run test:cov     # com cobertura
```

---

## Estrutura do Repositório

```
apps/
  api/                ← backend NestJS (este projeto)
    src/
      common/         guards, decorators, audit, interfaces
      infrastructure/ bullmq, redis
      integrations/   payment (Asaas), llm (Anthropic), pdf (pdfkit)
      jobs/           processors e schedulers BullMQ
      modules/        13 módulos de domínio
      webhooks/       /webhooks/pagamentos (sem JWT)
      prisma/         PrismaModule
    prisma/
      schema.prisma
      migrations/
```

Para decisões arquiteturais detalhadas, setup completo e referência de endpoints,
veja o [`apps/api/README.md`](./apps/api/README.md).
