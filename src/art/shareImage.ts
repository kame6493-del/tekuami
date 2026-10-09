import { itemOf } from './items';
import { patternOf } from './motifs';
import { drawFinished, drawPiece, finishedSize, pieceOf, pieceSize } from './render';
import { paletteOf } from './yarns';
import { fmt, daysBetween, labelJa } from '../domain/dates';
import type { Progress, Project } from '../domain/knit';

const FONT = "-apple-system, 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic UI', sans-serif";

export function pieceTitle(p: Project): string {
  return `${paletteOf(p.palette).name}の${itemOf(p.item).name}`;
}

/** 共有用の画像(1080×1350)。編み上がりも編みかけも同じ型 */
export function renderShareImage(p: Project, progress: Progress, today: string): string {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f4efe4';
  ctx.fillRect(0, 0, W, H);

  // 編み物は小さく描いてから整数倍で拡大(ドットをにじませない)
  const item = itemOf(p.item);
  const piece = pieceOf(p.item, p.palette, p.pattern);
  const size = progress.done ? finishedSize(item) : pieceSize(item);
  const art = document.createElement('canvas');
  art.width = size.w + 16;
  art.height = size.h + 16;
  const actx = art.getContext('2d')!;
  if (progress.done) drawFinished(actx, art.width, art.height, piece);
  else drawPiece(actx, piece, 8, 8, progress.stitches, { decor: false });
  const boxW = 820;
  const boxH = 860;
  const scale = Math.max(1, Math.floor(Math.min(boxW / art.width, boxH / art.height)));
  ctx.imageSmoothingEnabled = false;
  const dw = art.width * scale;
  const dh = art.height * scale;
  ctx.drawImage(art, Math.floor((W - dw) / 2), 96 + Math.floor((boxH - dh) / 2), dw, dh);

  ctx.fillStyle = '#2a2420';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText('てくあみ', 72, 88);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#6b6158';
  ctx.font = `400 30px ${FONT}`;
  ctx.fillText(labelJa(today), W - 72, 88);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#2a2420';
  ctx.font = `700 60px ${FONT}`;
  ctx.fillText(pieceTitle(p), 72, 1110);
  ctx.font = `400 36px ${FONT}`;
  ctx.fillStyle = '#6b6158';
  const days = Math.max(1, daysBetween(p.startedOn, p.finishedOn ?? today) + 1);
  const line = progress.done
    ? `${patternOf(p.pattern).name}の模様  ・  ${days}日  ・  ${fmt(item.steps)}歩`
    : `編みかけ ${progress.rowsDone} / ${progress.rowsTotal}段  ・  ${fmt(progress.steps)}歩`;
  ctx.fillText(line, 72, 1172);

  // 下の細い線と、歩数計であることの一言
  ctx.fillStyle = '#b23f29';
  ctx.fillRect(72, 1232, 64, 6);
  ctx.fillStyle = '#6b6158';
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText('歩いた分だけ、ひと目ずつ編める歩数計', 72, 1284);
  return canvas.toDataURL('image/png');
}

export function shareText(p: Project, progress: Progress): string {
  const item = itemOf(p.item).name;
  if (progress.done) return `${item}が編み上がりました。模様は「${patternOf(p.pattern).name}」でした。 #てくあみ`;
  return `${item}を編んでいます。いま ${progress.rowsDone} / ${progress.rowsTotal}段。 #てくあみ`;
}
