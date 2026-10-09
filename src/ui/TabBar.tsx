import { IconBox, IconKnit, IconLog } from './icons';

export type Tab = 'knit' | 'log' | 'box';

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'knit', label: '編む', icon: IconKnit },
  { id: 'log', label: '記録', icon: IconLog },
  { id: 'box', label: '箱', icon: IconBox },
];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="画面の切り替え">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={`tab ${tab === id ? 'is-on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
