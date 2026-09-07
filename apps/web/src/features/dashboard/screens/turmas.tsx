import { useState } from 'react';
import { useClasses, useAssignments, useGrades, useAttendance } from '../hooks';
import type { ApiClass } from '../api';

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    EM_ANDAMENTO: { bg: 'var(--ok-soft)', fg: 'var(--ok)', label: 'Em andamento' },
    ABERTA: { bg: 'var(--lilac-soft)', fg: 'var(--lilac)', label: 'Aberta' },
    ENCERRADA: { bg: 'var(--surface-3)', fg: 'var(--ink-3)', label: 'Encerrada' },
  };
  const s = map[status] ?? map.ENCERRADA;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 6,
        background: s.bg,
        color: s.fg,
      }}
    >
      {s.label}
    </span>
  );
}

function ClassDetail({ cls }: { cls: ApiClass }) {
  const assignments = useAssignments(cls.id);
  const grades = useGrades(cls.id);
  const attendance = useAttendance(cls.id);

  const pending = assignments.data?.filter((a) => !a.submissions?.length) ?? [];
  const avgGrade = grades.data?.length
    ? (grades.data.reduce((s, g) => s + parseFloat(g.value), 0) / grades.data.length).toFixed(1)
    : '—';
  const presentCount = attendance.data?.filter((a) => a.present).length ?? 0;
  const totalAttendance = attendance.data?.length ?? 0;
  const freqPct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginTop: 16,
      }}
    >
      <Card style={{ padding: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Atividades pendentes
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: pending.length > 0 ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          {assignments.isPending ? '…' : pending.length}
        </div>
      </Card>
      <Card style={{ padding: 14 }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          Média de notas
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
          {grades.isPending ? '…' : avgGrade}
        </div>
      </Card>
      {freqPct !== null && (
        <Card style={{ padding: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Frequência
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: freqPct >= 75 ? 'var(--ok)' : 'var(--danger)',
            }}
          >
            {freqPct}%
          </div>
        </Card>
      )}
    </div>
  );
}

export function Turmas() {
  const classes = useClasses();
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCls = classes.data?.find((c) => c.id === selected) ?? null;

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 24px' }}>
        Turmas
      </h2>

      {classes.isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {classes.data?.map((c) => (
          <div key={c.id}>
            <div
              className="s-card-hover"
              onClick={() => setSelected(selected === c.id ? null : c.id)}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${selected === c.id ? 'var(--lilac)' : 'var(--line)'}`,
                borderRadius: 12,
                padding: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: 'var(--lilac-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 13,
                  color: 'var(--lilac)',
                }}
              >
                {c.code.slice(0, 3)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {c.discipline.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  {c.code} · {c.discipline.course.name} · {c.period.name}
                </div>
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}
              >
                {statusBadge(c.status)}
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {c._count.enrollments} alunos
                </span>
              </div>
            </div>

            {selected === c.id && selectedCls && <ClassDetail cls={selectedCls} />}
          </div>
        ))}
      </div>
    </div>
  );
}
