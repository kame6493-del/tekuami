import { composeStitches, type Stitch } from './compose';
import { heightOf, itemOf, widthOf, type ItemDef } from './items';
import { patternOf } from './motifs';
import { BALL, BALL_SQUASH, FRINGE, NEEDLE_KNOB, POMPOM, STITCH, STITCH_H, STITCH_W } from './sprites';
import { paletteOf, WOOD, YARNS, type Shades, type YarnId } from './yarns';
import { stitchOrder } from '../domain/knit';

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** 文字列の絵を、濃さ→色で置く */
export function sprite(ctx: Ctx, rows: readonly string[], x: number, y: number, shades: Shades) {
  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '.') continue;
      px(ctx, x + c, y + r, shades[Number(ch)]);
    }
  }
}

const SUNK: Record<string, number> = { '0': 0, '1': 0, '2': 1, '3': 1 };

function drawStitch(ctx: Ctx, s: Stitch, x: number, y: number) {
  const shades = YARNS[s.yarn];
  for (let r = 0; r < STITCH_H; r++) {
    for (let c = 0; c < STITCH_W; c++) {
      const ch = STITCH[r][c];
      const i = s.sunk ? SUNK[ch] : Number(ch);
      px(ctx, x + c, y + r, shades[i]);
    }
  }
}

export interface Piece {
  item: ItemDef;
  stitches: (Stitch | null)[][];
  main: YarnId;
  sub: YarnId;
  accent: YarnId;
}

export function pieceOf(itemId: string, paletteId: string, patternId: string): Piece {
  const item = itemOf(itemId);
  const pal = paletteOf(paletteId);
  return { item, stitches: composeStitches(item, pal, patternOf(patternId)), main: pal.main, sub: pal.sub, accent: pal.accent };
}

/** 編み物の絵の大きさ(ドット) */
export function pieceSize(item: ItemDef) {
  return { w: widthOf(item) * STITCH_W, h: heightOf(item) * STITCH_H };
}

/** 飾りが上下にはみ出す分 */
export function decorPad(item: ItemDef) {
  return {
    top: item.decor === 'pompom' ? POMPOM.length - 3 : item.decor === 'fringe' ? FRINGE.length : 0,
    bottom: item.decor === 'fringe' ? FRINGE.length : 0,
  };
}

function drawFringe(ctx: Ctx, piece: Piece, row: number, x: number, y: number, flip: boolean) {
  const cols = piece.stitches[row];
  for (let c = 0; c < cols.length; c++) {
    const s = cols[c];
    if (!s) continue;
    const lines = flip ? [...FRINGE].reverse() : FRINGE;
    sprite(ctx, lines, x + c * STITCH_W, y, YARNS[s.yarn]);
  }
}

/**
 * 編み上がった姿(または途中まで)を描く。stitchesDone は編めた目の数。x,y は編み物の左上。
 * 編めていない目は描かない。
 */
export function drawPiece(ctx: Ctx, piece: Piece, x: number, y: number, stitchesDone: number, opts: { decor: boolean }) {
  const { item, stitches } = piece;
  const H = heightOf(item);
  let left = stitchesDone;
  for (let r = 0; r < H && left > 0; r++) {
    const order = stitchOrder(item, r);
    const top = y + (H - 1 - r) * STITCH_H;
    for (const c of order) {
      if (left <= 0) break;
      const s = stitches[r][c];
      if (s) drawStitch(ctx, s, x + c * STITCH_W, top);
      left--;
    }
  }
  if (!opts.decor) return;
  if (item.decor === 'fringe') {
    drawFringe(ctx, piece, 0, x, y + H * STITCH_H, false);
    drawFringe(ctx, piece, H - 1, x, y - FRINGE.length, true);
  }
  if (item.decor === 'pompom') {
    const w = widthOf(item) * STITCH_W;
    sprite(ctx, POMPOM, x + Math.floor((w - POMPOM[0].length) / 2), y - POMPOM.length + 3, YARNS[piece.accent]);
  }
}

/** 横に渡した編み針。左に頭、右は細く尖る */
function drawNeedle(ctx: Ctx, x0: number, x1: number, y: number) {
  for (let x = x0 + 3; x < x1 - 3; x++) {
    px(ctx, x, y, WOOD[3]);
    px(ctx, x, y + 1, WOOD[2]);
    px(ctx, x, y + 2, WOOD[1]);
  }
  px(ctx, x1 - 3, y, WOOD[3]);
  px(ctx, x1 - 3, y + 1, WOOD[2]);
  px(ctx, x1 - 2, y + 1, WOOD[2]);
  px(ctx, x1 - 1, y + 1, WOOD[1]);
  sprite(ctx, NEEDLE_KNOB, x0, y - 1, WOOD);
}

