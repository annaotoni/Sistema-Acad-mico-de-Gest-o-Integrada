import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import './sagi.css';
import { TopBar } from './shell/top-bar';
import { TabBar } from './shell/tab-bar';
import { ChatBot } from './shell/chat-bot';
import { Inicio } from './screens/inicio';
import { Turmas } from './screens/turmas';
import { Atividades } from './screens/atividades';
import { Notas } from './screens/notas';
import { AoVivo } from './screens/ao-vivo';
import { Financeiro } from './screens/financeiro';
import { Documentos } from './screens/documentos';
import { Protocolos } from './screens/protocolos';
import { Parametrizacao } from './screens/parametrizacao';

const SCREENS: Record<string, React.ComponentType> = {
  inicio: Inicio,
  turmas: Turmas,
  atividades: Atividades,
  notas: Notas,
  'ao-vivo': AoVivo,
  financeiro: Financeiro,
  documentos: Documentos,
  protocolos: Protocolos,
  parametrizacao: Parametrizacao,
};

interface Props {
  onLogout: () => void;
}

export function SagiApp({ onLogout }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState('inicio');
  const [chatOpen, setChatOpen] = useState(false);

  const Screen = SCREENS[activeTab] ?? Inicio;

  return (
    <div
      className="sagi"
      data-theme={theme}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <TopBar
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        onLogout={onLogout}
      />
      <TabBar active={activeTab} onSelect={setActiveTab} />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Screen />
      </main>

      {/* Chat FAB */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 150,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'var(--lilac)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
          ...(chatOpen ? { opacity: 0, pointerEvents: 'none' } : {}),
        }}
        title="Assistente SAGI"
      >
        <MessageCircle size={22} color="var(--on-lilac)" />
      </button>

      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
    </div>
  );
}
