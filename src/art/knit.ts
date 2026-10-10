/**
 * 編み目の絵。表編みの1目を「左右2本の脚がV字に合わさった形」で、脚1本ずつ陰影と撚りの線をつけて描く。
 * 1目の絵は色ごとにいくつかの揺らぎ(大きさ・傾き・明るさ)を作って取っておき、並べて編み地にする。
 * 座標の単位は canvas の画素(端末の画素)。s は1目の幅。
 */
import { composeStitches, type Stitch } from './compose';
import { heightOf, itemOf, widthOf, type ItemDef } from './items';
import { patternOf } from './motifs';
import { mix, paletteOf, WOOD, YARNS, type Shades, type YarnId } from './yarns';

type Ctx = CanvasRenderingContext2D;

/** 段の高さ / 目の幅 */
export const PITCH = 0.74;

/** 決まった種から作る乱数(同じ目はいつも同じ揺らぎ) */
export function rand(seed: number): () => number {
  let t = seed >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** 脚1本(米粒のような、ふっくらした形)の輪郭 */
function legPath(ctx: Ctx, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * 1.32, -ry * 0.72, rx * 1.32, ry * 0.62, 0, ry);
  ctx.bezierCurveTo(-rx * 1.32, ry * 0.62, -rx * 1.32, -ry * 0.72, 0, -ry);
  ctx.closePath();
}

