import { useMe, useClasses, useLiveClasses, useNotifCount } from '../hooks';

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

function StatBox({
  label,
  value,
  hint,
  fg,
}: {
  label: string;
  value: string;
  hint: string;
  fg?: string;
}) {
  return (
    <Card>
      <div
        style={{
          fontSize: 12,
          color: 'var(--ink-3)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: fg ?? 'var(--ink)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{hint}</div>
    </Card>
  );
}

export function Inicio() {
  const me = useMe();
  const classes = useClasses();
  const live = useLiveClasses();
  const notif = useNotifCount();

  const name = me.data?.email.split('@')[0] ?? '…';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const activeClasses = classes.data?.filter((c) => c.status === 'EM_ANDAMENTO') ?? [];
  const upcomingLive = live.data?.filter((l) => l.status === 'AGENDADA') ?? [];
  const liveNow = live.data?.filter((l) => l.status === 'AO_VIVO') ?? [];

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }} className="sagi-rise">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
          {greeting}, {name}.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatBox label="Turmas ativas" value={String(activeClasses.length)} hint="período atual" />
        <StatBox
          label="Aulas ao vivo"
          value={String(upcomingLive.length)}
          hint={liveNow.length > 0 ? `${liveNow.length} ao vivo agora` : 'agendadas'}
          fg={liveNow.length > 0 ? 'var(--danger)' : undefined}
        />
        <StatBox
          label="Notificações"
          value={String(notif.data?.count ?? 0)}
          hint="não lidas"
          fg={notif.data?.count ? 'var(--warn)' : undefined}
        />
      </div>

      {/* Classes list */}
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink-3)',
            marginBottom: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Minhas turmas
        </div>
        {classes.isPending && (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Carregando…</div>
        )}
        {activeClasses.length === 0 && !classes.isPending && (
          <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma turma ativa.</div>
        )}
        {activeClasses.map((c) => (
          <div
            key={c.id}
            className="s-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 8px',
              borderRadius: 8,
              margin: '2px 0',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                flexShrink: 0,
                background: 'var(--lilac-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 12,
                color: 'var(--lilac)',
              }}
            >
              {c.code.slice(0, 3)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.discipline.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                {c.code} · {c.discipline.course.name}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--ok-soft)',
                color: 'var(--ok)',
              }}
            >
              {c._count.enrollments} alunos
            </div>
          </div>
        ))}
      </Card>

      {/* Upcoming live classes */}
      {upcomingLive.length > 0 && (
        <Card>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-3)',
              marginBottom: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Próximas aulas ao vivo
          </div>
          {upcomingLive.map((l) => (
            <div
              key={l.id}
              className="s-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 8px',
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 36,
                  borderRadius: 2,
                  background: 'var(--lilac)',
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{l.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {new Date(l.scheduledAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
              {l.videoLink && (
                <a
                  href={l.videoLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--lilac)',
                    padding: '5px 10px',
                    border: '1px solid var(--lilac-line)',
                    borderRadius: 6,
                  }}
                >
                  Entrar
                </a>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
