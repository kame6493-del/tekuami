import { describe, expect, it } from 'vitest';
import { ITEMS, itemOf, stitchColumns } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { advance, canUseItem, finish, newProject, nextPattern, progressOf, rowLengths, stepsFor, stitchesFor, stitchOrder, targetSteps, totalStitchesOf, type Project } from './knit';

const base = (over: Partial<Project> = {}): Project => ({
  ...newProject({ item: 'muffler', palette: 'akane', pattern: 'heart', startTotal: 1000, today: '2026-10-09' }),
  ...over,
});

describe('編み目の数', () => {
  it('マフラーは 12目×36段 = 432目', () => {
    expect(totalStitchesOf(itemOf('muffler'))).toBe(432);
    expect(rowLengths(itemOf('muffler')).every((n) => n === 12)).toBe(true);
  });
  it('どの物も、どの段にも1目以上ある', () => {
    for (const it of ITEMS) {
      rowLengths(it).forEach((n, r) => expect(n, `${it.id} 段${r}`).toBeGreaterThan(0));
    }
  });
  it('形の行はすべて同じ幅', () => {
    for (const it of ITEMS) for (const row of it.rows) expect(row.length, it.id).toBe(it.rows[0].length);
  });
  it('仕上がりの歩数で全部の目が編める・0歩なら0目', () => {
    for (const it of ITEMS) {
      expect(stitchesFor(it, targetSteps(it, 500))).toBe(totalStitchesOf(it));
      expect(stitchesFor(it, 0)).toBe(0);
      expect(stepsFor(it, totalStitchesOf(it))).toBe(targetSteps(it, 500));
    }
  });
  it('stepsFor と stitchesFor は行き来できる', () => {
    const it = itemOf('hat');
    for (let n = 0; n <= totalStitchesOf(it); n += 7) expect(stitchesFor(it, stepsFor(it, n))).toBe(n);
  });
});

describe('進み具合', () => {
  it('始めた時点の累計より前の歩数は数えない', () => {
    const pr = progressOf(base(), 500);
    expect(pr.steps).toBe(0);
    expect(pr.rowsDone).toBe(0);
    expect(pr.toFinish).toBe(18000);
  });
  it('1段(500歩)で1段目が編み上がる', () => {
    const pr = progressOf(base(), 1000 + 500);
    expect(pr.rowsDone).toBe(1);
    expect(pr.inRow).toBe(0);
    expect(pr.toNextRow).toBe(500);
  });
  it('次の段までの残りは、段の途中で減っていく', () => {
    const pr = progressOf(base(), 1000 + 750);
    expect(pr.rowsDone).toBe(1);
    expect(pr.inRow).toBe(6);
    expect(pr.toNextRow).toBe(250);
  });
  it('仕上がりの歩数を超えても止まる', () => {
    const pr = progressOf(base(), 1000 + 99999);
    expect(pr.done).toBe(true);
    expect(pr.steps).toBe(18000);
    expect(pr.toFinish).toBe(0);
    expect(pr.toNextRow).toBe(0);
  });
  it('後から歩数が減っても、編んだ段は戻らない', () => {
    let p = advance(base(), 1000 + 6000);
    expect(p.best).toBe(6000);
    p = advance(p, 1000 + 2000);
    expect(p.best).toBe(6000);
    expect(progressOf(p, 1000 + 2000).rowsDone).toBe(12);
  });
  it('advance は変わらないとき同じ物を返す', () => {
    const p = advance(base(), 1200);
    expect(advance(p, 1200)).toBe(p);
  });
});

describe('仕上げと持ち越し', () => {
  it('余った歩数は次の1枚に持ち越す', () => {
    const p = advance(base(), 1000 + 20000);
    const { done, nextStart } = finish(p, '2026-10-12');
    expect(done.finishedOn).toBe('2026-10-12');
    expect(nextStart).toBe(1000 + 18000);
    const next = newProject({ item: 'mitten', palette: 'kon', pattern: 'snow', startTotal: nextStart, today: '2026-10-12' });
    expect(progressOf(next, 1000 + 20000).steps).toBe(2000);
  });
});

