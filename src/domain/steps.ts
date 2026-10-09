import { addDays, dayKey, daysBetween } from './dates';

export type Days = Record<string, number>;

/** 入れた日から今日までの累計。編み物に使うのはこの数(読み込んだ昔の記録は入れない) */
export function cumulativeSince(days: Days, installDate: string, today: string): number {
  let sum = 0;
  for (const [k, v] of Object.entries(days)) {
    if (k >= installDate && k <= today && Number.isFinite(v)) sum += Math.max(0, v);
  }
  return Math.round(sum);
}

/**
 * 読み取った日ごとの歩数を記録に重ねる。読み取った日は読み取った値で置き換える
 * (ヘルスケアは時計の同期などで後から増えるので、大きい方ではなく最新の値を正とする)。
 */
export function mergeDays(prev: Days, fresh: Days): Days {
  const out: Days = { ...prev };
  for (const [k, v] of Object.entries(fresh)) {
    if (Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
  }
  return out;
}

/** センサーの記録の足し算(同じ日は足す) */
export function addDaysTo(prev: Days, add: Days): Days {
  const out: Days = { ...prev };
  for (const [k, v] of Object.entries(add)) {
    if (Number.isFinite(v) && v > 0) out[k] = Math.round((out[k] ?? 0) + v);
  }
  return out;
}

export interface DayRow {
  key: string;
  steps: number;
  imported: boolean;
}

/** today から遡って n 日分(古い順) */
export function lastNDays(days: Days, imported: Days, today: string, n: number): DayRow[] {
  const out: DayRow[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    const live = days[key];
    const imp = imported[key];
    out.push({ key, steps: live ?? imp ?? 0, imported: live === undefined && imp !== undefined });
  }
  return out;
}

/** 記録のある日を新しい順に(読み込んだ分も含む) */
export function historyRows(days: Days, imported: Days): DayRow[] {
  const keys = new Set([...Object.keys(days), ...Object.keys(imported)]);
  return [...keys]
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({ key, steps: days[key] ?? imported[key] ?? 0, imported: days[key] === undefined }));
}

export interface Summary {
  week: number;
  weekAvg: number;
  month: number;
  best: { key: string; steps: number } | null;
  all: number;
}

export function summarize(days: Days, imported: Days, today: string): Summary {
  const week = lastNDays(days, imported, today, 7);
  const weekSum = week.reduce((a, d) => a + d.steps, 0);
  const monthPrefix = today.slice(0, 7);
  let month = 0;
  let all = 0;
  let best: Summary['best'] = null;
  for (const row of historyRows(days, imported)) {
    all += row.steps;
    if (row.key.startsWith(monthPrefix) && row.key <= today) month += row.steps;
    if (!best || row.steps > best.steps) best = { key: row.key, steps: row.steps };
  }
  return { week: weekSum, weekAvg: Math.round(weekSum / 7), month, best: best && best.steps > 0 ? best : null, all };
}

/**
 * 歩数センサー(電源を入れてからの累計)の読み取りを、前回からの差に直して日ごとに割り振る。
 * - 再起動で数が戻ったら、起動からの分をそのまま差とする
 * - 前回から日をまたいだら、経った時間の割合で日ごとに分ける(アプリを開いていない間の内訳は分からないため)
 */
export interface SensorMark {
  counter: number;
  at: number;
  bootAt: number;
}

export function sensorDelta(prev: SensorMark | null, now: SensorMark): Days {
  if (!prev) return {};
  const rebooted = now.counter < prev.counter || Math.abs(now.bootAt - prev.bootAt) > 120000;
  const from = rebooted ? Math.max(prev.at, now.bootAt) : prev.at;
  const delta = rebooted ? now.counter : now.counter - prev.counter;
  if (delta <= 0 || now.at <= from) return delta > 0 ? { [dayKey(new Date(now.at))]: delta } : {};
  return splitByDay(delta, from, now.at);
}

export function splitByDay(total: number, fromMs: number, toMs: number): Days {
  const out: Days = {};
  const span = toMs - fromMs;
  const startKey = dayKey(new Date(fromMs));
  const endKey = dayKey(new Date(toMs));
  const n = daysBetween(startKey, endKey);
  if (n <= 0 || span <= 0) return { [endKey]: total };
  let given = 0;
  for (let i = 0; i <= n; i++) {
    const key = addDays(startKey, i);
    const [y, m, d] = key.split('-').map(Number);
    const dayStart = Math.max(fromMs, new Date(y, m - 1, d).getTime());
    const dayEnd = Math.min(toMs, new Date(y, m - 1, d + 1).getTime());
    if (i === n) {
      out[key] = total - given;
    } else {
      const part = Math.round((total * Math.max(0, dayEnd - dayStart)) / span);
      out[key] = part;
      given += part;
    }
  }
  for (const k of Object.keys(out)) if (out[k] <= 0) delete out[k];
  return out;
}
