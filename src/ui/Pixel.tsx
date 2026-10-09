import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { itemOf } from '../art/items';
import { drawFinished, drawPiece, drawStage, finishedSize, pieceOf, pieceSize, sprite } from '../art/render';
import { BALL } from '../art/sprites';
import { paletteOf, YARNS } from '../art/yarns';
import { STITCH_W } from '../art/sprites';

/** 入れ物の大きさを測る */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * 入る中で一番大きい倍率。1ドットが端末の画素の整数個になる倍率(k / devicePixelRatio)だけを使うので、
 * 縮めて表示してもドットの幅が揃ったまま崩れない。
 */
export function fitScale(maxW: number, maxH: number, w: number, h: number, cap = 4): number {
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const fit = Math.min(maxW / w, maxH / h);
  const k = Math.floor(fit * dpr);
  // 端末の1画素より小さくなるとき(大きい物の小さな見本)だけ、なめらかに縮める
  if (k < 1) return fit;
  return Math.min(k, cap * dpr) / dpr;
}

/** ドットを整数倍で拡大する canvas */
function PixCanvas({ w, h, scale, draw, label }: { w: number; h: number; scale: number; draw: (ctx: CanvasRenderingContext2D) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || w <= 0 || h <= 0) return;
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
  });
  const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const soft = scale * dpr < 1;
  return <canvas ref={ref} width={Math.max(1, w)} height={Math.max(1, h)} className={soft ? 'pix-soft' : 'pix'} style={{ width: w * scale, height: h * scale }} role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true} />;
}

/** 編んでいる途中の台。入れ物いっぱいに広がる */
export function Stage(props: { item: string; palette: string; pattern: string; stitches: number; rowsDone: number; frame: number; label: string }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const item = itemOf(props.item);
  const piece = pieceOf(props.item, props.palette, props.pattern);
  const pw = pieceSize(item).w + 2 * STITCH_W;
  // 編み物(と左右の針)が台の幅の 8 割に収まる一番大きい倍率。1ドットは端末の画素の整数個
  const scale = size.w ? Math.max(1, fitScale(size.w * 0.82, Number.MAX_SAFE_INTEGER, pw, 1)) : 1;
  const w = Math.floor(size.w / scale);
  const h = Math.floor(size.h / scale);
  return (
    <div ref={ref} className="stage">
      {size.w > 0 && size.h > 0 && (
        <PixCanvas w={w} h={h} scale={scale} label={props.label} draw={(ctx) => drawStage(ctx, { w, h }, piece, props.stitches, props.rowsDone, props.frame)} />
      )}
    </div>
  );
}

/** 仕上がった物(箱の一覧・大きく見る画面) */
export function Finished({ item, palette, pattern, max, label }: { item: string; palette: string; pattern: string; max: { w: number; h: number }; label: string }) {
  const it = itemOf(item);
  const { w, h } = finishedSize(it);
  const pad = 4;
  const scale = fitScale(max.w, max.h, w + pad * 2, h + pad * 2);
  const piece = pieceOf(item, palette, pattern);
  return <PixCanvas w={w + pad * 2} h={h + pad * 2} scale={scale} label={label} draw={(ctx) => drawFinished(ctx, w + pad * 2, h + pad * 2, piece)} />;
}

/** 入れ物に合わせて仕上がりを描く。room は入れ物のうち絵に使う割合 */
export function FinishedFill(props: { item: string; palette: string; pattern: string; label: string; room?: number }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const room = props.room ?? 1;
  return (
    <div ref={ref} className="fill-box">
      {size.w > 0 && size.h > 0 && <Finished {...props} max={{ w: size.w * room, h: size.h * room }} />}
    </div>
  );
}

/** 編みかけを箱の大きさで(途中までの段だけ) */
export function Partial({ item, palette, pattern, stitches, max, label }: { item: string; palette: string; pattern: string; stitches: number; max: { w: number; h: number }; label: string }) {
  const it = itemOf(item);
  const { w, h } = pieceSize(it);
  const scale = fitScale(max.w, max.h, w + 8, h + 8);
  const piece = pieceOf(item, palette, pattern);
  return <PixCanvas w={w + 8} h={h + 8} scale={scale} label={label} draw={(ctx) => drawPiece(ctx, piece, 4, 4, stitches, { decor: false })} />;
}

/** 毛糸玉(色選び用) */
export function Ball({ palette, scale = 2 }: { palette: string; scale?: number }) {
  const pal = paletteOf(palette);
  const bw = BALL[0].length;
  const bh = BALL.length;
  return (
    <PixCanvas
      w={bw + 10}
      h={bh}
      scale={scale}
      label=""
      draw={(ctx) => {
        // 地の色の玉を手前に、模様の色の玉を奥に少しずらして
        sprite(ctx, BALL, 10, 0, YARNS[pal.sub]);
        sprite(ctx, BALL, 0, 0, YARNS[pal.main]);
      }}
    />
  );
}
