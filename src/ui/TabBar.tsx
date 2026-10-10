import { Ref } from './parts';

export type Tab = 'home' | 'box' | 'zukan' | 'bag' | 'settings';

/** 下のタブ5つ(見本B: ホーム/箱/図鑑/毛糸ぶくろ/設定)。アイコンは見本B から切り出し */
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'ホーム', icon: 'b_tab_home' },
  { id: 'box', label: '箱', icon: 'b_tab_box' },
  { id: 'zukan', label: '図鑑', icon: 'b_tab_zukan' },
  { id: 'bag', label: '毛糸ぶくろ', icon: 'b_tab_bag' },
  { id: 'settings', label: '設定', icon: 'b_tab_settings' },
];

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
