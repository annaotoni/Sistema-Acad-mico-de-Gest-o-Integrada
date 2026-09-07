import { useFeatures } from '../hooks';

interface Props {
  active: string;
  onSelect: (key: string) => void;
}

export function TabBar({ active, onSelect }: Props) {
  const { data } = useFeatures();
  const tabs = data?.tabs ?? [];

  return (
    <nav
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'flex-end',
        paddingLeft: 32,
        overflowX: 'auto',
        gap: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            className="s-tab"
            onClick={() => onSelect(tab.key)}
            style={{
              color: isActive ? 'var(--lilac)' : 'var(--ink-2)',
              fontWeight: isActive ? 700 : 500,
              borderBottom: isActive ? '2px solid var(--lilac)' : '2px solid transparent',
              paddingBottom: 12,
            }}
          >
            {tab.name}
          </button>
        );
      })}
    </nav>
  );
}
