import { describe, expect, it } from 'vitest';
import { composeStitches } from '../art/compose';
import { ITEMS, heightOf, widthOf } from '../art/items';
import { MOTIFS, PATTERNS, patternOf } from '../art/motifs';
import { STITCH, BALL, POMPOM, FRINGE } from '../art/sprites';
import { PALETTES, YARNS } from '../art/yarns';
import { parseStepsCsv } from './csv';
import { emptyData, normalize } from './data';

describe('CSV の読み込み', () => {
  it('英語の見出し(日ごとの書き出し)', () => {
    const csv = 'Date,Move Minutes count,Calories (kcal),Distance (m),Step count\n2024-01-01,30,1800,4000,5321\n2024-01-02,10,1700,1000,1200\n';
    const r = parseStepsCsv(csv);
    expect(r.error).toBeNull();
    expect(r.days).toEqual({ '2024-01-01': 5321, '2024-01-02': 1200 });
  });
  it('日本語の見出し・引用符・カンマ入りの数', () => {
    const csv = '﻿"日付","歩数"\n"2024/3/5","6,500"\n"2024/3/6","700"';
    expect(parseStepsCsv(csv).days).toEqual({ '2024-03-05': 6500, '2024-03-06': 700 });
  });
  it('同じ日が何行もあれば足す(時間ごとの記録)', () => {
    const csv = 'start time,steps\n2024-05-01 09:00,100\n2024-05-01 10:00,250\n';
    expect(parseStepsCsv(csv).days).toEqual({ '2024-05-01': 350 });
  });
  it('列が無い・空・壊れた行', () => {
    expect(parseStepsCsv('a,b\n1,2').error).toBe('日付と歩数の列が見つかりませんでした');
    expect(parseStepsCsv('').error).toBe('中身が空でした');
    const r = parseStepsCsv('date,steps\nxxx,100\n2024-13-01,5\n2024-01-01,-3\n2024-01-02,abc');
    expect(r.error).toBe('読める行がありませんでした');
  });
  it('タブ区切り', () => {
    expect(parseStepsCsv('Date\tSteps\n2024-01-01\t42').days).toEqual({ '2024-01-01': 42 });
  });
});

describe('保存の読み直し', () => {
  it('壊れた物・空でも使える形に戻す', () => {
    expect(normalize(null, '2026-10-09')).toEqual(emptyData('2026-10-09'));
    expect(normalize('xx', '2026-10-09').installDate).toBe('2026-10-09');
  });
  it('おかしな値を捨てる', () => {
    const d = normalize(
      {
        installDate: '2026-10-01',
        onboarded: true,
        days: { '2026-10-01': 100, bad: 5, '2026-10-02': -1, '2026-10-03': 'x' },
        current: { id: 'a', item: 'muffler', palette: 'nope', pattern: 'heart', startTotal: 10, startedOn: '2026-10-01', best: 20 },
        done: [{ id: 'b', item: 'unknown' }, { id: 'c', item: 'hat', palette: 'kon', pattern: 'snow', startTotal: 0, startedOn: '2026-10-01', best: 16000, finishedOn: '2026-10-03' }],
        carry: -3,
        seen: 12,
      },
      '2026-10-09',
    );
    expect(d.days).toEqual({ '2026-10-01': 100 });
    expect(d.current?.palette).toBe(PALETTES[0].id);
    expect(d.done.map((p) => p.id)).toEqual(['c']);
    expect(d.carry).toBeNull();
    expect(d.seen).toBe(12);
    expect(d.onboarded).toBe(true);
  });
});

describe('絵の決まり', () => {
  it('部品の絵は、どの行も同じ幅で、使う文字が決まっている', () => {
    for (const [name, rows] of Object.entries({ STITCH, BALL, POMPOM, FRINGE })) {
      for (const r of rows) {
        expect(r.length, name).toBe(rows[0].length);
        expect(/^[.0-3]+$/.test(r), `${name}: ${r}`).toBe(true);
      }
    }
  });
  it('模様の図案も同じ幅で、. o * だけ', () => {
    for (const [name, rows] of Object.entries(MOTIFS)) {
      for (const r of rows) {
        expect(r.length, name).toBe(rows[0].length);
        expect(/^[.o*]+$/.test(r), `${name}: ${r}`).toBe(true);
      }
    }
  });
  it('毛糸の色は4段の濃さがすべて色の書式', () => {
    for (const [name, sh] of Object.entries(YARNS)) {
      expect(sh.length, name).toBe(4);
      for (const c of sh) expect(/^#[0-9a-f]{6}$/.test(c), `${name} ${c}`).toBe(true);
    }
  });
  it('どの組み合わせでも、形どおりの所にだけ目がある', () => {
    for (const it of ITEMS) {
      for (const pal of PALETTES) {
        for (const pat of [...PATTERNS, patternOf('plain')]) {
          const g = composeStitches(it, pal, pat);
          expect(g.length).toBe(heightOf(it));
          for (let r = 0; r < g.length; r++) {
            const shape = it.rows[it.rows.length - 1 - r];
            expect(g[r].length).toBe(widthOf(it));
            for (let c = 0; c < g[r].length; c++) expect(g[r][c] === null, `${it.id} ${r},${c}`).toBe(shape[c] === '.');
          }
        }
      }
    }
  });
  it('模様は、毛糸ぶくろの物と無料の物が半々', () => {
    expect(PATTERNS.filter((p) => p.pro).length).toBe(6);
    expect(PALETTES.filter((p) => !p.pro).length).toBe(4);
  });
});
