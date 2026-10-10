import { heightOf, itemOf, widthOf } from './items';
import { drawFabric, drawFinishedFit, drawLoops, drawNeedle, PITCH, pieceOf } from './knit';
import { patternOf } from './motifs';
import { ref } from './ref';
import { paletteOf } from './yarns';
import { dotJa } from '../domain/dates';
import type { Progress, Project } from '../domain/knit';

const FONT = "'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', sans-serif";

export function pieceTitle(p: Project): string {
  return `${paletteOf(p.palette).name}の${itemOf(p.item).name}`;
}

/** 作品の名前(見本C・D: 「ハートのマフラー」)。模様は編み上がってから分かる */
export function pieceName(p: Project): string {
  return `${patternOf(p.pattern).name}の${itemOf(p.item).name}`;
}

export type ShareStyle = 'polaroid' | 'chair' | 'snow';
export const SHARE_STYLES: readonly { id: ShareStyle; name: string }[] = [
  { id: 'polaroid', name: 'ポラロイド' },
  { id: 'chair', name: '椅子に掛けて' },
  { id: 'snow', name: '雪の上' },
];

function cover(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / im.width, h / im.height);
  ctx.drawImage(im, x + (w - im.width * k) / 2, y + (h - im.height * k) / 2, im.width * k, im.height * k);
}

/**
 * 棒に掛けて二つ折りにした姿(見本B の椅子の写真)。手前は作り目側(房が下)、奥は反対の端を少し右に。
 * x は手前の左端、barY は掛けた所の高さ。
 */
function drawHanging(ctx: CanvasRenderingContext2D, piece: ReturnType<typeof pieceOf>, x: number, barY: number, s: number) {
  const W = widthOf(piece.item);
  const H = heightOf(piece.item);
  const p = s * PITCH;
  const m = Math.ceil(H / 2);
  const fw = W * s;
  // 奥: 段 m..H-1(上の端が棒のところ)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + fw * 0.5 - s, barY - p * 0.2, fw + 2 * s, (H - m) * p + s * 2.5);
  ctx.clip();
  drawFabric(ctx, piece, { x: x + fw * 0.55, y: barY, s, shadow: true });
  ctx.fillStyle = 'rgba(40,20,10,0.22)';
  ctx.fillRect(x + fw * 0.55, barY, fw, (H - m) * p);
  ctx.restore();
  // 手前: 段 0..m-1(作り目の房が下)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - s, barY - p * 0.3, fw + 2 * s, m * p + s * 3);
  ctx.clip();
  drawFabric(ctx, piece, { x, y: barY - (H - m) * p, s, decor: true, shadow: true });
  ctx.restore();
}

async function renderChair(p: Project, today: string): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const chair = await loadImage(ref('b_chair'));
  ctx.fillStyle = '#6b4a35';
  ctx.fillRect(0, 0, W, H);
  if (chair) cover(ctx, chair, 0, 0, W, H);
  const piece = pieceOf(p.item, p.palette, p.pattern);
  const item = itemOf(p.item);
  if (item.id === 'muffler' || item.id === 'blanket') {
    const s = item.id === 'muffler' ? 44 : 26;
    const fw = widthOf(item) * s;
    drawHanging(ctx, piece, W * 0.51 - fw * 0.775, H * 0.29, s);
  } else {
    ctx.save();
    ctx.translate(W * 0.18, H * 0.3);
    drawFinishedFit(ctx, piece, W * 0.64, H * 0.5, { shadow: true });
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,250,242,0.95)';
  ctx.textAlign = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 8;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText('てくあみ', W - 50, H - 90);
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(`${pieceName(p)}  ${dotJa(p.finishedOn ?? today)}`, W - 50, H - 46);
  return canvas.toDataURL('image/png');
}

