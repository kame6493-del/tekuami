import { describe, expect, it } from 'vitest';
import { monthGrid } from './Calendar';
import { isDayEnd, isNightScene } from './Home';

describe('昼と夜の情景', () => {
  it('ひだまり・ゆき は 18時〜6時が夜、よる はいつも夜', () => {
    expect(isNightScene('hidamari', 10)).toBe(false);
    expect(isNightScene('hidamari', 18)).toBe(true);
    expect(isNightScene('hidamari', 5)).toBe(true);
    expect(isNightScene('yuki', 12)).toBe(false);
    expect(isNightScene('yuki', 22)).toBe(true);
    expect(isNightScene('yoru', 10)).toBe(true);
  });
  it('1日の終わりの表示は 20時〜5時', () => {
    expect(isDayEnd(19)).toBe(false);
    expect(isDayEnd(20)).toBe(true);
    expect(isDayEnd(2)).toBe(true);
    expect(isDayEnd(5)).toBe(false);
  });
});

describe('月のカレンダー', () => {
  it('2026年10月は木曜はじまり・31日・5週', () => {
    const g = monthGrid(2026, 9);
    expect(g.length).toBe(5);
    expect(g[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(g[0][4]).toBe('2026-10-01');
    expect(g.flat().filter(Boolean).length).toBe(31);
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
  it('2026年2月は28日', () => {
    expect(monthGrid(2026, 1).flat().filter(Boolean).length).toBe(28);
  });
});
