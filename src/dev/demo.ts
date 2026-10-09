import { addDays } from '../domain/dates';
import { emptyData, type AppData } from '../domain/data';
import type { Project } from '../domain/knit';
import { cumulativeSince, type Days } from '../domain/steps';

/**
 * ブラウザで画面を確かめるための作り物(端末のアプリでは使わない)。
 * ?demo=ready|denied|notinstalled|nodata|unsupported  歩数の読み取りの状態
 * ?today=6240  今日の歩数
 * ?seed=mid|done|box  途中まで進んだ記録で始める(画面写真用)
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
  return { id, item, palette, pattern, startTotal, startedOn, best, ...(finishedOn ? { finishedOn } : {}) };
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
  if (seed === 'mid') d.current = project('m1', 'muffler', 'akane', 'heart', cum - 11240, addDays(today, -2), 11240);
  if (seed === 'done') d.current = project('m1', 'muffler', 'kon', 'snow', cum - 18000, addDays(today, -3), 18000);
  if (seed === 'box' || seed === 'boxpro') {
    d.installDate = addDays(today, -26);
    d.done = [
      project('b1', 'muffler', 'akane', 'heart', 0, addDays(today, -26), 18000, addDays(today, -23)),
      project('b2', 'mitten', 'momi', 'tree', 18000, addDays(today, -23), 12000, addDays(today, -21)),
      project('b3', 'hat', 'karashi', 'snow', 30000, addDays(today, -21), 16000, addDays(today, -19)),
      project('b4', 'muffler', 'kon', 'zigzag', 46000, addDays(today, -19), 18000, addDays(today, -16)),
      project('b5', 'sock', 'aotake', 'check', 64000, addDays(today, -16), 14000, addDays(today, -14)),
      project('b6', 'sweater', 'kuro', 'diamond', 78000, addDays(today, -14), 30000, addDays(today, -9)),
      project('b7', 'hat', 'moku', 'cat', 108000, addDays(today, -9), 16000, addDays(today, -7)),
    ];
    const cum2 = cumulativeSince(d.days, d.installDate, today);
    d.current = project('c1', 'blanket', 'sora', 'star', cum2 - 21300, addDays(today, -6), 21300);
  }
  return d;
}