/** 斜めの針(手前の針)。右上へ上がる2マス幅の階段 */
function drawWorkingNeedle(ctx: Ctx, x: number, y: number, len: number) {
  for (let i = 0; i < len; i++) {
    const cx = x + i;
    const cy = y - Math.floor(i / 2);
    px(ctx, cx, cy, WOOD[3]);
    px(ctx, cx, cy + 1, WOOD[1]);
  }
  sprite(ctx, NEEDLE_KNOB, x + len - 2, y - Math.floor(len / 2) - 2, WOOD);
}

/** 毛糸玉から針先まで垂れる糸 */
function drawStrand(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
  const sag = Math.min(18, Math.abs(x1 - x0) / 3);
  let lx = -1;
  let ly = -1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t));
    if (x !== lx || y !== ly) px(ctx, x, y, color);
    lx = x;
    ly = y;
  }
}

export interface StageLayout {
  /** 論理ドットでの台の大きさ */
  w: number;
  h: number;
}

/**
 * 編んでいる途中の台。針が上にあり、編めた分が下に垂れる。古い段は下へ流れて見切れる。
 * frame は毛糸玉の弾み(0/1)。
 */
export function drawStage(ctx: Ctx, stage: StageLayout, piece: Piece, stitchesDone: number, rowsDone: number, frame: number) {
  const { item } = piece;
  const { w: pw } = pieceSize(item);
  const H = heightOf(item);
  const needleY = 14;
  const px0 = Math.floor((stage.w - pw) / 2) - 8;
  // 編んでいる段の上端を針のすぐ下に合わせる
  const current = Math.min(rowsDone, H - 1);
  const pieceTop = needleY + 3 - (H - 1 - current) * STITCH_H;
  // 針先の位置: いま編んでいる目のところ
  const order = stitchOrder(item, current);
  let inRow = stitchesDone;
  for (let r = 0; r < current; r++) inRow -= stitchOrder(item, r).length;
  const col = order[Math.min(Math.max(0, inRow), order.length - 1)] ?? 0;
  const tipX = px0 + col * STITCH_W + 4;

  // 毛糸玉は右下。糸は編み地の後ろを通って針先へ
  const ballRows = frame ? BALL_SQUASH : BALL;
  const bx = stage.w - BALL[0].length - 8;
  const by = stage.h - ballRows.length - 4;
  const yarn = piece.stitches[current]?.find((s) => s)?.yarn ?? piece.main;
  drawStrand(ctx, tipX, needleY + 6, bx + 6, by + 4, YARNS[yarn][1]);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, needleY + 2, stage.w, stage.h);
  ctx.clip();
  drawPiece(ctx, piece, px0, pieceTop, stitchesDone, { decor: false });
  // 作り目の端の房(マフラー)
  if (item.decor === 'fringe' && rowsDone > 0) drawFringe(ctx, piece, 0, px0, pieceTop + H * STITCH_H, false);
  ctx.restore();

  // 針は、いま編んでいる段の幅より少し長く
  drawNeedle(ctx, px0 - 12, px0 + pw + 14, needleY);

  drawWorkingNeedle(ctx, tipX - 2, needleY + 8, 26);
  sprite(ctx, ballRows, bx, by + (frame ? 1 : 0), YARNS[yarn]);
}

/** 仕上がった物を、台の真ん中に置く */
export function drawFinished(ctx: Ctx, w: number, h: number, piece: Piece) {
  const { w: pw, h: ph } = pieceSize(piece.item);
  const pad = decorPad(piece.item);
  const total = ph + pad.top + pad.bottom;
  const x = Math.floor((w - pw) / 2);
  const y = Math.floor((h - total) / 2) + pad.top;
  drawPiece(ctx, piece, x, y, Number.MAX_SAFE_INTEGER, { decor: true });
}

/** 仕上がりの絵が入る大きさ(ドット、飾り込み) */
export function finishedSize(item: ItemDef) {
  const { w, h } = pieceSize(item);
  const pad = decorPad(item);
  return { w, h: h + pad.top + pad.bottom };
}
