import { useClasses, useGrades, useAttendance } from '../hooks';
import type { ApiClass } from '../api';

function ClassGrades({ cls }: { cls: ApiClass }) {
  const grades = useGrades(cls.id);
  const attendance = useAttendance(cls.id);

  const presentCount = attendance.data?.filter((a) => a.present).length ?? 0;
  const total = attendance.data?.length ?? 0;
  const freqPct = total > 0 ? Math.round((presentCount / total) * 100) : null;
  const freqOk = freqPct !== null && freqPct >= 75;

  if (!grades.data?.length && !attendance.data?.length && !grades.isPending) return null;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--surface-2)',
        }}
      >
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
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
          {cls.discipline.name}
        </span>
        {freqPct !== null && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              background: freqOk ? 'var(--ok-soft)' : 'var(--danger-soft)',
              color: freqOk ? 'var(--ok)' : 'var(--danger)',
            }}
          >
            Freq.: {freqPct}%
          </span>
        )}
      </div>

      {/* Grades */}
      <div style={{ padding: '4px 0' }}>
        {grades.isPending && (
          <div style={{ padding: '12px 18px', color: 'var(--ink-3)', fontSize: 13 }}>
            Carregando…
          </div>
        )}
        {grades.data?.length === 0 && !grades.isPending && (
          <div style={{ padding: '12px 18px', color: 'var(--ink-3)', fontSize: 13 }}>
            Nenhuma nota lançada.
          </div>
        )}
        {grades.data?.map((g) => {
          const val = parseFloat(g.value);
          const ok = val >= 5;
          return (
            <div
              key={g.id}
              className="s-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 18px',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{g.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: ok ? 'var(--ok)' : 'var(--danger)',
                  minWidth: 40,
                  textAlign: 'right',
                }}
              >
                {g.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Notas() {
  const classes = useClasses();
  const active = classes.data?.filter((c) => c.status === 'EM_ANDAMENTO') ?? [];

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 24px' }}>
        Notas e frequência
      </h2>
      {classes.isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}
      {active.map((cls) => (
        <ClassGrades key={cls.id} cls={cls} />
      ))}
      {!classes.isPending && active.length === 0 && (
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma turma ativa.</div>
      )}
    </div>
  );
}
