import { useState } from 'react';
import { useDocuments, useCreateDocument } from '../hooks';
import { Plus } from 'lucide-react';

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  SOLICITADO: { label: 'Solicitado', bg: 'var(--lilac-soft)', fg: 'var(--lilac)' },
  EM_ANALISE: { label: 'Em análise', bg: 'var(--warn-soft)', fg: 'var(--warn)' },
  EMITIDO: { label: 'Emitido', bg: 'var(--ok-soft)', fg: 'var(--ok)' },
  RECUSADO: { label: 'Recusado', bg: 'var(--danger-soft)', fg: 'var(--danger)' },
};

const DOC_TYPES = [
  { value: 'DECLARACAO_MATRICULA', label: 'Declaração de matrícula' },
  { value: 'HISTORICO_ESCOLAR', label: 'Histórico escolar' },
  { value: 'DECLARACAO_FREQUENCIA', label: 'Declaração de frequência' },
  { value: 'ATESTADO_CONCLUSAO', label: 'Atestado de conclusão' },
];

function NewDocModal({ onClose }: { onClose: () => void }) {
  const create = useCreateDocument();
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');

  async function submit() {
    if (!type) return;
    await create.mutateAsync({ type, description: desc || undefined });
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
          Solicitar documento
        </h3>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-3)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Tipo de documento
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 13,
            }}
          >
            <option value="">Selecione…</option>
            {DOC_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
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
            Observação (opcional)
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Informações adicionais…"
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 13,
              resize: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={submit}
            disabled={!type || create.isPending}
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
            {create.isPending ? 'Enviando…' : 'Solicitar'}
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

export function Documentos() {
  const { data, isPending } = useDocuments();
  const [showNew, setShowNew] = useState(false);

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: 0, flex: 1 }}>
          Documentos
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
          <Plus size={14} /> Solicitar
        </button>
      </div>

      {isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}
      {!isPending && !data?.length && (
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhum documento solicitado.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data?.map((doc) => {
          const s = STATUS_LABEL[doc.status] ?? STATUS_LABEL.SOLICITADO;
          const label = DOC_TYPES.find((d) => d.value === doc.type)?.label ?? doc.type;
          return (
            <div
              key={doc.id}
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
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                  Solicitado em {new Date(doc.requestedAt).toLocaleDateString('pt-BR')}
                </div>
                {doc.notes && (
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 4 }}>
                    {doc.notes}
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
                }}
              >
                {s.label}
              </span>
              {doc.fileUrl && doc.status === 'EMITIDO' && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--lilac)',
                    padding: '5px 12px',
                    border: '1px solid var(--lilac-line)',
                    borderRadius: 6,
                  }}
                >
                  Baixar
                </a>
              )}
            </div>
          );
        })}
      </div>

      {showNew && <NewDocModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