function drawLeg(ctx: Ctx, sh: Shades, cx: number, cy: number, rx: number, ry: number, rot: number, r: () => number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  legPath(ctx, rx, ry);
  // 横の丸み: 光は左上から
  const g = ctx.createLinearGradient(-rx * 1.1, 0, rx * 1.1, 0);
  g.addColorStop(0, mix(sh[1], sh[2], 0.3));
  g.addColorStop(0.25, sh[2]);
  g.addColorStop(0.45, mix(sh[2], sh[3], 0.75));
  g.addColorStop(0.7, sh[2]);
  g.addColorStop(1, sh[1]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 縦: 両端は下の目・上の目にくぐるので暗く
  const v = ctx.createLinearGradient(0, -ry, 0, ry);
  v.addColorStop(0, hexA(sh[0], 0.45));
  v.addColorStop(0.28, hexA(sh[0], 0));
  v.addColorStop(0.7, hexA(sh[0], 0));
  v.addColorStop(1, hexA(sh[0], 0.5));
  ctx.fillStyle = v;
  ctx.fillRect(-rx * 2, -ry, rx * 4, ry * 2);
  // 撚りの線(斜めの細い筋)
  const n = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = -ry + ((i + 0.5 + (r() - 0.5) * 0.4) / n) * ry * 2;
    ctx.strokeStyle = hexA(sh[1], 0.22);
    ctx.lineWidth = Math.max(0.8, rx * 0.34);
    ctx.beginPath();
    ctx.moveTo(-rx * 1.2, y + rx * 0.8);
    ctx.quadraticCurveTo(0, y + rx * 0.15, rx * 1.2, y - rx * 0.6);
    ctx.stroke();
    ctx.strokeStyle = hexA(sh[3], 0.14);
    ctx.lineWidth = Math.max(0.6, rx * 0.22);
    ctx.beginPath();
    ctx.moveTo(-rx * 1.2, y + rx * 0.8 - rx * 0.42);
    ctx.quadraticCurveTo(0, y + rx * 0.15 - rx * 0.42, rx * 1.2, y - rx * 0.6 - rx * 0.42);
    ctx.stroke();
  }
  ctx.restore();
  // 輪郭をうっすら
  legPath(ctx, rx, ry);
  ctx.strokeStyle = hexA(sh[0], 0.18);
  ctx.lineWidth = Math.max(0.5, rx * 0.1);
  ctx.stroke();
  // 毛羽(ふわっとした産毛)
  ctx.strokeStyle = hexA(sh[3], 0.35);
  ctx.lineWidth = Math.max(0.4, rx * 0.05);
  for (let i = 0; i < 12; i++) {
    const t = r() * Math.PI * 2;
    const ex = Math.cos(t) * rx * 1.0;
    const ey = Math.sin(t) * ry * 0.9;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + Math.cos(t + (r() - 0.5)) * rx * 0.45, ey + Math.sin(t + (r() - 0.5)) * rx * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

function hexA(c: string, a: number): string {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const VARIANTS = 4;
const cache = new Map<string, HTMLCanvasElement>();

/** 1目の絵。画像の (ox, oy) が目の枠の左上 */
export function stitchSprite(color: string, s: number, variant: number, sunk: boolean): { img: HTMLCanvasElement; ox: number; oy: number } {
  const p = s * PITCH;
  const ox = Math.ceil(s * 0.18);
  const oy = Math.ceil(p * 0.55);
  const key = `${color}|${s.toFixed(2)}|${variant}|${sunk ? 1 : 0}`;
  let img = cache.get(key);
  if (!img) {
    if (cache.size > 600) cache.clear();
    img = makeCanvas(s + ox * 2, p + oy * 2);
    const ctx = img.getContext('2d')!;
    const r = rand(variant * 7919 + Math.round(s * 13) + color.charCodeAt(2) * 31);
    const base = sunk ? mix(color, '#2a1810', 0.22) : color;
    const k = 1 + (r() - 0.5) * 0.06;
    const sh: Shades = [mix(base, '#2a1810', 0.62), mix(base, '#3a2418', 0.3), mix(base, r() > 0.5 ? '#ffffff' : '#000000', r() * 0.04), mix(base, '#fffaf2', 0.5)];
    const rx = s * 0.228 * k * (sunk ? 0.85 : 1);
    const ry = p * 0.92 * k;
    const tilt = 0.44 + (r() - 0.5) * 0.08;
    const cy = oy + p * 0.5;
    drawLeg(ctx, sh, ox + s * 0.27, cy, rx, ry, -tilt, r);
    drawLeg(ctx, sh, ox + s * 0.73, cy, rx, ry, tilt, r);
    cache.set(key, img);
  }
  return { img, ox, oy };
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

/** 段 r で目を置く順番。偶数段は左から、奇数段は右から(平編みで行き来するのと同じ) */
export function orderOf(item: ItemDef, r: number): number[] {
  const cols: number[] = [];
  const row = item.rows[item.rows.length - 1 - r];
  for (let c = 0; c < row.length; c++) if (row[c] !== '.') cols.push(c);
  return r % 2 === 0 ? cols : cols.reverse();
}

/** どの目が編めているか(stitchesDone 目まで) */
function doneMask(piece: Piece, stitchesDone: number): boolean[][] {
  const H = heightOf(piece.item);
  const W = widthOf(piece.item);
  const out = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  let left = stitchesDone;
  for (let r = 0; r < H && left > 0; r++) {
    for (const c of orderOf(piece.item, r)) {
      if (left <= 0) break;
      out[r][c] = true;
      left--;
    }
  }
  return out;
}

export interface FabricOpts {
  /** 編み地の左上(一番上の段の上端) */
  x: number;
  y: number;
  /** 1目の幅(画素) */
  s: number;
  stitchesDone?: number;
  /** 房・ぼんぼん */
  decor?: boolean;
  /** 下に落ちる影 */
  shadow?: boolean;
  /** いちばん新しい目を少しふくらませて見せる(0〜1) */
  pop?: number;
}

/** 編み地を描く。r は下から数えた段 */
export function drawFabric(ctx: Ctx, piece: Piece, o: FabricOpts) {
  const { item, stitches } = piece;
  const H = heightOf(item);
  const W = widthOf(item);
  const s = o.s;
  const p = s * PITCH;
  const mask = doneMask(piece, o.stitchesDone ?? Number.MAX_SAFE_INTEGER);
  const top = (r: number) => o.y + (H - 1 - r) * p;

  // 影: 編めた所の形を、ぼかした影として先に置く
  if (o.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,22,10,0.38)';
    ctx.shadowBlur = s * 0.9;
    // 形は画面の外に置き、影だけを戻す(形そのものは見せない)
    const far = 100000;
    ctx.shadowOffsetX = s * 0.12 + far;
    ctx.shadowOffsetY = s * 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (mask[r][c] && stitches[r][c]) ctx.rect(o.x + c * s - far, top(r) - p * 0.1, s, p * 1.2);
    ctx.fill();
    ctx.restore();
  }

  // 目と目の間の奥(暗い溝)
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const st = stitches[r][c];
      if (!st || !mask[r][c]) continue;
      ctx.fillStyle = mix(YARNS[st.yarn][0], YARNS[st.yarn][1], 0.35);
      const below = r > 0 && mask[r - 1][c] && stitches[r - 1][c];
      const above = r < H - 1 && mask[r + 1][c] && stitches[r + 1][c];
      const y0 = above ? top(r) - p * 0.1 : top(r) + p * 0.3;
      ctx.fillRect(o.x + c * s + s * 0.04, y0, s * 0.92, (below ? p * 1.02 : p * 0.82) + (top(r) - y0));
    }
  }

  // 目: 下の段から。上の段の脚が下の段の目の頭にかぶさる
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const st = stitches[r][c];
      if (!st || !mask[r][c]) continue;
      const v = (r * 31 + c * 17 + ((r * c) % 5)) % VARIANTS;
      const sp = stitchSprite(YARNS[st.yarn][2], s, v, st.sunk);
      ctx.drawImage(sp.img, Math.round(o.x + c * s - sp.ox), Math.round(top(r) - sp.oy));
    }
  }

  if (o.decor) {
    if (item.decor === 'fringe') {
      drawFringeRow(ctx, piece, 0, o.x, top(0) + p * 0.95, s, 1);
      drawFringeRow(ctx, piece, H - 1, o.x, top(H - 1) + p * 0.05, s, -1);
    }
    if (item.decor === 'pompom') {
      drawPompom(ctx, o.x + (W * s) / 2, top(H - 1) - s * 0.9, s * 2.3, YARNS[piece.accent], 11);
    }
  }
}

