# Plans — Sistema Acadêmico

Gerado contra o commit `29df8aa`, 2026-09-07.

## Ordem de execução recomendada

| # | Plano | Categoria | Prioridade | Esforço | Risco | Status | Depende de |
|---|-------|-----------|------------|---------|-------|--------|------------|
| 001 | [JwtAuthGuard no AssistantController](001-jwt-guard-assistant.md) | security | P1 | S | LOW | DONE | — |
| 002 | [Fix escopo consultarFrequencia/proximosPrazos](002-tool-scope-bypass.md) | security | P1 | S | LOW | DONE | — |
| 003 | [AuditLog em gradeSubmission](003-grade-submission-audit.md) | correctness | P1 | S | LOW | DONE | — |
| 004 | [JWT_REFRESH_SECRET obrigatório](004-env-validation.md) | security | P1 | S | LOW | DONE | — |
| 005 | [Idempotência webhook pagamento](005-payment-dedup.md) | correctness | P2 | M | MEDIUM | DONE (migration pendente de aplicação manual) | — |
| 006 | [Remove timing leak webhook token](006-timing-leak-webhook.md) | security | P2 | S | LOW | DONE | — |
| 007 | [SCOPE_PRIORITY → constante compartilhada](007-scope-priority-constant.md) | tech-debt | P2 | S | LOW | DONE | — |
| 008 | [Remove scaffold AppController/AppService](008-dead-code-app-controller.md) | tech-debt | P3 | S | LOW | DONE | — |
| 009 | [Swagger em /api-docs](009-swagger.md) | dx | P3 | S | LOW | DONE | — |
| 010 | [Prisma latest 6.x + ts-jest 30.x](010-deps-bump.md) | dependencies | P3 | S | LOW | PARTIAL — Prisma 6.19.3 ✓; ts-jest 30.x não existe ainda (latest: 29.4.12) | — |

## Dependências entre planos

Nenhuma dependência cruzada — todos os planos são independentes e podem ser executados em paralelo.

## Considerados e rejeitados

- **AuditLog.userId NOT NULL para webhooks**: falso positivo — o módulo auth usa `auth_audit_log` separado (userId nullable); o `AuditService` do domínio sempre recebe userId válido.
- **Submissões tardias sem erro**: by design — `is_late` é marcado mas envio é aceito; a regra de bloqueio é parametrizável por curso.
- **SSRF via HTTP proxy**: by design — comportamento padrão Node.js de honrar `https_proxy`; não é uma vulnerabilidade gerenciada pela app.
