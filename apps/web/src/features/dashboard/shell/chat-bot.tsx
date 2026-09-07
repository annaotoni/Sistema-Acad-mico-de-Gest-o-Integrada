import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader } from 'lucide-react';
import { dashApi } from '../api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onClose: () => void;
}

export function ChatBot({ onClose }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o assistente do SAGI. Posso consultar suas notas, faturas, atividades e muito mais. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await dashApi.chat(text, convId);
      setConvId(res.conversationId);
      setMsgs((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        width: 380,
        height: 520,
        borderRadius: 16,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--lilac)',
        }}
      >
        <Bot size={18} color="#fff" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#fff', flex: 1 }}>
          Assistente SAGI
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'var(--lilac)' : 'var(--surface-2)',
                color: m.role === 'user' ? 'var(--on-lilac)' : 'var(--ink)',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-3)',
              fontSize: 12,
            }}
          >
            <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Digitando...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pergunte algo..."
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
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'var(--lilac)',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--on-lilac)',
            display: 'flex',
            alignItems: 'center',
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