async function renderSnow(p: Project, today: string): Promise<string> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const trees = await loadImage(ref('d_snow'));
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#dfe6ee');
  g.addColorStop(0.45, '#f3f5f8');
  g.addColorStop(1, '#d9e1ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (trees) {
    const th = W * (trees.height / trees.width);
    ctx.drawImage(trees, 0, 0, W, th);
    const fade = ctx.createLinearGradient(0, th * 0.6, 0, th);
    fade.addColorStop(0, 'rgba(243,245,248,0)');
    fade.addColorStop(1, 'rgba(243,245,248,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, th * 0.6, W, th * 0.4 + 2);
  }
  // 雪のでこぼこ
  for (let i = 0; i < 260; i++) {
    const x = (i * 197) % W;
    const y = 470 + ((i * 131) % (H - 470));
    const r = 6 + ((i * 37) % 22);
    const rg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.75)');
    rg.addColorStop(1, 'rgba(190,205,222,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const piece = pieceOf(p.item, p.palette, p.pattern);
  ctx.save();
  ctx.translate(W / 2, H * 0.5);
  ctx.rotate(-0.42);
  ctx.translate(-W * 0.42, -H * 0.3);
  drawFinishedFit(ctx, piece, W * 0.84, H * 0.6, { shadow: true });
  ctx.restore();
  // 文字(見本D: 白い文字で真ん中に)
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(40,60,90,0.55)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 104px ${FONT}`;
  ctx.fillText('てくあみ', W / 2, H - 190);
  ctx.font = `700 46px ${FONT}`;
  ctx.fillText('歩いて編む歩数計', W / 2, H - 120);
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(`${pieceName(p)}  ${dotJa(p.finishedOn ?? today)}`, W / 2, H - 62);
  return canvas.toDataURL('image/png');
}


function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

/**
 * 共有用の画像(1080×1350、見本6のポラロイド風)。木の机にカードを置き、写真の所に編み物、下に「てくあみ」と日付。
 * 編みかけ(1段完成の「画像で見る」)は、編めた所までを描く。
 */
export async function renderShareImage(p: Project, progress: Progress, today: string, style: ShareStyle = 'polaroid'): Promise<string> {
  if (progress.done && style === 'chair') return renderChair(p, today);
  if (progress.done && style === 'snow') return renderSnow(p, today);
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const [floor, cone] = await Promise.all([loadImage(ref('floor')), loadImage(ref('pinecone'))]);

  // 外は生成りの紙(見本6)
  const bg = ctx.createRadialGradient(W / 2, H * 0.45, 100, W / 2, H / 2, H * 0.75);
  bg.addColorStop(0, '#f8efe2');
  bg.addColorStop(1, '#e6d6c0');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // カード
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.025);
  const cw = 820;
  const ch = 1160;
  ctx.shadowColor = 'rgba(30,15,5,0.45)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#fbf6ec';
  ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
  ctx.shadowColor = 'transparent';

  // 写真の所
  const px = -cw / 2 + 44;
  const py = -ch / 2 + 44;
  const pw = cw - 88;
  const ph = 860;
  // 写真の中は木の机(板を横に寝かせる)
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  ctx.fillStyle = '#7a5236';
  ctx.fillRect(px, py, pw, ph);
  if (floor) {
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.rotate(Math.PI / 2);
    const k = Math.max(ph / floor.width, pw / floor.height);
    ctx.drawImage(floor, (-floor.width * k) / 2, (-floor.height * k) / 2, floor.width * k, floor.height * k);
    ctx.restore();
  }
  const vg = ctx.createRadialGradient(px + pw / 2, py + ph / 2, ph * 0.2, px + pw / 2, py + ph / 2, ph * 0.8);
  vg.addColorStop(0, 'rgba(255,230,200,0.08)');
  vg.addColorStop(1, 'rgba(30,15,5,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(px, py, pw, ph);
  if (cone) {
    // 松ぼっくりの切り抜きは、右と下の端をぼかして机になじませる
    const cw2 = 190;
    const ch2 = cw2 * (cone.height / cone.width);
    const tmp = document.createElement('canvas');
    tmp.width = cw2;
    tmp.height = ch2;
    const t2 = tmp.getContext('2d')!;
    t2.drawImage(cone, 0, 0, cw2, ch2);
    t2.globalCompositeOperation = 'destination-in';
    const gx = t2.createLinearGradient(0, 0, cw2, 0);
    gx.addColorStop(0.55, 'rgba(0,0,0,1)');
    gx.addColorStop(1, 'rgba(0,0,0,0)');
    t2.fillStyle = gx;
    t2.fillRect(0, 0, cw2, ch2);
    const gy = t2.createLinearGradient(0, 0, 0, ch2);
    gy.addColorStop(0.7, 'rgba(0,0,0,1)');
    gy.addColorStop(1, 'rgba(0,0,0,0)');
    t2.fillStyle = gy;
    t2.fillRect(0, 0, cw2, ch2);
    ctx.drawImage(tmp, px, py);
  }
  ctx.translate(px, py);
  const piece = pieceOf(p.item, p.palette, p.pattern);
  if (progress.done) {
    drawFinishedFit(ctx, piece, pw, ph, { shadow: true });
  } else {
    // 編みかけ: 針に掛かったまま、編めた段だけを見せる(段が少ないうちは大きく)
    const item = itemOf(p.item);
    const Wc = widthOf(item);
    const Hr = heightOf(item);
    const rows = Math.max(1, progress.rowsDone + (progress.inRow > 0 ? 1 : 0));
    const s = Math.min((pw * 0.72) / Wc, (ph * 0.78) / (rows * PITCH + 1));
    const fw = Wc * s;
    const shownH = rows * s * PITCH;
    const t = s * 0.34;
    const needleY = (ph - shownH) / 2 - t;
    const x0 = (pw - fw) / 2;
    drawFabric(ctx, piece, { x: x0, y: needleY + t * 0.7 - (Hr - rows) * s * PITCH, s, stitchesDone: progress.stitches, shadow: true });
    drawNeedle(ctx, x0 - s * 1.4, x0 + fw + s * 1.6, needleY, t);
    drawLoops(ctx, piece, rows - 1, () => true, x0, needleY, s, t);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(80,50,30,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  // 文字
  ctx.textBaseline = 'alphabetic';
  if (progress.done) {
    // 見本C 14: 名前・日付・何歩で完成したか
    ctx.fillStyle = '#5a3a28';
    ctx.font = `700 46px ${FONT}`;
    ctx.fillText(pieceName(p), px + 14, py + ph + 84);
    ctx.fillStyle = '#7a6252';
    ctx.font = `600 34px ${FONT}`;
    ctx.fillText(dotJa(p.finishedOn ?? today), px + 14, py + ph + 140);
    ctx.fillText(`${progress.target.toLocaleString('ja-JP')}歩で完成しました`, px + 14, py + ph + 192);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9a8476';
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText('てくあみ', px + pw - 10, py + ph + 192);
  } else {
    ctx.fillStyle = '#5a3a28';
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText('てくあみ', px + 10, py + ph + 110);
    ctx.fillStyle = '#8a6e5c';
    ctx.font = `500 30px ${FONT}`;
    ctx.fillText('歩いて編む歩数計', px + 12, py + ph + 160);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#9a8476';
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText(dotJa(p.finishedOn ?? today), px + pw - 10, py + ph + 130);
  }
  ctx.restore();
  return canvas.toDataURL('image/png');
}

export function shareText(p: Project, progress: Progress): string {
  const item = itemOf(p.item).name;
  if (progress.done) return `${item}が編み上がりました。模様は「${patternOf(p.pattern).name}」でした。 #てくあみ`;
  return `${item}を編んでいます。いま ${progress.rowsDone} / ${progress.rowsTotal}段。 #てくあみ`;
}
