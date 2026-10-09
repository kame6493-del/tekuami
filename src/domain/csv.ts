import { isDayKey } from './dates';
import type { Days } from './steps';

export interface CsvResult {
  days: Days;
  /** 読めた日数 */
  count: number;
  /** 読めなかった理由(読めたときは null) */
  error: string | null;
}

/** 1行を区切る。"..." の中の区切りは区切らない */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === sep && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const DATE_HEADS = ['date', '日付', 'day', '日時', 'start time', 'starttime', '開始時刻'];
const STEP_HEADS = ['step count', 'steps', 'step_count', '歩数', 'count', 'stepcount'];

function findCol(heads: string[], names: string[]): number {
  const h = heads.map((s) => s.toLowerCase().replace(/^﻿/, '').trim());
  for (const n of names) {
    const i = h.indexOf(n);
    if (i >= 0) return i;
  }
  for (const n of names) {
    const i = h.findIndex((x) => x.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

function toKey(s: string): string | null {
  const m = s.match(/(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
  if (!m) return null;
  const key = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return isDayKey(key) ? key : null;
}

/**
 * ほかの記録アプリから書き出した日ごとの歩数を読む。
 * 見出しの行に「日付(Date)」と「歩数(Step count / steps)」の列があれば読める。
 * 同じ日が何行もある時(時間ごとの記録など)は足す。
 */
export function parseStepsCsv(text: string): CsvResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return { days: {}, count: 0, error: '中身が空でした' };
  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const heads = splitLine(lines[0], sep);
  const di = findCol(heads, DATE_HEADS);
  const si = findCol(heads, STEP_HEADS);
  if (di < 0 || si < 0) return { days: {}, count: 0, error: '日付と歩数の列が見つかりませんでした' };
  const days: Days = {};
  for (const line of lines.slice(1)) {
    const cols = splitLine(line, sep);
    const key = toKey(cols[di] ?? '');
    const v = Number((cols[si] ?? '').replace(/[,\s]/g, ''));
    if (!key || !Number.isFinite(v) || v < 0 || v > 200000) continue;
    days[key] = Math.round((days[key] ?? 0) + v);
  }
  for (const k of Object.keys(days)) if (days[k] > 200000) days[k] = 200000;
  const count = Object.keys(days).length;
  return { days, count, error: count ? null : '読める行がありませんでした' };
}
