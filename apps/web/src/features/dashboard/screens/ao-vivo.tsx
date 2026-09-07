import { useLiveClasses } from '../hooks';
import { Video, Clock, Radio } from 'lucide-react';

function statusStyle(status: string) {
  if (status === 'AO_VIVO')
    return { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Ao vivo', dot: true };
  if (status === 'AGENDADA')
    return { bg: 'var(--lilac-soft)', fg: 'var(--lilac)', label: 'Agendada', dot: false };
  return { bg: 'var(--surface-3)', fg: 'var(--ink-3)', label: 'Encerrada', dot: false };
}

export function AoVivo() {
  const { data, isPending } = useLiveClasses();

  const live = data?.filter((l) => l.status === 'AO_VIVO') ?? [];
  const upcoming = data?.filter((l) => l.status === 'AGENDADA') ?? [];
  const past = data?.filter((l) => l.status === 'ENCERRADA') ?? [];

  function Section({ title, items }: { title: string; items: typeof data }) {
    if (!items?.length) return null;
    return (
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ink-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((l) => {
            const s = statusStyle(l.status);
            return (
              <div
                key={l.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '16px 20px',
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
                    background: s.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {l.status === 'AO_VIVO' ? (
                    <Radio size={20} color={s.fg} />
                  ) : (
                    <Video size={20} color={s.fg} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    {l.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <Clock size={11} />
                    {new Date(l.scheduledAt).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: s.bg,
                      color: s.fg,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {s.dot && (
                      <span
                        className="sagi-pulse"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: s.fg,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    {s.label}
                  </span>
                  {l.videoLink && l.status !== 'ENCERRADA' && (
                    <a
                      href={l.videoLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '6px 14px',
                        borderRadius: 8,
                        background: 'var(--lilac)',
                        color: 'var(--on-lilac)',
                        textDecoration: 'none',
                      }}
                    >
                      Entrar
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 24px' }}>
        Aulas ao vivo
      </h2>
      {isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}
      {!isPending && !data?.length && (
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma aula ao vivo encontrada.</div>
      )}
      <Section title="Ao vivo agora" items={live} />
      <Section title="Agendadas" items={upcoming} />
      <Section title="Encerradas" items={past} />
    </div>
  );
}
