import { useState } from 'react';
import { useInvoices, useGeneratePix, useGenerateBoleto } from '../hooks';
import type { Invoice } from '../api';

function statusStyle(status: string) {
  if (status === 'PAGO') return { bg: 'var(--ok-soft)', fg: 'var(--ok)', label: 'Pago' };
  if (status === 'VENCIDO')
    return { bg: 'var(--danger-soft)', fg: 'var(--danger)', label: 'Vencido' };
  return { bg: 'var(--warn-soft)', fg: 'var(--warn)', label: 'Pendente' };
}

function fmt(amount: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    parseFloat(amount),
  );
}

function PayModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const pix = useGeneratePix();
  const boleto = useGenerateBoleto();

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
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
          {invoice.description}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-3)' }}>
          {fmt(invoice.amount)} · Vence {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
        </p>

        {pix.data && (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8 }}>
              PIX — Copia e Cola
            </div>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'monospace',
                background: 'var(--surface-3)',
                padding: '8px 10px',
                borderRadius: 6,
                wordBreak: 'break-all',
                color: 'var(--ink-2)',
              }}
            >
              {pix.data.copyPaste}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(pix.data!.copyPaste)}
              style={{
                marginTop: 8,
                fontSize: 12,
                color: 'var(--lilac)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Copiar código
            </button>
          </div>
        )}

        {boleto.data && (
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              background: 'var(--surface-2)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginBottom: 8 }}>
              Boleto
            </div>
            <a
              href={boleto.data.boletoUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--lilac)', fontWeight: 600 }}
            >
              Visualizar boleto
            </a>
            <div
              style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 6, color: 'var(--ink-3)' }}
            >
              {boleto.data.digitableLine}
            </div>
          </div>
        )}

        {!pix.data && !boleto.data && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => pix.mutate(invoice.id)}
              disabled={pix.isPending}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                background: 'var(--lilac)',
                color: 'var(--on-lilac)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {pix.isPending ? 'Gerando…' : 'Gerar PIX'}
            </button>
            <button
              onClick={() => boleto.mutate(invoice.id)}
              disabled={boleto.isPending}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13,
                background: 'transparent',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                cursor: 'pointer',
              }}
            >
              {boleto.isPending ? 'Gerando…' : 'Gerar boleto'}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--ink-3)',
            fontSize: 13,
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export function Financeiro() {
  const { data, isPending } = useInvoices();
  const [paying, setPaying] = useState<Invoice | null>(null);

  const pending = data?.filter((i) => i.status !== 'PAGO') ?? [];
  const paid = data?.filter((i) => i.status === 'PAGO') ?? [];
  const totalPending = pending.reduce((s, i) => s + parseFloat(i.amount), 0);

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }} className="sagi-rise">
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 24px' }}>
        Financeiro
      </h2>

      {/* Summary */}
      {pending.length > 0 && (
        <div
          style={{
            background: 'var(--warn-soft)',
            border: '1px solid var(--warn)',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)' }}>
              Faturas em aberto
            </div>
            <div style={{ fontSize: 12, color: 'var(--warn)', opacity: 0.8, marginTop: 2 }}>
              {pending.length} fatura{pending.length !== 1 ? 's' : ''} · Total{' '}
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalPending,
              )}
            </div>
          </div>
        </div>
      )}

      {isPending && <div style={{ color: 'var(--ink-3)' }}>Carregando…</div>}

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}
          >
            Em aberto
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map((inv) => {
              const s = statusStyle(inv.status);
              return (
                <div
                  key={inv.id}
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                      {inv.description}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                      Vence: {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', marginRight: 12 }}
                  >
                    {fmt(inv.amount)}
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: s.bg,
                      color: s.fg,
                      marginRight: 8,
                    }}
                  >
                    {s.label}
                  </span>
                  <button
                    onClick={() => setPaying(inv)}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 14px',
                      borderRadius: 8,
                      background: 'var(--lilac)',
                      color: 'var(--on-lilac)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Pagar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ink-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}
          >
            Pagas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paid.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  opacity: 0.7,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {inv.description}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    Pago · {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ok)' }}>
                  {fmt(inv.amount)}
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
                  Pago
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPending && !data?.length && (
        <div style={{ color: 'var(--ink-3)', fontSize: 14 }}>Nenhuma fatura encontrada.</div>
      )}

      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
