/** 端末の時刻で日付の鍵を作る(YYYY-MM-DD)。歩数は「その人の1日」で数えるので UTC にしない */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** a から b まで何日(b - a)。時差・夏時間の影響を受けないよう日付だけで数える */
export function daysBetween(a: string, b: string): number {
  const da = parseDayKey(a);
  const db = parseDayKey(b);
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) - Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
}

export function isDayKey(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDayKey(s);
  return dayKey(d) === s;
}

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

export function weekdayJa(key: string): string {
  return WEEK[parseDayKey(key).getDay()];
}

/** 10月9日(木) */
export function labelJa(key: string): string {
  const d = parseDayKey(key);
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`;
}

/** 10/9 */
export function shortJa(key: string): string {
  const d = parseDayKey(key);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function timeJa(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString('ja-JP');
