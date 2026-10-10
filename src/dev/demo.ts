import { addDays } from '../domain/dates';
import { emptyData, type AppData } from '../domain/data';
import { itemOf } from '../art/items';
import { stitchesFor, type Project } from '../domain/knit';
import { cumulativeSince, type Days } from '../domain/steps';

/**
 * ブラウザで画面を確かめるための作り物(端末のアプリでは使わない)。
 * ?demo=ready|denied|notinstalled|nodata|unsupported  歩数の読み取りの状態
 * ?today=6240  今日の歩数
 * ?seed=mid|row|done|box|boxpro|fresh  途中まで進んだ記録で始める(画面写真用)。row は開くと1段編み上がる
 */
function param(name: string): string | null {
  try {
    const v = new URLSearchParams(location.search).get(name);
    if (v !== null) sessionStorage.setItem(`tekuami.${name}`, v);
    return v ?? sessionStorage.getItem(`tekuami.${name}`);
  } catch {
    return null;
  }
}

export function demoMode(): string {
  return param('demo') ?? 'ready';
}

const PATTERN = [7120, 8340, 5210, 9870, 6630, 4120, 10450, 3890, 7760, 8020, 6310, 5540, 11230, 6980];

export function demoDays(today: string): Days {
  if (demoMode() === 'nodata') {
    const out: Days = {};
    for (let i = 0; i < 30; i++) out[addDays(today, -i)] = 0;
    return out;
  }
  const out: Days = {};
  for (let i = 1; i < 30; i++) out[addDays(today, -i)] = PATTERN[i % PATTERN.length];
  out[today] = Number(param('today') ?? 6240);
  return out;
}

function project(id: string, item: string, palette: string, pattern: string, startTotal: number, startedOn: string, best: number, finishedOn?: string): Project {
  return { id, item, palette, pattern, startTotal, startedOn, best, rowSteps: 500, ...(finishedOn ? { finishedOn } : {}) };
}

export function seedData(today: string): AppData | null {
  const seed = param('seed');
  if (!seed) return null;
  const d = emptyData(addDays(today, -3));
  d.onboarded = true;
  d.asked = true;
  d.source = 'health';
  d.days = demoDays(today);
  d.lastReadAt = Date.now();
  const cum = cumulativeSince(d.days, d.installDate, today);
  const seen = (p: Project, extra = 0) => stitchesFor(itemOf(p.item), p.best, p.rowSteps) - extra;
  if (seed === 'mid') {
    d.current = project('m1', 'muffler', 'ichigo', 'heart', cum - 1680, addDays(today, -1), 1680);
    d.seen = seen(d.current);
  }
  if (seed === 'show') {
    d.current = project('m1', 'muffler', 'ichigo', 'heart', cum - 7180, addDays(today, -2), 7180);
    d.seen = seen(d.current);
  }
  if (seed === 'row') {
    d.current = project('m1', 'muffler', 'ichigo', 'heart', cum - 2000, addDays(today, -1), 2000);
    d.seen = seen(d.current, 3);
  }
  if (seed === 'done') d.current = project('m1', 'muffler', 'ichigo', 'heart', cum - 18000, addDays(today, -7), 18000);
  if (seed === 'box' || seed === 'boxpro') {
    d.installDate = addDays(today, -26);
    d.done = [
      project('b1', 'muffler', 'ichigo', 'heart', 0, addDays(today, -26), 18000, addDays(today, -23)),
      project('b2', 'muffler', 'sora', 'snow', 18000, addDays(today, -23), 18000, addDays(today, -20)),
      project('b3', 'hat', 'mori', 'star', 36000, addDays(today, -20), 10000, addDays(today, -18)),
      project('b4', 'mitten', 'ichigo', 'snow', 46000, addDays(today, -18), 9500, addDays(today, -16)),
      project('b5', 'sock', 'sora', 'heart', 55500, addDays(today, -16), 11500, addDays(today, -14)),
      project('b6', 'blanket', 'sora', 'nordic', 67000, addDays(today, -14), 14000, addDays(today, -9)),
    ];
    const cum2 = cumulativeSince(d.days, d.installDate, today);
    d.current = project('c1', 'hat', 'lavender', 'star', cum2 - 4300, addDays(today, -2), 4300);
    d.seen = seen(d.current);
  }
  return d;
}
