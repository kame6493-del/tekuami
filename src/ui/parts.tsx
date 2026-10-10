import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { heightOf, widthOf } from '../art/items';
import { drawFabric, drawFinishedFit, drawLoops, drawNeedle, orderOf, PITCH, pieceOf } from '../art/knit';
import { ref } from '../art/ref';

/** 入れ物の大きさを測る */
export function useSize<T extends HTMLElement>() {
  const el = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const e = el.current;
    if (!e) return;
    const set = () => setSize({ w: e.clientWidth, h: e.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(e);
    return () => ro.disconnect();
  }, []);
  return [el, size] as const;
}

const dprOf = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));

/** canvas を入れ物いっぱいに置いて、端末の画素の細かさで描く */
function FillCanvas({ draw, label, className, deps }: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void; label: string; className?: string; deps: unknown[] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const cv = useRef<HTMLCanvasElement>(null);
  const dpr = dprOf();
  const W = Math.round(size.w * dpr);
  const H = Math.round(size.h * dpr);
  useEffect(() => {
    const ctx = cv.current?.getContext('2d');
    if (!ctx || W <= 0 || H <= 0) return;
    ctx.clearRect(0, 0, W, H);
    draw(ctx, W, H, dpr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H, dpr, ...deps]);
  return (
    <div ref={box} className={`fill ${className ?? ''}`}>
      {W > 0 && H > 0 && <canvas ref={cv} width={W} height={H} style={{ width: size.w, height: size.h }} role="img" aria-label={label || undefined} aria-hidden={label ? undefined : true} />}
    </div>
  );
}

/** 仕上がった物を入れ物いっぱいに */
export function KnitPiece({ item, palette, pattern, label, shadow = true, className }: { item: string; palette: string; pattern: string; label: string; shadow?: boolean; className?: string }) {
  return (
    <FillCanvas
      className={className}
      label={label}
      deps={[item, palette, pattern, shadow]}
      draw={(ctx, w, h) => {
        drawFinishedFit(ctx, pieceOf(item, palette, pattern), w, h, { shadow });
      }}
    />
  );
}

/**
 * 編んでいる途中の台。針が上にあり、編めた分が下に垂れる。古い段は下へ流れて、下の端で薄く消える。
 * 編み目の幅は台の幅の 56% に編み地が収まる大きさ(見本のマフラーと同じ割合)。
 */
export function KnitStage({ item, palette, pattern, stitches, label }: { item: string; palette: string; pattern: string; stitches: number; label: string }) {
  return (
    <FillCanvas
      className="stage"
      label={label}
      deps={[item, palette, pattern, stitches]}
      draw={(ctx, w, h, dpr) => {
        const piece = pieceOf(item, palette, pattern);
        const it = piece.item;
        const Wc = widthOf(it);
        const H = heightOf(it);
        const s = Math.min((w * 0.46) / Wc, 26 * dpr);
        const p = s * PITCH;
        const fw = Wc * s;
        const x = (w - fw) / 2;
        const t = Math.max(4, s * 0.34);
        const needleY = t * 1.6;
        // いま編んでいる段
        let left = stitches;
        let cur = 0;
        while (cur < H && left >= orderOf(it, cur).length) {
          left -= orderOf(it, cur).length;
          cur++;
        }
        const rCur = Math.min(cur, H - 1);
        const curTop = needleY + t * 0.7;
        const yTopRow = curTop - (H - 1 - rCur) * p;
        drawFabric(ctx, piece, { x, y: yTopRow, s, stitchesDone: stitches });
        // マフラーの房(作り目の端)が見えるところまで来たら付ける
        // 下の端を薄く消す
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const g = ctx.createLinearGradient(0, h * 0.8, 0, h);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h * 0.8, w, h * 0.2);
        ctx.restore();
        // 針と、針に掛かった目
        drawNeedle(ctx, x - s * 1.6, x + fw + s * 1.9, needleY, t);
        const doneInCur = new Set(orderOf(it, rCur).slice(0, cur >= H ? orderOf(it, rCur).length : left));
        const prevRow = rCur - 1;
        if (cur >= H || doneInCur.size > 0) drawLoops(ctx, piece, rCur, (c) => doneInCur.has(c) || cur >= H, x, needleY, s, t);
        // まだ編んでいない目は、前の段(無ければ作り目)の輪のまま針に掛かっている
        if (cur < H) {
          const liveRow = prevRow >= 0 ? prevRow : 0;
          drawLoops(ctx, prevRow >= 0 ? piece : { ...piece, stitches: piece.stitches.map((r) => r.map((st) => (st ? { ...st, yarn: piece.main } : st))) }, liveRow, (c) => !doneInCur.has(c) && !!piece.stitches[rCur][c], x, needleY, s, t, prevRow >= 0 ? p * 0.9 : 0);
        }
      }}
    />
  );
}

/** 見本から切り出した絵 */
export function Ref({ name, className, alt = '' }: { name: string; className?: string; alt?: string }) {
  return <img className={className} src={ref(name)} alt={alt} aria-hidden={alt ? undefined : true} draggable={false} />;
}

export function PageHead({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <header className="page-head">
      {onBack && (
        <button className="back" aria-label="戻る" onClick={onBack}>
          <IconBack />
        </button>
      )}
      <div className="page-head-text">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
    </header>
  );
}

