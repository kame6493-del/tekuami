import { useEffect, useRef } from 'react';
import { ITEMS } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { drawFinished, drawStage, finishedSize, pieceOf } from '../art/render';
import { PALETTES } from '../art/yarns';
import { totalStitchesOf } from '../domain/knit';

/** 絵の見本(?art=1)。1体ずつ拡大して、崩れや何か分からない形が無いかを見るための台 */
function Pix({ draw, w, h, scale }: { draw: (ctx: CanvasRenderingContext2D) => void; w: number; h: number; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
  });
  return <canvas ref={ref} width={w} height={h} style={{ width: w * scale, height: h * scale, imageRendering: 'pixelated', background: '#f4efe4' }} />;
}

export function ArtSheet() {
  const mode = new URLSearchParams(location.search).get('art');
  if (mode === 'stage') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#fff' }}>
        {ITEMS.map((it, i) => {
          const piece = pieceOf(it.id, PALETTES[i % PALETTES.length].id, PATTERNS[i].id);
          const total = totalStitchesOf(it);
          const done = Math.floor(total * 0.55);
          let rows = 0;
          let left = done;
          while (rows < piece.stitches.length && left >= piece.stitches[rows].filter(Boolean).length) {
            left -= piece.stitches[rows].filter(Boolean).length;
            rows++;
          }
          return <Pix key={it.id} w={180} h={180} scale={2} draw={(ctx) => drawStage(ctx, { w: 180, h: 180 }, piece, done, rows, 0)} />;
        })}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, background: '#fff' }}>
      {ITEMS.map((it, i) => {
        const { w, h } = finishedSize(it);
        const piece = pieceOf(it.id, PALETTES[(i * 2 + Number(mode === '2')) % PALETTES.length].id, PATTERNS[(i + (mode === '2' ? 6 : 0)) % PATTERNS.length].id);
        return <Pix key={it.id} w={w + 8} h={h + 8} scale={2} draw={(ctx) => drawFinished(ctx, w + 8, h + 8, piece)} />;
      })}
    </div>
  );
}
