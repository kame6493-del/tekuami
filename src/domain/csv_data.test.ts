import { describe, expect, it } from 'vitest';
import { composeStitches } from '../art/compose';
import { ITEMS, heightOf, widthOf } from '../art/items';
import { MOTIFS, PATTERNS, patternOf } from '../art/motifs';
import { PALETTES, YARNS, mix, shadesOf } from '../art/yarns';
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
    expect(d.rowSteps).toBe(500);
    expect(d.current?.rowSteps).toBe(500);
    expect(d.queued).toBeNull();
  });
});

describe('絵の決まり', () => {
  it('色を混ぜる計算', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#d97b80', '#d97b80', 0.3)).toBe('#d97b80');
    const sh = shadesOf('#d97b80');
    expect(sh[2]).toBe('#d97b80');
  });
  it('模様の図案も同じ幅で、. o * # だけ', () => {
    for (const [name, rows] of Object.entries(MOTIFS)) {
      for (const r of rows) {
        expect(r.length, name).toBe(rows[0].length);
        expect(/^[.o*#]+$/.test(r), `${name}: ${r}`).toBe(true);
      }
    }
  });
  it('大きい模様はマフラーの幅(12目)に収まる', () => {
    for (const pt of PATTERNS) expect(MOTIFS[pt.big][0].length, pt.id).toBeLessThanOrEqual(12);
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
  it('見本どおり: 模様12種(無料6)、毛糸の色16組(無料8)、名前と並びも見本の通り', () => {
    expect(PATTERNS.map((p) => p.name)).toEqual(['ハート', '雪の結晶', 'ノルディック', '木の実', 'ねこ', 'やま', '星', 'ツリー', 'いぬ', '北欧風', 'うさぎ', 'お花']);
    expect(PATTERNS.filter((p) => !p.pro).length).toBe(6);
    expect(PALETTES.filter((p) => !p.pro).map((p) => p.name)).toEqual(['ミルク', 'いちご', 'もり', 'そら', 'ゆき', 'ラベンダー', 'こむぎ', 'すみ']);
    expect(PALETTES.filter((p) => p.pro).map((p) => p.name)).toEqual(['さくらもち', 'ねこやなぎ', 'マスタード', 'あかずきん', 'よもぎ', 'あおうみ', 'くり', 'よぞら']);
  });
  it('編むもの: 無料はマフラー・ニット帽・ミトン、毛糸ぶくろで くつした・セーター・ひざかけ', () => {
    expect(ITEMS.filter((i) => !i.pro).map((i) => i.id)).toEqual(['muffler', 'hat', 'mitten']);
    for (const it of ITEMS) {
      expect(it.size.length, it.id).toBeGreaterThan(0);
      expect(it.note.length, it.id).toBeGreaterThan(0);
    }
  });
  it('どの模様の図案も、マフラーの幅に収まり、模様の色が入っている', () => {
    for (const pt of PATTERNS) {
      const m = MOTIFS[pt.big];
      expect(m.some((r) => r.includes('o')), pt.id).toBe(true);
    }
  });
});

describe('1段の歩数と予約の保存', () => {
  it('選べる値だけを残す', () => {
    expect(normalize({ rowSteps: 300 }, '2026-10-10').rowSteps).toBe(300);
    expect(normalize({ rowSteps: 7 }, '2026-10-10').rowSteps).toBe(500);
  });
  it('次に編むものの予約は、ある物・ある色だけ', () => {
    expect(normalize({ queued: { item: 'hat', palette: 'mori', pattern: 'star' } }, '2026-10-10').queued).toEqual({ item: 'hat', palette: 'mori', pattern: 'star' });
    expect(normalize({ queued: { item: 'hat', palette: 'nope' } }, '2026-10-10').queued).toBeNull();
    expect(normalize({ queued: { item: 'hat', palette: 'mori', pattern: 'xx' } }, '2026-10-10').queued).toEqual({ item: 'hat', palette: 'mori' });
  });
});

describe('1.1.0 までの記録の読み直し', () => {
  it('なくなった色・模様は、近い物に読み替える', () => {
    const d = normalize(
      {
        current: { id: 'a', item: 'muffler', palette: 'cafe', pattern: 'leaf', startTotal: 0, startedOn: '2026-10-01', best: 0 },
        done: [{ id: 'b', item: 'hat', palette: 'ringo', pattern: 'heart', startTotal: 0, startedOn: '2026-10-01', best: 1, finishedOn: '2026-10-02' }],
        queued: { item: 'hat', palette: 'mimoza' },
      },
      '2026-10-10',
    );
    expect(d.current?.palette).toBe('komugi');
    expect(d.current?.pattern).toBe('tree');
    expect(d.done[0].palette).toBe('akazukin');
    expect(d.queued?.palette).toBe('mustard');
  });
  it('見た目のテーマは3つだけ。ほかはひだまり', () => {
    expect(normalize({ theme: 'yoru' }, '2026-10-10').theme).toBe('yoru');
    expect(normalize({ theme: 'yuki' }, '2026-10-10').theme).toBe('yuki');
    expect(normalize({ theme: 'dark' }, '2026-10-10').theme).toBe('hidamari');
    expect(normalize(null, '2026-10-10').theme).toBe('hidamari');
  });
});