/** 見本の雲の形の吹き出し */
export function Cloud({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`cloud ${className ?? ''}`}>
      <svg className="cloud-bg" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden>
        <path
          d="M40 96 C14 96 6 74 20 62 C6 46 22 24 46 30 C52 12 80 6 96 20 C108 4 140 4 152 18 C166 4 198 6 206 24 C226 12 256 20 258 40 C282 40 294 62 280 76 C292 92 272 108 250 102 C238 116 210 116 198 104 C184 116 152 118 140 106 C124 118 92 118 80 104 C68 114 44 110 40 96 Z"
          fill="var(--cloud)"
          stroke="var(--cloud-edge)"
          strokeWidth="2"
        />
      </svg>
      <div className="cloud-text">{children}</div>
    </div>
  );
}

/** 紙ふぶき(見本の色) */
export function Confetti({ n = 18 }: { n?: number }) {
  const colors = ['#e9a23b', '#e06a74', '#7fb0d8', '#f2c94c', '#9cc59a', '#e88a5a'];
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const left = (i * 53) % 100;
        const delay = ((i * 37) % 10) / 10;
        const rot = (i * 71) % 360;
        return <span key={i} style={{ left: `${left}%`, background: colors[i % colors.length], animationDelay: `${delay}s`, transform: `rotate(${rot}deg)` }} />;
      })}
    </div>
  );
}

const ic = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export function IconBack() {
  return (
    <svg {...ic}>
      <path d="M20 12 H5" />
      <path d="M11 5 L4 12 L11 19" />
    </svg>
  );
}
export function IconChevron() {
  return (
    <svg {...ic} width={18} height={18}>
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  );
}
export function IconGear() {
  return (
    <svg {...ic} width={26} height={26} strokeWidth={1.8}>
      <path d="M12 2.8 l1.6 2.3 2.7-.8 .6 2.8 2.8.6 -.8 2.7 2.3 1.6 -2.3 1.6 .8 2.7 -2.8.6 -.6 2.8 -2.7-.8 L12 21.2 l-1.6-2.3 -2.7.8 -.6-2.8 -2.8-.6 .8-2.7 L2.8 12 l2.3-1.6 -.8-2.7 2.8-.6 .6-2.8 2.7.8 Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}
export function IconLock({ size = 18 }: { size?: number }) {
  return (
    <svg {...ic} width={size} height={size} strokeWidth={2.2}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" stroke="none" />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 V11" />
    </svg>
  );
}
export function IconSparkle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <path d="M12 2 C13 9 15 11 22 12 C15 13 13 15 12 22 C11 15 9 13 2 12 C9 11 11 9 12 2 Z" fill="#f2c14e" />
    </svg>
  );
}

/** 段の数(stitches 目まで編めたとき、編み上がった段の数) */
export function rowsDoneOf(item: string, stitches: number): number {
  const it = pieceOf(item, 'milk', 'heart').item;
  let r = 0;
  let left = stitches;
  while (r < heightOf(it) && left >= orderOf(it, r).length) {
    left -= orderOf(it, r).length;
    r++;
  }
  return r;
}

/**
 * 今日編めた分だけを横長の帯にして見せる(見本B「1日の終わり」)。新しい段が右。
 * from〜to は目の数。
 */
export function KnitStrip({ item, palette, pattern, from, to, label }: { item: string; palette: string; pattern: string; from: number; to: number; label: string }) {
  return (
    <FillCanvas
      className="strip"
      label={label}
      deps={[item, palette, pattern, from, to]}
      draw={(ctx, w, h) => {
        const piece = pieceOf(item, palette, pattern);
        const it = piece.item;
        const Wc = widthOf(it);
        const H = heightOf(it);
        const r0 = Math.min(rowsDoneOf(item, from), H - 1);
        const r1 = Math.min(H, Math.max(r0 + 1, rowsDoneOf(item, to) + (to > from ? 1 : 0)));
        const n = Math.max(1, r1 - r0);
        // 回したあと: 横 = 段の数、縦 = 目の数
        const s = Math.min((w * 0.94) / (n * PITCH + 0.4), (h * 0.9) / Wc);
        const p = s * PITCH;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(Math.PI / 2);
        // 段 r0..r1 の帯の真ん中を原点に
        const bandTop = (H - r1) * p; // 一番上の段 r1-1 の上端(y0=0 のとき)
        const bandH = n * p;
        const y0 = -(bandTop + bandH / 2);
        const x0 = -(Wc * s) / 2;
        ctx.beginPath();
        ctx.rect(x0 - s, -bandH / 2 - p * 0.15, Wc * s + 2 * s, bandH + p * 0.3);
        ctx.clip();
        drawFabric(ctx, piece, { x: x0, y: y0, s, stitchesDone: to });
        ctx.restore();
      }}
    />
  );
}

/** 木の棒(見本B・C の、編み地を掛ける棒) */
export function WoodBar({ className }: { className?: string }) {
  return (
    <span className={`woodbar ${className ?? ''}`} aria-hidden>
      <span className="woodbar-knob" />
      <span className="woodbar-knob" />
    </span>
  );
}

/** 円の進み具合(見本D の細い弧)。吹き出しの縁の下半分を、左から右へ。frac は 0〜1 */
export function Arc({ frac, className }: { frac: number; className?: string }) {
  const f = Math.max(0, Math.min(1, frac));
  const L = Math.PI * 47; // 半周
  return (
    <svg className={`arc ${className ?? ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path d="M3 50 A47 47 0 0 0 97 50" fill="none" stroke="var(--arc-bg)" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d="M3 50 A47 47 0 0 0 97 50" fill="none" stroke="var(--arc)" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={L} strokeDasharray={`${L * f} ${L}`} />
    </svg>
  );
}
