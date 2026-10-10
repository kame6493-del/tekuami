import { useEffect, useRef } from 'react';
import { ITEMS } from '../art/items';
import { drawFabric, drawFinishedFit, drawLoops, drawNeedle, pieceOf } from '../art/knit';
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

export function ArtSheet() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('art');
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
