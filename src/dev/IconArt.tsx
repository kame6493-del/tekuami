import { useEffect, useRef } from 'react';
import { drawFinished, finishedSize, pieceOf, sprite } from '../art/render';
import { BALL, NEEDLE_KNOB, STITCH } from '../art/sprites';
import { WOOD, YARNS, type Shades } from '../art/yarns';

/**
 * アイコンの原画(?art=icon&kind=...)。32×32 ドットで描いて 32 倍(1024px)にする。
 * kind=knit: 茜の編み地に、真ん中の1目だけ生成り。小さく出しても「編み目」と分かる形
 * kind=ball: 毛糸玉と2本の針
 * kind=ballfg: 背景なし(Android のアダプティブアイコンの前景・起動画面に使う)
 */
const N = 32;

function stitchAt(ctx: CanvasRenderingContext2D, x: number, y: number, shades: Shades) {
  for (let r = 0; r < STITCH.length; r++) for (let c = 0; c < STITCH[r].length; c++) {
    ctx.fillStyle = shades[Number(STITCH[r][c])];
    ctx.fillRect(x + c, y + r, 1, 1);
  }
}

function drawKnit(ctx: CanvasRenderingContext2D, bg: boolean) {
  if (bg) {
    // 4目×6段を少しはみ出させて敷きつめる(真ん中の1目だけ生成り)
    for (let row = -1; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        const center = row === 2 && (col === 1 || col === 2);
        stitchAt(ctx, col * 8, row * 6 - 1, center ? YARNS.cream : YARNS.akane);
      }
    }
    return;
  }
  // 前景だけ(中央 2目×1段)
  stitchAt(ctx, 8, 13, YARNS.cream);
  stitchAt(ctx, 16, 13, YARNS.cream);
}

function drawBall(ctx: CanvasRenderingContext2D, bg: boolean) {
  if (bg) {
    ctx.fillStyle = '#f4efe4';
    ctx.fillRect(0, 0, N, N);
  }
  // 針2本(奥)
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = WOOD[3];
    ctx.fillRect(4 + i, 26 - i, 1, 1);
    ctx.fillStyle = WOOD[1];
    ctx.fillRect(4 + i, 27 - i, 1, 1);
    ctx.fillStyle = WOOD[3];
    ctx.fillRect(27 - i, 26 - i, 1, 1);
    ctx.fillStyle = WOOD[1];
    ctx.fillRect(27 - i, 27 - i, 1, 1);
  }
  sprite(ctx, NEEDLE_KNOB, 26, 1, WOOD);
  sprite(ctx, NEEDLE_KNOB, 2, 1, WOOD);
  sprite(ctx, BALL, 5, 9, YARNS.akane);
}

export function IconArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  const kind = new URLSearchParams(location.search).get('kind') ?? 'knit';
  const size = Number(new URLSearchParams(location.search).get('size') ?? 1024);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const small = document.createElement('canvas');
    small.width = N;
    small.height = N;
    const sctx = small.getContext('2d')!;
    if (kind === 'ball' || kind === 'ballfg') drawBall(sctx, kind === 'ball');
    else drawKnit(sctx, kind !== 'fg');
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(small, 0, 0, size, size);
  }, [kind, size]);
  return <canvas id="icon" ref={ref} width={size} height={size} style={{ width: size, height: size, display: 'block' }} />;
}

/** 仕上がりの絵だけを書き出す(?art=piece&item=muffler&pal=akane&pat=heart&scale=6)。ストアの絵を作るため */
export function PieceArt() {
  const q = new URLSearchParams(location.search);
  const ref = useRef<HTMLCanvasElement>(null);
  const item = q.get('item') ?? 'muffler';
  const scale = Number(q.get('scale') ?? 6);
  const piece = pieceOf(item, q.get('pal') ?? 'akane', q.get('pat') ?? 'heart');
  const { w, h } = finishedSize(piece.item);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const small = document.createElement('canvas');
    small.width = w;
    small.height = h;
    drawFinished(small.getContext('2d')!, w, h, piece);
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, w * scale, h * scale);
  });
  return <canvas id="icon" ref={ref} width={w * scale} height={h * scale} style={{ display: 'block' }} />;
}
