import { Ref } from './parts';

export type Tab = 'home' | 'box' | 'knit' | 'bag';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'ホーム', icon: 'tab_home' },
  { id: 'box', label: '箱', icon: 'tab_box' },
  { id: 'knit', label: 'あみもの', icon: 'tab_knit' },
  { id: 'bag', label: '毛糸ぶくろ', icon: 'tab_bag' },
];

/** 下のタブ4つ(見本どおり: ホーム/箱/あみもの/毛糸ぶくろ) */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="画面の切り替え">
      {TABS.map(({ id, label, icon }) => (
        <button key={id} className={`tab ${tab === id ? 'is-on' : ''}`} aria-current={tab === id ? 'page' : undefined} onClick={() => onChange(id)}>
          <Ref name={icon} className="tab-icon" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
