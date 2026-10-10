import { ITEMS } from '../art/items';
import { PATTERN_ALIAS, PATTERNS } from '../art/motifs';
import { PALETTE_ALIAS, PALETTES } from '../art/yarns';
import { isDayKey } from './dates';
import { DEFAULT_ROW_STEPS, ROW_STEPS_CHOICES, type Project } from './knit';
import type { Days, SensorMark } from './steps';

export type Source = 'health' | 'sensor';

export interface AppData {
  v: 1;
  /** 入れた日。この日からの歩数で編む */
  installDate: string;
  onboarded: boolean;
  /** 歩数の読み取り元。まだ決めていなければ null */
  source: Source | null;
  /** 権限を一度でも聞いたか(断られたのか、まだ聞いていないのかを分ける) */
  asked: boolean;
  days: Days;
  imported: Days;
  lastReadAt: number | null;
  sensor: SensorMark | null;
  current: Project | null;
  /** 編み上げて次をまだ選んでいない間の、次の始まり(余りの歩数を持ち越す) */
  carry: number | null;
  done: Project[];
  /** 最後に画面で見せた目の数(開いたときに、その続きから編み目を足して見せる) */
  seen: number;
  /** 1段の歩数の設定(次に編みはじめる物から使う) */
  rowSteps: number;
  /** 編んでいる間に選んでおいた、次に編むもの */
  queued: Queued | null;
  /** 見た目のテーマ */
  theme: Theme;
}

export type Theme = 'hidamari' | 'yoru' | 'yuki';
export const THEMES: readonly { id: Theme; name: string; sub: string }[] = [
  { id: 'hidamari', name: 'ひだまり', sub: '(デフォルト)夜は窓の外が暗くなります' },
  { id: 'yoru', name: 'よる', sub: 'いつも夜の窓辺' },
  { id: 'yuki', name: 'ゆき', sub: '雪のふる白い窓辺' },
];

export interface Queued {
  item: string;
  palette: string;
  pattern?: string;
}

const rowStepsOf = (v: unknown) => (typeof v === 'number' && (ROW_STEPS_CHOICES as readonly number[]).includes(v) ? v : DEFAULT_ROW_STEPS);

export function emptyData(today: string): AppData {
  return {
    v: 1,
    installDate: today,
    onboarded: false,
    source: null,
    asked: false,
    days: {},
    imported: {},
    lastReadAt: null,
    sensor: null,
    current: null,
    carry: null,
    done: [],
    seen: 0,
    rowSteps: DEFAULT_ROW_STEPS,
    queued: null,
    theme: 'hidamari',
  };
}

function cleanDays(x: unknown): Days {
  const out: Days = {};
  if (!x || typeof x !== 'object') return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (isDayKey(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
  }
  return out;
}

function cleanProject(x: unknown): Project | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Record<string, unknown>;
  if (typeof p.id !== 'string') return null;
  const item = ITEMS.some((i) => i.id === p.item) ? (p.item as string) : null;
  const pal0 = typeof p.palette === 'string' ? (PALETTE_ALIAS[p.palette] ?? p.palette) : '';
  const pat0 = typeof p.pattern === 'string' ? (PATTERN_ALIAS[p.pattern] ?? p.pattern) : '';
  const palette = PALETTES.some((i) => i.id === pal0) ? pal0 : PALETTES[0].id;
  const pattern = PATTERNS.some((i) => i.id === pat0) ? pat0 : PATTERNS[0].id;
  if (!item) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return {
    id: p.id,
    item,
    palette,
    pattern,
    startTotal: num(p.startTotal),
    startedOn: isDayKey(p.startedOn) ? p.startedOn : '2026-01-01',
    best: num(p.best),
    rowSteps: rowStepsOf(p.rowSteps),
    ...(isDayKey(p.finishedOn) ? { finishedOn: p.finishedOn } : {}),
  };
}

/** 保存から読んだ物を、壊れていても使える形に直す */
export function normalize(raw: unknown, today: string): AppData {
  const base = emptyData(today);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const sensor = r.sensor && typeof r.sensor === 'object' ? (r.sensor as Record<string, unknown>) : null;
  return {
    v: 1,
    installDate: isDayKey(r.installDate) ? r.installDate : today,
    onboarded: r.onboarded === true,
    source: r.source === 'health' || r.source === 'sensor' ? r.source : null,
    asked: r.asked === true,
    days: cleanDays(r.days),
    imported: cleanDays(r.imported),
    lastReadAt: typeof r.lastReadAt === 'number' ? r.lastReadAt : null,
    sensor:
      sensor && typeof sensor.counter === 'number' && typeof sensor.at === 'number' && typeof sensor.bootAt === 'number'
        ? { counter: sensor.counter, at: sensor.at, bootAt: sensor.bootAt }
        : null,
    current: cleanProject(r.current),
    carry: typeof r.carry === 'number' && Number.isFinite(r.carry) && r.carry >= 0 ? Math.round(r.carry) : null,
    seen: typeof r.seen === 'number' && Number.isFinite(r.seen) && r.seen >= 0 ? Math.round(r.seen) : 0,
    done: Array.isArray(r.done) ? r.done.map(cleanProject).filter((p): p is Project => !!p) : [],
    rowSteps: rowStepsOf(r.rowSteps),
    queued: cleanQueued(r.queued),
    theme: r.theme === 'yoru' || r.theme === 'yuki' ? r.theme : 'hidamari',
  };
}

function cleanQueued(x: unknown): Queued | null {
  if (!x || typeof x !== 'object') return null;
  const q = x as Record<string, unknown>;
  const pal = typeof q.palette === 'string' ? (PALETTE_ALIAS[q.palette] ?? q.palette) : '';
  if (!ITEMS.some((i) => i.id === q.item) || !PALETTES.some((i) => i.id === pal)) return null;
  return { item: q.item as string, palette: pal, ...(PATTERNS.some((i) => i.id === q.pattern) ? { pattern: q.pattern as string } : {}) };
}
