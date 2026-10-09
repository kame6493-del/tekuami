import { heightOf, itemOf, ITEMS, stitchColumns, type ItemDef } from '../art/items';
import { PATTERNS, type Pattern } from '../art/motifs';

/** 編みかけ・編み上がった1枚 */
export interface Project {
  id: string;
  item: string;
  palette: string;
  pattern: string;
  /** 編みはじめた時点の「入れてからの累計歩数」。ここから先の歩数で編む */
  startTotal: number;
  startedOn: string;
  /** これまでに届いた一番多い歩数。後から歩数が減っても編んだ段は戻さない */
  best: number;
  finishedOn?: string;
}

export interface Progress {
  steps: number;
  target: number;
  stitches: number;
  totalStitches: number;
  rowsDone: number;
  rowsTotal: number;
  /** 編んでいる段で、もう編んだ目の数 */
  inRow: number;
  rowLen: number;
  /** 次の段まで・仕上がりまでの残り歩数 */
  toNextRow: number;
  toFinish: number;
  done: boolean;
}

const stitchCache = new Map<string, number[]>();
/** 段ごとの目の数(下から) */
export function rowLengths(item: ItemDef): number[] {
  let v = stitchCache.get(item.id);
  if (!v) {
    v = Array.from({ length: heightOf(item) }, (_, r) => stitchColumns(item, r).length);
    stitchCache.set(item.id, v);
  }
  return v;
}

export function totalStitchesOf(item: ItemDef): number {
  return rowLengths(item).reduce((a, b) => a + b, 0);
}

/** 1目あたりの歩数 */
export function stepsPerStitch(item: ItemDef): number {
  return item.steps / totalStitchesOf(item);
}

/** steps 歩で何目まで編めるか */
export function stitchesFor(item: ItemDef, steps: number): number {
  const total = totalStitchesOf(item);
  if (steps >= item.steps) return total;
  return Math.min(total, Math.floor((steps + 1e-9) / stepsPerStitch(item)));
}

/** n 目編むのに要る歩数 */
export function stepsFor(item: ItemDef, n: number): number {
  const total = totalStitchesOf(item);
  if (n >= total) return item.steps;
  return Math.ceil(n * stepsPerStitch(item) - 1e-9);
}

export function rawSteps(p: Project, cumulative: number): number {
  return Math.max(0, cumulative - p.startTotal);
}

export function progressOf(p: Project, cumulative: number): Progress {
  const item = itemOf(p.item);
  const steps = Math.min(item.steps, Math.max(p.best, rawSteps(p, cumulative)));
  const lens = rowLengths(item);
  const totalStitches = totalStitchesOf(item);
  const stitches = stitchesFor(item, steps);
  let left = stitches;
  let rowsDone = 0;
  while (rowsDone < lens.length && left >= lens[rowsDone]) {
    left -= lens[rowsDone];
    rowsDone++;
  }
  const done = stitches >= totalStitches;
  const rowLen = done ? 0 : lens[rowsDone];
  const doneThroughRow = stitches - left + rowLen;
  return {
    steps,
    target: item.steps,
    stitches,
    totalStitches,
    rowsDone,
    rowsTotal: lens.length,
    inRow: done ? 0 : left,
    rowLen,
    toNextRow: done ? 0 : Math.max(0, stepsFor(item, doneThroughRow) - steps),
    toFinish: Math.max(0, item.steps - steps),
    done,
  };
}

/** 新しい歩数を受けて best を更新した Project を返す(変わらなければ同じ物) */
export function advance(p: Project, cumulative: number): Project {
  const item = itemOf(p.item);
  const best = Math.min(item.steps, Math.max(p.best, rawSteps(p, cumulative)));
  return best === p.best ? p : { ...p, best };
}

/** 段 r で編み目を置く順番。偶数段は左から、奇数段は右から(平編みで行き来するのと同じ) */
export function stitchOrder(item: ItemDef, r: number): number[] {
  const cols = stitchColumns(item, r);
  return r % 2 === 0 ? cols : [...cols].reverse();
}

/** 編み上がった物を閉じて、余りの歩数を持ち越した次の始まりを返す */
export function finish(p: Project, today: string): { done: Project; nextStart: number } {
  const item = itemOf(p.item);
  return { done: { ...p, best: item.steps, finishedOn: today }, nextStart: p.startTotal + item.steps };
}

/**
 * 次の模様。選べる人が選んだらそれ。選ばないときは、使える模様の中で使った回数の少ない物を順に。
 * 直前と同じ模様は避ける。
 */
export function nextPattern(history: readonly Project[], pro: boolean, chosen?: string): Pattern {
  const usable = PATTERNS.filter((p) => pro || !p.pro);
  if (chosen) {
    const c = usable.find((p) => p.id === chosen);
    if (c) return c;
  }
  const count = new Map<string, number>();
  for (const h of history) count.set(h.pattern, (count.get(h.pattern) ?? 0) + 1);
  const last = history.length ? history[history.length - 1].pattern : undefined;
  const pool = usable.length > 1 ? usable.filter((p) => p.id !== last) : usable;
  let best = pool[0];
  for (const p of pool) if ((count.get(p.id) ?? 0) < (count.get(best.id) ?? 0)) best = p;
  return best;
}

export function canUseItem(id: string, pro: boolean): boolean {
  const it = ITEMS.find((i) => i.id === id);
  return !!it && (pro || !it.pro);
}

let seq = 0;
export function newProject(args: { item: string; palette: string; pattern: string; startTotal: number; today: string }): Project {
  seq = (seq + 1) % 1000;
  return {
    id: `${args.today}-${Date.now().toString(36)}-${seq}`,
    item: args.item,
    palette: args.palette,
    pattern: args.pattern,
    startTotal: Math.max(0, Math.round(args.startTotal)),
    startedOn: args.today,
    best: 0,
  };
}
