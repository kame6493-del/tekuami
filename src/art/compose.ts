import { heightOf, rowFromBottom, widthOf, type ItemDef } from './items';
import { MOTIFS, type Pattern } from './motifs';
import type { Palette, YarnId } from './yarns';

export interface Stitch {
  yarn: YarnId;
  /** ゴム編みの引っ込んだ列(少し暗く描く) */
  sunk: boolean;
}

/** 下の行から順に、どの段にどの模様を置くか。数字は段数 */
type Band = { kind: 'plain'; rows: number } | { kind: 'stripe'; rows: number } | { kind: 'big' } | { kind: 'band' };

const SEQUENCE: readonly Band[] = [
  { kind: 'plain', rows: 2 },
  { kind: 'band' },
  { kind: 'plain', rows: 2 },
  { kind: 'big' },
  { kind: 'plain', rows: 2 },
  { kind: 'stripe', rows: 1 },
  { kind: 'plain', rows: 1 },
];

type Role = 'main' | 'sub' | 'accent';
type Line = { motif: readonly string[]; line: number; whole: boolean };

/** 地の段(x)の段番号 → その段の模様の行(上から何行目か)と、どの模様か */
function bodyPlan(pattern: Pattern, bodyRows: number): (Line | Role)[] {
  const plan: (Line | Role)[] = [];
  if (pattern.id === 'plain') {
    for (let k = 0; k < bodyRows; k++) plan.push(k % 12 === 3 ? 'accent' : 'main');
    return plan;
  }
  let i = 0;
  while (plan.length < bodyRows) {
    const b = SEQUENCE[i % SEQUENCE.length];
    i++;
    if (b.kind === 'plain') for (let k = 0; k < b.rows; k++) plan.push('main');
    else if (b.kind === 'stripe') for (let k = 0; k < b.rows; k++) plan.push('accent');
    else {
      const big = b.kind === 'big';
      const m = MOTIFS[big ? pattern.big : pattern.band];
      // 模様は下の行から編むので、図案の一番下の行から積む。大きい模様は8目以上の物だけ欠けを避ける
      for (let k = m.length - 1; k >= 0; k--) plan.push({ motif: m, line: k, whole: big && m[0].length >= 6 });
    }
  }
  const out = plan.slice(0, bodyRows);
  // 仕上がりの端(上の2段)は地の色だけにする。小さい物で模様が途中で切れて帽子のふちのように見えるのを避ける
  for (let k = Math.max(0, bodyRows - 2); k < bodyRows; k++) out[k] = 'main';
  return out;
}

function roleOf(ch: string): Role {
  return ch === 'o' ? 'sub' : ch === '*' ? 'accent' : 'main';
}

/**
 * 模様を横に繰り返したとき、中央に揃うように始まりをずらす。
 * whole=true(大きい模様)は、端で欠ける繰り返しを描かない(-1 を返す)。
 */
export function motifColumn(c: number, width: number, motifWidth: number, whole = false): number {
  const k = Math.max(1, Math.floor((width + 1) / motifWidth));
  const used = k * motifWidth - 1;
  const off = Math.floor((width - used) / 2);
  if (whole && (c < off || c >= off + used)) return -1;
  return (((c - off) % motifWidth) + motifWidth) % motifWidth;
}

/**
 * 編み物全体の色の表。stitches[r][c](r は下から数えた段、c は左から)。編み目の無い所は null。
 */
export function composeStitches(item: ItemDef, palette: Palette, pattern: Pattern): (Stitch | null)[][] {
  const W = widthOf(item);
  const H = heightOf(item);
  const bodyRowIdx: number[] = [];
  for (let r = 0; r < H; r++) if (rowFromBottom(item, r).includes('x')) bodyRowIdx.push(r);
  const plan = bodyPlan(pattern, bodyRowIdx.length);
  const planOfRow = new Map<number, (typeof plan)[number]>();
  bodyRowIdx.forEach((r, i) => planOfRow.set(r, plan[i]));

  const yarnOf = (role: Role): YarnId => (role === 'main' ? palette.main : role === 'sub' ? palette.sub : palette.accent);
  const out: (Stitch | null)[][] = [];
  for (let r = 0; r < H; r++) {
    const row = rowFromBottom(item, r);
    const line: (Stitch | null)[] = [];
    for (let c = 0; c < W; c++) {
      const ch = row[c];
      if (ch === '.') line.push(null);
      else if (ch === 'r') line.push({ yarn: palette.main, sunk: c % 2 === 1 });
      else if (ch === 'h') line.push({ yarn: palette.accent, sunk: false });
      else {
        const p = planOfRow.get(r) ?? 'main';
        if (typeof p === 'string') line.push({ yarn: yarnOf(p), sunk: false });
        else {
          const mrow = p.motif[p.line];
          const [s0, s1] = p.whole && item.span ? item.span : [0, W];
          const mc = c < s0 || c >= s1 ? (p.whole ? -1 : motifColumn(c, W, mrow.length)) : motifColumn(c - s0, s1 - s0, mrow.length, p.whole);
          line.push({ yarn: yarnOf(mc < 0 ? 'main' : roleOf(mrow[mc])), sunk: false });
        }
      }
    }
    out.push(line);
  }
  return out;
}
