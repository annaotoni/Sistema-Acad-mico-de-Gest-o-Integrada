# Plan 002: Tool consultarFrequencia passa user para filtrar por aluno logado

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 29df8aa..HEAD -- apps/api/src/modules/assistant/tools/tools.service.ts apps/api/src/modules/attendance/attendance.service.ts`
> Se algum arquivo mudou, compare os excerpts antes de prosseguir.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `29df8aa`, 2026-09-07

## Why this matters

A tool `consultarFrequencia` em `tools.service.ts:106` chama
`this.attendance.listAttendance(classId)` sem passar o usuário logado.
`AttendanceService.listAttendance(classId)` retorna `this.repo.findByClass(classId)` —
TODOS os registros de presença de todos os alunos da turma, sem filtro por usuário.

Via HTTP, o controller de attendance usa `@RequireScope('class')` que verifica o vínculo,
e provavelmente o service filtra por usuário. Mas a tool bypassa completamente esse guarda
e expõe dados de outros alunos para qualquer usuário que adivinhe um classId (UUID).

A mesma situação existe em `proximosPrazos` → `assignments.listAssignments(classId)` sem user,
mas assignments são dados da turma (não pessoais), então o impacto é menor.

## Current state

### `apps/api/src/modules/assistant/tools/tools.service.ts` (linhas relevantes)

```typescript
// tools.service.ts:104-106 (estado atual — BUG)
case 'consultarFrequencia':
  if (!input['classId']) return { error: 'classId é obrigatório' };
  return this.attendance.listAttendance(input['classId'] as string);
  // ↑ Sem `user` — retorna frequência de TODOS os alunos da turma

// tools.service.ts:117-119 (estado atual)
case 'proximosPrazos':
  if (!input['classId']) return { error: 'classId é obrigatório' };
  return this.assignments.listAssignments(input['classId'] as string);
  // ↑ listAssignments não filtra por aluno (assignments são de turma, não pessoais — menor risco)
```

### `apps/api/src/modules/attendance/attendance.service.ts` (estado atual)

```typescript
// attendance.service.ts:59-61
listAttendance(classId: string) {
  return this.repo.findByClass(classId);
}
// Não aceita user — retorna tudo
```

### O que os outros cases fazem corretamente (padrão a seguir)

```typescript
// tools.service.ts:99-102 — CORRETO (passa user)
case 'consultarNotas':
  if (!input['classId']) return { error: 'classId é obrigatório para consultar notas' };
  return this.grades.listGrades(input['classId'] as string, user);
```

## Commands you will need

| Purpose    | Command (em `apps/api`)                             | Expected                  |
|-----------|-----------------------------------------------------|---------------------------|
| Typecheck  | `npx tsc --noEmit`                                  | exit 0                    |
| Lint       | `npm run lint -- --max-warnings=0`                  | exit 0                    |
| Unit tests | `npm test`                                          | exit 0, all pass          |

## Scope

**In scope**:
- `apps/api/src/modules/attendance/attendance.service.ts`
- `apps/api/src/modules/attendance/attendance.repository.ts`
- `apps/api/src/modules/assistant/tools/tools.service.ts`

**Out of scope**:
- `apps/api/src/modules/attendance/attendance.controller.ts` — não muda
- `apps/api/src/modules/assignments/` — menor risco, deixar para avaliação futura

## Git workflow

- Commit: `fix(assistant): filtra frequência pelo aluno logado na tool consultarFrequencia`
- Do NOT push

## Steps

### Step 1: Adicionar overload filtrado em AttendanceService

Edite `apps/api/src/modules/attendance/attendance.service.ts`.

Adicione um novo método `listAttendanceForUser` que filtra pelo estudante:

```typescript
listAttendanceForUser(classId: string, userId: string) {
  return this.repo.findByClassAndStudent(classId, userId);
}
```

Mantenha o método `listAttendance(classId)` existente — ele é usado pelo controller HTTP
que já tem ScopeGuard protegendo o acesso.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 2: Adicionar `findByClassAndStudent` no AttendanceRepository

Edite `apps/api/src/modules/attendance/attendance.repository.ts`.

Leia primeiro o método existente `findByClass(classId)` no arquivo para ver o padrão
e adicione um novo método:

```typescript
findByClassAndStudent(classId: string, studentId: string) {
  return this.prisma.attendanceRecord.findMany({
    where: { classId, studentId },
    orderBy: { date: 'desc' },
  });
}
```

Use o mesmo padrão de import e style do arquivo existente.

**Verify**: `npx tsc --noEmit` → exit 0

### Step 3: Atualizar tool `consultarFrequencia` para usar o novo método

Edite `apps/api/src/modules/assistant/tools/tools.service.ts`.

Mude o case `consultarFrequencia`:

```typescript
// ANTES:
case 'consultarFrequencia':
  if (!input['classId']) return { error: 'classId é obrigatório' };
  return this.attendance.listAttendance(input['classId'] as string);

// DEPOIS:
case 'consultarFrequencia':
  if (!input['classId']) return { error: 'classId é obrigatório' };
  return this.attendance.listAttendanceForUser(
    input['classId'] as string,
    user.sub,
  );
```

**Verify**: `grep -A3 "consultarFrequencia" apps/api/src/modules/assistant/tools/tools.service.ts`
deve mostrar `listAttendanceForUser` com `user.sub`.

### Step 4: Typecheck e lint

```bash
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm test
```

**Verify**: todos saem com exit 0, nenhum teste quebra.

## Test plan

Se existir spec para `AttendanceService` ou `ToolsService`, adicione:
- Teste que `consultarFrequencia` com classId válido retorna apenas registros do `user.sub`
- Teste que registros de outro aluno na mesma turma NÃO aparecem

Se não existir spec, a verificação é via typecheck + build.

## Done criteria

- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint -- --max-warnings=0` exits 0
- [ ] `npm test` exits 0
- [ ] `grep "listAttendanceForUser" apps/api/src/modules/assistant/tools/tools.service.ts` → encontra
- [ ] `grep "findByClassAndStudent" apps/api/src/modules/attendance/attendance.repository.ts` → encontra
- [ ] Nenhum arquivo fora do escopo modificado

## STOP conditions

- O método `listAttendance` no service não existe como mostrado — pare e leia o arquivo real.
- `findByClass` no repository tem assinatura diferente — adapte o novo método ao padrão existente.
- `npx tsc --noEmit` falha após 2 tentativas.

## Maintenance notes

- Se `listAttendance(classId)` for removido no futuro (sem user), garanta que
  o controller HTTP também passa o user como filtro.
- A tool `proximosPrazos` tem risco menor (assignments são dados de turma),
  mas pode ser filtrada da mesma forma em iteração futura.
