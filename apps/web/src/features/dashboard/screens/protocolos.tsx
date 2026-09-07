import { useState } from 'react';
import { useTickets, useTicket, useCreateTicket, useSendMessage } from '../hooks';
import { Plus, Send } from 'lucide-react';
import { useMe } from '../hooks';

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  ABERTO: { bg: 'var(--lilac-soft)', fg: 'var(--lilac)', label: 'Aberto' },
  EM_ATENDIMENTO: { bg: 'var(--warn-soft)', fg: 'var(--warn)', label: 'Em atendimento' },
  RESOLVIDO: { bg: 'var(--ok-soft)', fg: 'var(--ok)', label: 'Resolvido' },
  FECHADO: { bg: 'var(--surface-3)', fg: 'var(--ink-3)', label: 'Fechado' },
};

function TicketDetail({ id, myId }: { id: string; myId: string }) {
  const { data } = useTicket(id);
  const send = useSendMessage(id);
  const [msg, setMsg] = useState('');

  async function submit() {
    const text = msg.trim();
    if (!text || send.isPending) return;
    setMsg('');
    await send.mutateAsync(text);
  }

  if (!data) return <div style={{ padding: 20, color: 'var(--ink-3)' }}>Carregando…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {data.messages?.map((m) => {
          const isMe = m.authorId === myId;
          return (
            <div
              key={m.id}
              style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: isMe ? 'var(--lilac)' : 'var(--surface-2)',
                  color: isMe ? 'var(--on-lilac)' : 'var(--ink)',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <div>{m.content}</div>
                <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                  {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {!data.messages?.length && (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
            Nenhuma mensagem ainda.
          </div>
        )}
      </div>
      {data.status !== 'FECHADO' && data.status !== 'RESOLVIDO' && (
        <div
          style={{
            borderTop: '1px solid var(--line)',
            padding: '10px 16px',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submit()}
            placeholder="Escreva sua mensagem…"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={!msg.trim() || send.isPending}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--lilac)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--on-lilac)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTicket();
  const [subject, setSubject] = useState('');

  async function submit() {
    if (!subject.trim()) return;
    await create.mutateAsync({ subject: subject.trim() });
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 16,
          padding: 28,
          width: 400,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
          Abrir protocolo
        </h3>
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-3)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Assunto
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Descreva o assunto…"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 13,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={!subject.trim() || create.isPending}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 8,
              background: 'var(--lilac)',
              color: 'var(--on-lilac)',
              border: 'none',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {create.isPending ? 'Abrindo…' : 'Abrir'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function Protocolos() {
  const me = useMe();
  const { data, isPending } = useTickets();
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }} className="sagi-rise">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: 0, flex: 1 }}>
          Protocolos
        </h2>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            background: 'var(--lilac)',
            color: 'var(--on-lilac)',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Novo protocolo
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}
          {!isPending && !data?.length && (
            <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhum protocolo aberto.</div>
          )}
          {data?.map((t) => {
            const s = STATUS_STYLE[t.status] ?? STATUS_STYLE.ABERTO;
            const isActive = t.id === selected;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(isActive ? null : t.id)}
                style={{
                  background: 'var(--surface)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? 'var(--lilac)' : 'var(--line)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
                    {t.subject}
                  </span>
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
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  Aberto em {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        {selected && me.data && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              overflow: 'hidden',
              height: 500,
            }}
          >
            <TicketDetail id={selected} myId={me.data.id} />
          </div>
        )}
      </div>

      {showNew && <NewTicketModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
