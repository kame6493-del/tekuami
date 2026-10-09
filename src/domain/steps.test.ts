import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, dayKey, isDayKey, labelJa } from './dates';
import { addDaysTo, cumulativeSince, historyRows, lastNDays, mergeDays, sensorDelta, splitByDay, summarize } from './steps';

describe('日付', () => {
  it('月またぎ・年またぎ', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-09', '2026-10-12')).toBe(3);
  });
  it('おかしな日付は日付として扱わない', () => {
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('2026-10-09')).toBe(true);
    expect(isDayKey(20261009)).toBe(false);
  });
  it('日本語の表示', () => {
    expect(labelJa('2026-10-09')).toBe('10月9日(金)');
  });
});

describe('累計', () => {
  const days = { '2026-10-07': 5000, '2026-10-08': 7000, '2026-10-09': 3000 };
  it('入れた日からの分だけ数える', () => {
    expect(cumulativeSince(days, '2026-10-08', '2026-10-09')).toBe(10000);
  });
  it('今日より先の日は数えない', () => {
    expect(cumulativeSince({ ...days, '2026-10-10': 9999 }, '2026-10-01', '2026-10-09')).toBe(15000);
  });
  it('読み直した日は新しい値で置き換える(増えても減っても)', () => {
    const m = mergeDays(days, { '2026-10-09': 4200, '2026-10-08': 6900 });
    expect(m['2026-10-09']).toBe(4200);
    expect(m['2026-10-08']).toBe(6900);
    expect(m['2026-10-07']).toBe(5000);
  });
  it('おかしな値は混ぜない', () => {
    const m = mergeDays(days, { '2026-10-09': Number.NaN, '2026-10-08': -5 });
    expect(m).toEqual(days);
  });
  it('センサーの分は足す', () => {
    expect(addDaysTo({ '2026-10-09': 100 }, { '2026-10-09': 50, '2026-10-10': 0 })).toEqual({ '2026-10-09': 150 });
  });
});

describe('記録の画面', () => {
  const days = { '2026-10-03': 1000, '2026-10-09': 6000 };
  it('7日分を古い順に、無い日は0で', () => {
    const w = lastNDays(days, {}, '2026-10-09', 7);
    expect(w.map((d) => d.key)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
    expect(w[0].steps).toBe(1000);
    expect(w[1].steps).toBe(0);
  });
  it('読み込んだ記録は、その日の歩数が無いときだけ使い、印を付ける', () => {
    const rows = historyRows({ '2026-10-09': 6000 }, { '2026-10-09': 1, '2020-01-01': 8000 });
    expect(rows[0]).toEqual({ key: '2026-10-09', steps: 6000, imported: false });
    expect(rows[1]).toEqual({ key: '2020-01-01', steps: 8000, imported: true });
  });
  it('まとめ', () => {
    const s = summarize(days, {}, '2026-10-09');
    expect(s.week).toBe(7000);
    expect(s.weekAvg).toBe(1000);
    expect(s.month).toBe(7000);
    expect(s.best).toEqual({ key: '2026-10-09', steps: 6000 });
  });
  it('全部0なら一番の日は無し', () => {
    expect(summarize({ '2026-10-09': 0 }, {}, '2026-10-09').best).toBeNull();
  });
});

describe('歩数センサー', () => {
  const t = (d: string, h: number) => {
    const [y, m, dd] = d.split('-').map(Number);
    return new Date(y, m - 1, dd, h).getTime();
  };
  it('初めての読み取りは基準にするだけ', () => {
    expect(sensorDelta(null, { counter: 5000, at: t('2026-10-09', 12), bootAt: 0 })).toEqual({});
  });
  it('同じ日なら差をその日に', () => {
    const prev = { counter: 1000, at: t('2026-10-09', 9), bootAt: 100 };
    expect(sensorDelta(prev, { counter: 1800, at: t('2026-10-09', 12), bootAt: 100 })).toEqual({ '2026-10-09': 800 });
  });
  it('日をまたいだら、経った時間の割合で分ける', () => {
    const prev = { counter: 0, at: t('2026-10-09', 18), bootAt: 100 };
    const d = sensorDelta(prev, { counter: 1200, at: t('2026-10-10', 6), bootAt: 100 });
    expect(d['2026-10-09']).toBe(600);
    expect(d['2026-10-10']).toBe(600);
  });
  it('再起動で数が戻ったら、起動からの分を足す', () => {
    const prev = { counter: 9000, at: t('2026-10-09', 9), bootAt: 100 };
    const d = sensorDelta(prev, { counter: 300, at: t('2026-10-09', 12), bootAt: t('2026-10-09', 11) });
    expect(d).toEqual({ '2026-10-09': 300 });
  });
  it('分けた合計は元の数と同じ', () => {
    const d = splitByDay(1001, t('2026-10-07', 20), t('2026-10-10', 4));
    expect(Object.values(d).reduce((a, b) => a + b, 0)).toBe(1001);
    expect(Object.keys(d)).toEqual(['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']);
  });
  it('dayKey は端末の時刻で', () => {
    expect(dayKey(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
  });
});
