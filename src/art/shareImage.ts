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
export async function renderShareImage(p: Project, progress: Progress, today: string): Promise<string> {
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
  ctx.fillStyle = '#5a3a28';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText('てくあみ', px + 10, py + ph + 110);
  ctx.fillStyle = '#8a6e5c';
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText('歩いて編む歩数計', px + 12, py + ph + 160);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9a8476';
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(dotJa(p.finishedOn ?? today), px + pw - 10, py + ph + 130);
  ctx.restore();
  return canvas.toDataURL('image/png');
}

export function shareText(p: Project, progress: Progress): string {
  const item = itemOf(p.item).name;
  if (progress.done) return `${item}が編み上がりました。模様は「${patternOf(p.pattern).name}」でした。 #てくあみ`;
  return `${item}を編んでいます。いま ${progress.rowsDone} / ${progress.rowsTotal}段。 #てくあみ`;
}