describe('目を置く順番', () => {
  it('偶数段は左から、奇数段は右から', () => {
    const m = itemOf('muffler');
    expect(stitchOrder(m, 0)[0]).toBe(0);
    expect(stitchOrder(m, 1)[0]).toBe(11);
  });
  it('ミトンの親指の段は、すき間の列を飛ばす', () => {
    const it = itemOf('mitten');
    const r = it.rows.length - 1 - 8; // 上から9行目(親指とのすき間)
    expect(stitchColumns(it, r)).not.toContain(2);
  });
});

describe('模様の順番', () => {
  it('無料では無料の模様だけを、使った回数の少ない順に出す', () => {
    const hist: Project[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const pat = nextPattern(hist, false);
      expect(pat.pro).toBe(false);
      seen.add(pat.id);
      hist.push(base({ pattern: pat.id }));
    }
    expect(seen.size).toBe(PATTERNS.filter((p) => !p.pro).length);
  });
  it('直前と同じ模様は続けない', () => {
    const hist = [base({ pattern: 'heart' })];
    expect(nextPattern(hist, false).id).not.toBe('heart');
  });
  it('毛糸ぶくろがあれば選んだ模様、無ければ選べない', () => {
    expect(nextPattern([], true, 'dog').id).toBe('dog');
    expect(nextPattern([], false, 'dog').id).not.toBe('dog');
  });
  it('毛糸ぶくろの物は買うまで使えない', () => {
    expect(canUseItem('sweater', false)).toBe(false);
    expect(canUseItem('sweater', true)).toBe(true);
    expect(canUseItem('muffler', false)).toBe(true);
    expect(canUseItem('sock', false)).toBe(false);
    expect(canUseItem('hat', false)).toBe(true);
    expect(canUseItem('blanket', false)).toBe(false);
    expect(canUseItem('nothing', true)).toBe(false);
  });
});

describe('1段の歩数', () => {
  it('どの段も同じ歩数。帽子のてっぺんの短い段も500歩で1段', () => {
    const hat = itemOf('hat');
    const p = newProject({ item: 'hat', palette: 'mori', pattern: 'star', startTotal: 0, today: '2026-10-10' });
    expect(progressOf(p, 0).target).toBe(targetSteps(hat, 500));
    expect(targetSteps(hat, 500)).toBe(rowLengths(hat).length * 500);
    // 最後の段(てっぺん)の手前まで
    const last = rowLengths(hat).length - 1;
    const pr = progressOf(p, last * 500 + 250);
    expect(pr.rowsDone).toBe(last);
    expect(pr.toNextRow).toBe(250);
    expect(pr.inRow).toBe(Math.floor(rowLengths(hat)[last] / 2));
  });
  it('設定で 300歩 にした物は 300歩 で1段進む', () => {
    const p = newProject({ item: 'muffler', palette: 'ichigo', pattern: 'heart', startTotal: 0, today: '2026-10-10', rowSteps: 300 });
    const pr = progressOf(p, 650);
    expect(pr.rowsDone).toBe(2);
    expect(pr.toNextRow).toBe(250);
    expect(pr.target).toBe(36 * 300);
  });
  it('仕上げの持ち越しも1段の歩数で数える', () => {
    const p = advance(newProject({ item: 'mitten', palette: 'ichigo', pattern: 'snow', startTotal: 100, today: '2026-10-10', rowSteps: 800 }), 100 + 99999);
    const { nextStart } = finish(p, '2026-10-11');
    expect(nextStart).toBe(100 + rowLengths(itemOf('mitten')).length * 800);
  });
  it('段の途中の目は、歩数に合わせて1目ずつ増える', () => {
    const p = newProject({ item: 'muffler', palette: 'ichigo', pattern: 'heart', startTotal: 0, today: '2026-10-10' });
    let prev = -1;
    for (let st = 0; st <= 500; st += 10) {
      const n = progressOf(p, st).stitches;
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(progressOf(p, 499).stitches).toBe(11);
    expect(progressOf(p, 500).stitches).toBe(12);
  });
});