/** 房。dir=1 で下へ、-1 で上へ垂らす */
export function drawFringeRow(ctx: Ctx, piece: Piece, row: number, x: number, y: number, s: number, dir: 1 | -1) {
  const cols = piece.stitches[row];
  const r = rand(row * 97 + 13);
  for (let c = 0; c < cols.length; c++) {
    const st = cols[c];
    if (!st) continue;
    const sh = YARNS[st.yarn];
    for (const off of [0.32, 0.68]) {
      const x0 = x + c * s + s * off;
      const len = s * (1.45 + r() * 0.25);
      const sway = (r() - 0.5) * s * 0.35;
      const x1 = x0 + sway;
      const y1 = y + dir * len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = sh[1];
      ctx.lineWidth = s * 0.2;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo(x0 + sway * 0.2, y + dir * len * 0.55, x1, y1);
      ctx.stroke();
      ctx.strokeStyle = sh[2];
      ctx.lineWidth = s * 0.14;
      ctx.stroke();
      ctx.strokeStyle = hexA(sh[3], 0.7);
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(x0 - s * 0.03, y);
      ctx.quadraticCurveTo(x0 + sway * 0.2 - s * 0.03, y + dir * len * 0.55, x1 - s * 0.03, y1 - dir * s * 0.05);
      ctx.stroke();
      // 撚り
      ctx.strokeStyle = hexA(sh[0], 0.35);
      ctx.lineWidth = Math.max(0.5, s * 0.025);
      for (let k = 1; k < 7; k++) {
        const t = k / 7;
        const px = x0 + (x1 - x0) * t * t;
        const py = y + dir * len * t;
        ctx.beginPath();
        ctx.moveTo(px - s * 0.07, py - dir * s * 0.03);
        ctx.lineTo(px + s * 0.07, py + dir * s * 0.03);
        ctx.stroke();
      }
    }
    // 結び目
    ctx.fillStyle = sh[1];
    ctx.beginPath();
    ctx.ellipse(x + c * s + s * 0.5, y + dir * s * 0.06, s * 0.24, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = hexA(sh[3], 0.5);
    ctx.beginPath();
    ctx.ellipse(x + c * s + s * 0.44, y + dir * s * 0.03, s * 0.12, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** ぼんぼん: 短い毛を放射状にたくさん */
export function drawPompom(ctx: Ctx, cx: number, cy: number, R: number, sh: Shades, seed: number) {
  const r = rand(seed);
  const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, sh[3]);
  g.addColorStop(0.55, sh[2]);
  g.addColorStop(1, sh[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.86, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.85;
    const px = cx + Math.cos(a) * d;
    const py = cy + Math.sin(a) * d;
    const len = R * (0.12 + r() * 0.16);
    const lit = (Math.cos(a) * -0.6 + Math.sin(a) * -0.8) * (d / R);
    ctx.strokeStyle = lit > 0.25 ? hexA(sh[3], 0.8) : lit < -0.35 ? hexA(sh[0], 0.55) : hexA(r() > 0.5 ? sh[2] : sh[1], 0.75);
    ctx.lineWidth = Math.max(0.6, R * 0.035);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a + (r() - 0.5)) * len, py + Math.sin(a + (r() - 0.5)) * len);
    ctx.stroke();
  }
}

/** 横に渡した木の編み針。左に丸い頭、右は細く尖る */
export function drawNeedle(ctx: Ctx, x0: number, x1: number, y: number, t: number) {
  const g = ctx.createLinearGradient(0, y - t / 2, 0, y + t / 2);
  g.addColorStop(0, WOOD[3]);
  g.addColorStop(0.45, WOOD[2]);
  g.addColorStop(1, WOOD[0]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0 + t, y - t / 2);
  ctx.lineTo(x1 - t * 2.4, y - t / 2);
  ctx.quadraticCurveTo(x1 - t * 0.6, y - t * 0.2, x1, y);
  ctx.quadraticCurveTo(x1 - t * 0.6, y + t * 0.2, x1 - t * 2.4, y + t / 2);
  ctx.lineTo(x0 + t, y + t / 2);
  ctx.closePath();
  ctx.fill();
  // 木目
  ctx.strokeStyle = 'rgba(110,70,30,0.25)';
  ctx.lineWidth = Math.max(0.5, t * 0.06);
  ctx.beginPath();
  ctx.moveTo(x0 + t * 2, y + t * 0.1);
  ctx.lineTo(x1 - t * 3, y + t * 0.05);
  ctx.stroke();
  // 頭の玉
  const kg = ctx.createRadialGradient(x0 + t * 0.6, y - t * 0.45, t * 0.1, x0 + t, y, t * 1.15);
  kg.addColorStop(0, WOOD[3]);
  kg.addColorStop(0.5, WOOD[2]);
  kg.addColorStop(1, WOOD[0]);
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.ellipse(x0 + t, y, t * 1.05, t * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 針に掛かった目(輪)。いちばん上の段の目の頭が針をくるむ */
/** drop: 輪を下へ伸ばす長さ(まだ編んでいない目は、1段下の目から針まで伸びている) */
export function drawLoops(ctx: Ctx, piece: Piece, row: number, mask: (c: number) => boolean, x: number, y: number, s: number, t: number, drop = 0) {
  const cols = piece.stitches[row];
  if (!cols) return;
  for (let c = 0; c < cols.length; c++) {
    const st = cols[c];
    if (!st || !mask(c)) continue;
    const sh = YARNS[st.yarn];
    const cx = x + c * s + s * 0.5;
    // 針をくるむ輪: 針の前を縦に通る太い糸の帯(丸みの陰影つき)。輪と輪の間から針が見える
    const bw = s * 0.56;
    const top = y - t * 1.35;
    const hgt = t * 2.9 + drop;
    const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
    g.addColorStop(0, sh[1]);
    g.addColorStop(0.32, sh[3]);
    g.addColorStop(0.62, sh[2]);
    g.addColorStop(1, mix(sh[1], sh[0], 0.3));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, top, bw, hgt, bw / 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 上の端は奥へ回り込むので暗く
    const v = ctx.createLinearGradient(0, top, 0, top + hgt);
    v.addColorStop(0, hexA(sh[0], 0.45));
    v.addColorStop(0.3, hexA(sh[0], 0));
    v.addColorStop(1, hexA(sh[0], 0.1));
    ctx.fillStyle = v;
    ctx.fillRect(cx - bw, top, bw * 2, hgt);
    ctx.strokeStyle = hexA(sh[1], 0.3);
    ctx.lineWidth = Math.max(0.8, bw * 0.14);
    for (let k = 0; k < 3; k++) {
      const yy = top + hgt * (0.25 + k * 0.28);
      ctx.beginPath();
      ctx.moveTo(cx - bw, yy + bw * 0.5);
      ctx.lineTo(cx + bw, yy - bw * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/** 編み地の大きさ(画素) */
export function fabricSize(item: ItemDef, s: number) {
  return { w: widthOf(item) * s, h: heightOf(item) * s * PITCH };
}

/** 房・ぼんぼんがはみ出す分(画素) */
export function decorPad(item: ItemDef, s: number) {
  return {
    top: item.decor === 'pompom' ? s * 3.3 : item.decor === 'fringe' ? s * 1.8 : s * 0.3,
    bottom: item.decor === 'fringe' ? s * 1.9 : s * 0.4,
  };
}

/** 2つ組で見せる物(ミトン・くつした) */
export const isPair = (item: ItemDef) => item.id === 'mitten' || item.id === 'sock';

/** 仕上がりを w×h の枠の真ん中に、入る一番大きい大きさで描く。返り値は1目の幅 */
export function drawFinishedFit(ctx: Ctx, piece: Piece, w: number, h: number, opts: { shadow?: boolean; maxS?: number } = {}): number {
  const W = widthOf(piece.item);
  const H = heightOf(piece.item);
  const pair = isPair(piece.item);
  const spread = pair ? 2.08 : 1;
  const padK = decorPad(piece.item, 1);
  const s = Math.min(opts.maxS ?? 1e9, w / (W * spread + 0.6), h / (H * PITCH + padK.top + padK.bottom + (pair ? 1.2 : 0) + 0.6));
  const fw = W * s * spread;
  const fh = H * PITCH * s;
  const pad = decorPad(piece.item, s);
  const x = (w - fw) / 2;
  const y = (h - (fh + pad.top + pad.bottom + (pair ? s * 1.2 : 0))) / 2 + pad.top;
  if (pair) {
    // 右の1つは少し上に。ミトンは左を返して親指を内側に向ける。くつしたは同じ向きで並べる
    const one = W * s;
    drawFabric(ctx, piece, { x: x + fw - one, y, s, decor: true, shadow: opts.shadow });
    if (piece.item.id === 'mitten') {
      ctx.save();
      ctx.translate(x + one, y + s * 1.2);
      ctx.scale(-1, 1);
      drawFabric(ctx, piece, { x: 0, y: 0, s, decor: true, shadow: opts.shadow });
      ctx.restore();
    } else drawFabric(ctx, piece, { x, y: y + s * 1.2, s, decor: true, shadow: opts.shadow });
    return s;
  }
  drawFabric(ctx, piece, { x, y, s, decor: true, shadow: opts.shadow });
  return s;
}
