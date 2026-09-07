import { useClasses, useAssignments } from '../hooks';
import type { ApiClass, Assignment } from '../api';

function statusOf(a: Assignment) {
  const due = new Date(a.dueDate);
  const now = new Date();
  const hasSub = a.submissions && a.submissions.length > 0;
  if (hasSub) {
    const sub = a.submissions![0];
    if (sub.score != null)
      return { label: `Nota: ${sub.score}`, bg: 'var(--ok-soft)', fg: 'var(--ok)' };
    return { label: 'Enviado', bg: 'var(--lilac-soft)', fg: 'var(--lilac)' };
  }
  if (due < now) return { label: 'Atrasado', bg: 'var(--danger-soft)', fg: 'var(--danger)' };
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (days <= 2)
    return {
      label: `${days}d restante${days !== 1 ? 's' : ''}`,
      bg: 'var(--warn-soft)',
      fg: 'var(--warn)',
    };
  return { label: 'Pendente', bg: 'var(--surface-3)', fg: 'var(--ink-3)' };
}

function ClassAssignments({ cls }: { cls: ApiClass }) {
  const { data, isPending } = useAssignments(cls.id);
  if (isPending) return null;
  if (!data?.length) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 700,
            background: 'var(--lilac-soft)',
            color: 'var(--lilac)',
          }}
        >
          {cls.code}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {cls.discipline.name}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((a) => {
          const s = statusOf(a);
          return (
            <div
              key={a.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  Prazo: {new Date(a.dueDate).toLocaleDateString('pt-BR')} · Valor: {a.maxScore}
                </div>
                {a.description && (
                  <div
                    style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}
                  >
                    {a.description}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: s.bg,
                  color: s.fg,
                  whiteSpace: 'nowrap',
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Atividades() {
  const classes = useClasses();
  const active = classes.data?.filter((c) => c.status === 'EM_ANDAMENTO') ?? [];

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 24px' }}>
        Atividades
      </h2>
      {classes.isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}
      {active.map((cls) => (
        <ClassAssignments key={cls.id} cls={cls} />
      ))}
      {!classes.isPending && active.length === 0 && (
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma turma ativa.</div>
      )}
    </div>
  );
}
