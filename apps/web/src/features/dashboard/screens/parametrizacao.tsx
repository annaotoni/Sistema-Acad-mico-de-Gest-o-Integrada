import { useFeatures } from '../hooks';

export function Parametrizacao() {
  const { data, isPending } = useFeatures();

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>
        Parametrização
      </h2>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 24px' }}>
        Funcionalidades ativas para este tenant. Configure via API ou painel admin.
      </p>

      {isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {data?.tabs.map((tab) => (
          <div
            key={tab.key}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--lilac-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--lilac)',
                }}
              >
                {tab.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{tab.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'monospace' }}>
                  {tab.key}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--ok-soft)',
                  color: 'var(--ok)',
                }}
              >
                Ativo
              </span>
            </div>
            {tab.configJson && Object.keys(tab.configJson as Record<string, unknown>).length > 0 ? (
              <pre
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: 'var(--surface-2)',
                  padding: '8px 10px',
                  borderRadius: 6,
                  margin: 0,
                  overflow: 'auto',
                  color: 'var(--ink-2)',
                  maxHeight: 100,
                }}
              >
                {JSON.stringify(tab.configJson, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>

      {data?.config && Object.keys(data.config).length > 0 && (
        <div style={{ marginTop: 28 }}>
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
            Configuração global
          </div>
          <pre
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: '14px 16px',
              borderRadius: 10,
              color: 'var(--ink-2)',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(data.config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
