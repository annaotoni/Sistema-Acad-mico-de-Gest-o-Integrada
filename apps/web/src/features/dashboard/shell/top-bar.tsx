import { Bell, LogOut, Moon, Sun } from 'lucide-react';
import { useMe, useNotifCount, useMarkAllRead } from '../hooks';

const ROLE_LABEL: Record<string, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  SECRETARIA: 'Secretaria',
  ADMIN: 'Administrador',
};

function initials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

interface Props {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onLogout: () => void;
}

export function TopBar({ theme, onThemeToggle, onLogout }: Props) {
  const me = useMe();
  const countQ = useNotifCount();
  const markAll = useMarkAllRead();
  const count = countQ.data?.count ?? 0;

  return (
    <header
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        padding: '0 32px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--lilac)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--on-lilac)',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: '-0.5px',
            }}
          >
            S
          </span>
        </div>
        <span
          style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.4px' }}
        >
          SAGI
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme toggle */}
        <button
          className="s-topbar-btn"
          onClick={onThemeToggle}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 10px',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button
          className="s-notif-btn"
          onClick={() => count > 0 && markAll.mutate()}
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 10px',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            position: 'relative',
          }}
          title={
            count > 0
              ? `${count} não lidas — clique para marcar todas como lidas`
              : 'Sem notificações'
          }
        >
          <Bell size={16} />
          {count > 0 && (
            <span
              style={{
                background: 'var(--danger)',
                color: '#fff',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 5px',
                lineHeight: 1.4,
              }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {/* User info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 8,
            borderLeft: '1px solid var(--line)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: 'var(--lilac-soft)',
              border: '1.5px solid var(--lilac-line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--lilac)',
            }}
          >
            {me.data ? initials(me.data.email) : '…'}
          </div>
          {me.data && (
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {me.data.email.split('@')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                {ROLE_LABEL[me.data.role] ?? me.data.role}
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          className="s-topbar-btn"
          onClick={onLogout}
          title="Sair"
          style={{
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '6px 10px',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--ink-2)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
