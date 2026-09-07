# Plan 003: gradeSubmission gera AuditLog como grades e attendance

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/modules/assignments/assignments.service.ts apps/api/src/modules/assignments/assignments.module.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

`GradesService.updateGrade()` e `AttendanceService.updateAttendance()` ambos geram
`AuditLog` a cada mutação (quem, quando, valor antigo → novo). Mas `AssignmentsService.gradeSubmission()`
não injeta `AuditService` e não gera audit. Notas de entrega podem ser alteradas
sem nenhum rastro — viola o requisito de auditoria acadêmica do sistema.

## Current state

### `apps/api/src/modules/assignments/assignments.service.ts`

```typescript
// assignments.service.ts:1-16 (construtor atual — sem AuditService)
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccessTokenPayload } from '../../common/interfaces/access-token-payload';
import { AssignmentsRepository } from './assignments.repository';
// ... sem import de AuditService

@Injectable()
export class AssignmentsService {
  constructor(private readonly repo: AssignmentsRepository) {}
  // ↑ Sem AuditService injetado

// assignments.service.ts:67-89 (gradeSubmission — sem audit)
  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, user: AccessTokenPayload) {
    const submission = await this.repo.findSubmissionById(submissionId);
    if (!submission) throw new NotFoundException('Entrega não encontrada');
    const assignment = await this.repo.findAssignmentById(submission.assignmentId);
    if (!assignment) throw new NotFoundException('Atividade não encontrada');
    if (dto.score > Number(assignment.maxScore)) {
      throw new BadRequestException(`Nota ${dto.score} excede o máximo permitido (${Number(assignment.maxScore)})`);
    }
    return this.repo.gradeSubmission(submissionId, { ...dto, gradedById: user.sub });
    // ↑ Sem audit.log() — lacuna
  }
```

### Padrão canônico a seguir: `grades.service.ts`

```typescript
// grades.service.ts:1-5 (imports)
import { AuditService } from '../../common/audit/audit.service';

// grades.service.ts:construtor
constructor(
  private readonly repo: GradesRepository,
  private readonly audit: AuditService,
) {}

// grades.service.ts — dentro de updateGrade()
await this.audit.log({
  entity: 'Grade',
  entityId: grade.id,
  userId: user.sub,
  action: 'UPDATE',
  oldValue: { value: grade.value },
  newValue: { value: dto.value },
});
```

### `apps/api/src/modules/assignments/assignments.module.ts`

Leia o arquivo para ver os providers atuais. `AuditModule` é `@Global()` então
`AuditService` está disponível se importado. Verifique se `AuditModule` precisa
ser adicionado nos imports do módulo.

## Commands you will need

| Purpose    | Command (em `apps/api`)                              | Expected       |
|-----------|------------------------------------------------------|----------------|
| Typecheck  | `npx tsc --noEmit`                                   | exit 0         |
| Lint       | `npm run lint -- --max-warnings=0`                   | exit 0         |
| Unit tests | `npm test -- --testPathPattern=assignments`          | exit 0         |
| All tests  | `npm test`                                           | exit 0         |

## Scope

**In scope**:
- `apps/api/src/modules/assignments/assignments.service.ts`
- `apps/api/src/modules/assignments/assignments.module.ts` (se necessário adicionar AuditModule)

**Out of scope**:
- `apps/api/src/modules/assignments/assignments.repository.ts`
- `apps/api/src/common/audit/` — não muda
- Qualquer outro módulo

## Git workflow

- Commit: `fix(assignments): adiciona AuditLog em gradeSubmission seguindo padrão de grades`

## Steps

### Step 1: Adicionar AuditService no construtor de AssignmentsService

Edite `apps/api/src/modules/assignments/assignments.service.ts`.

1. Adicione o import:
```typescript
import { AuditService } from '../../common/audit/audit.service';
```

2. Adicione no construtor:
```typescript
constructor(
  private readonly repo: AssignmentsRepository,
  private readonly audit: AuditService,
) {}
```

**Verify**: `npx tsc --noEmit` → exit 0

### Step 2: Adicionar audit.log() em gradeSubmission

No método `gradeSubmission`, antes de chamar `this.repo.gradeSubmission(...)`,
adicione o log de auditoria seguindo o padrão de `grades.service.ts`:

```typescript
async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, user: AccessTokenPayload) {
  const submission = await this.repo.findSubmissionById(submissionId);
  if (!submission) throw new NotFoundException('Entrega não encontrada');

  const assignment = await this.repo.findAssignmentById(submission.assignmentId);
  if (!assignment) throw new NotFoundException('Atividade não encontrada');
  if (dto.score > Number(assignment.maxScore)) {
    throw new BadRequestException(`Nota ${dto.score} excede o máximo permitido (${Number(assignment.maxScore)})`);
  }

  // Auditoria obrigatória: toda correção de entrega deve ser rastreável
  await this.audit.log({
    entity: 'Submission',
    entityId: submissionId,
    userId: user.sub,
    action: 'GRADE',
    oldValue: { score: submission.score, feedback: submission.feedback },
    newValue: { score: dto.score, feedback: dto.feedback },
  });

  return this.repo.gradeSubmission(submissionId, { ...dto, gradedById: user.sub });
}
```

**Verify**: `grep -A5 "audit.log" apps/api/src/modules/assignments/assignments.service.ts` → encontra o log

### Step 3: Verificar se AuditModule precisa ser importado

Leia `apps/api/src/modules/assignments/assignments.module.ts`.

Se `AuditModule` não estiver nos imports E `AuditModule` não for `@Global()` (verifique
`apps/api/src/common/audit/audit.module.ts` — se tiver `@Global()` decorator, não precisa adicionar).

`AuditModule` JÁ tem `@Global()` (confirme lendo o arquivo). Se confirmado, nenhuma mudança
no module é necessária.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 4: Atualizar mock no spec (se existir)

Se `apps/api/src/modules/assignments/assignments.service.spec.ts` existir, verifique
se o mock de `AuditService` está presente. Se não, adicione:

```typescript
const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
// ... no createTestingModule providers:
{ provide: AuditService, useValue: mockAudit },
```

**Verify**: `npm test -- --testPathPattern=assignments` → exit 0

## Test plan

Se spec existir: confirme que o teste de `gradeSubmission` não quebra e que
`audit.log` é chamado com `action: 'GRADE'`.

Se spec não existir: `npx tsc --noEmit` + `npm test` (suite completa) passando é suficiente.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint -- --max-warnings=0` exits 0
- [ ] `npm test` exits 0
- [ ] `grep "audit.log" apps/api/src/modules/assignments/assignments.service.ts` → encontra
- [ ] `grep "AuditService" apps/api/src/modules/assignments/assignments.service.ts` → encontra no import e constructor
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- `gradeSubmission` no arquivo real não tem a mesma assinatura dos excerpts — drift, pare.
- `AuditService.log()` tem assinatura diferente da mostrada — leia `audit.service.ts` e adapte.
- `npx tsc --noEmit` falha com erro de DI após 2 tentativas.

## Maintenance notes

- Se `AssignmentsService` ganhar outros métodos de mutação (editar enunciado, excluir atividade),
  adicionar `audit.log()` nesses métodos também.
- O campo `oldValue: { score: submission.score }` requer que o `repo.findSubmissionById`
  retorne o campo `score`. Se o select for parcial, adicione `score` ao select.
