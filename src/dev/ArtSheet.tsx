import { useEffect, useRef } from 'react';
import { ITEMS } from '../art/items';
import { drawFabric, drawFinishedFit, drawLoops, drawNeedle, pieceOf, PITCH, type Piece } from '../art/knit';
import type { ItemDef } from '../art/items';
import { MOTIFS } from '../art/motifs';
import { PATTERNS } from '../art/motifs';
import { PALETTES } from '../art/yarns';

/**
 * 絵の見本(ブラウザでの確認用)。?art=knit で編み地を大きく、?art=items で仕上がりを全部並べる。
 * 描いたら拡大して目で見て、編み物に見えるかを確かめるための台。
 */
function Cv({ w, h, draw, bg = '#f6ecdc' }: { w: number; h: number; draw: (ctx: CanvasRenderingContext2D) => void; bg?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    draw(ctx);
  });
  return <canvas ref={ref} width={w} height={h} style={{ width: w / 2, height: h / 2 }} />;
}

/** アイコン(1024)。ハートの編み地が木の針に掛かっている。fg=1 は背景なし(Android の前景・起動画面) */
function iconPiece(): Piece {
  const W = 9;
  const H = 9;
  const item: ItemDef = { id: 'icon', name: '', short: '', pro: false, rows: Array.from({ length: H }, () => 'x'.repeat(W)), decor: 'none' };
  const heart = MOTIFS.heart;
  const stitches = Array.from({ length: H }, (_, r) =>
    Array.from({ length: W }, (_, c) => {
      const line = heart.length - r; // 下の段 r=1..7 に図案の下から
      const mr = r >= 1 && r <= heart.length ? heart[line] : null;
      const ch = mr && c >= 1 && c <= 7 ? mr[c - 1] : '.';
      return { yarn: ch === 'o' ? ('strawberry' as const) : ('milk' as const), sunk: false };
    }),
  );
  return { item, stitches, main: 'milk', sub: 'strawberry', accent: 'strawberry' };
}

function IconCanvas({ fg }: { fg: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const N = 1024;
    ctx.clearRect(0, 0, N, N);
    if (!fg) {
      const g = ctx.createRadialGradient(N * 0.45, N * 0.35, N * 0.1, N / 2, N / 2, N * 0.75);
      g.addColorStop(0, '#fdf7ec');
      g.addColorStop(1, '#f1e0c8');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, N, N);
    }
    const piece = iconPiece();
    const k = fg ? 0.62 : 0.74;
    const s = (N * k) / 9;
    const fh = 9 * s * PITCH;
    const x = (N - 9 * s) / 2;
    const t = s * 0.36;
    const needleY = (N - (fh + 2.1 * t)) / 2 + 1.4 * t;
    drawFabric(ctx, piece, { x, y: needleY + t * 0.7, s, shadow: true });
    drawNeedle(ctx, x - s * 0.9, x + 9 * s + s * 1.0, needleY, t);
    drawLoops(ctx, piece, 8, () => true, x, needleY, s, t);
  });
  return <canvas id="icon" ref={ref} width={1024} height={1024} style={{ width: 1024, height: 1024 }} />;
}

export function ArtSheet() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('art');
  if (mode === 'icon') return <IconCanvas fg={q.get('fg') === '1'} />;
  if (mode === 'knit') {
    const s = Number(q.get('s') ?? 60);
    const pal = q.get('pal') ?? 'ichigo';
    const pat = q.get('pat') ?? 'heart';
    const piece = pieceOf('muffler', pal, pat);
    const done = Number(q.get('n') ?? 200);
    return (
      <div style={{ background: '#fff', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Cv
          w={s * 16}
          h={s * 30}
          draw={(ctx) => {
            const x = s * 2;
            drawFabric(ctx, piece, { x, y: s * 1.4, s, stitchesDone: done, decor: true, shadow: true });
          }}
        />
        <Cv
          w={s * 16}
          h={s * 12}
          draw={(ctx) => {
            const x = s * 2;
            const y = s * 2;
            drawNeedle(ctx, x - s, x + s * 13, y, s * 0.3);
            drawLoops(ctx, piece, 5, () => true, x, y, s, s * 0.3);
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#fff' }}>
      {ITEMS.map((it, i) => (
        <Cv key={it.id} w={440} h={520} draw={(ctx) => drawFinishedFit(ctx, pieceOf(it.id, PALETTES[(i + Number(q.get('o') ?? 0)) % PALETTES.length].id, PATTERNS[(i + Number(q.get('o') ?? 0)) % PATTERNS.length].id), 440, 520, { shadow: true })} />
      ))}
    </div>
  );
}
