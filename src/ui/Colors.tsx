import { useState } from 'react';
import type { AppCtx } from '../App';
import { PALETTES, type Palette } from '../art/yarns';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/** 毛糸の色(見本D)。基本の8色(無料)と、毛糸ぶくろで増える8組 */
export function Colors({ ctx, item, pattern }: { ctx: AppCtx; item: string; pattern?: string }) {
  const { pro } = ctx;
  const last = ctx.data.done.at(-1)?.palette;
  const [sel, setSel] = useState(PALETTES.find((p) => p.id === last && (pro || !p.pro))?.id ?? PALETTES[0].id);
  const ball = (p: Palette) => {
    const locked = p.pro && !pro;
    return (
      <li key={p.id}>
        <button
          role="radio"
          aria-checked={sel === p.id}
          className={`color-card ${sel === p.id ? 'is-on' : ''}`}
          onClick={() => {
            if (locked) return ctx.push({ name: 'bag' });
            tap();
            setSel(p.id);
          }}
        >
          <Ref name={`d_ball_${p.id}`} className="color-balls" />
          <span className="color-name">{p.name}</span>
          {locked && (
            <span className="color-lock" aria-label="毛糸ぶくろで開きます">
              <IconLock size={12} />
            </span>
          )}
        </button>
      </li>
    );
  };
  return (
    <div className="page colors">
      <PageHead title="毛糸の色" onBack={ctx.pop} />
      <section className="color-sec">
        <h2 className="color-sec-title">基本の毛糸(無料)</h2>
        <ul className="color-grid" role="radiogroup" aria-label="基本の毛糸">
          {PALETTES.filter((p) => !p.pro).map(ball)}
        </ul>
      </section>
      <section className="color-sec">
        <h2 className="color-sec-title">
          {!pro && <IconLock size={14} />}
          毛糸ぶくろで追加(8組)
        </h2>
        <ul className="color-grid" role="radiogroup" aria-label="毛糸ぶくろの毛糸">
          {PALETTES.filter((p) => p.pro).map(ball)}
        </ul>
      </section>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.push({ name: 'preview', item, palette: sel, ...(pattern ? { pattern } : {}) })}>
          完成イメージを見る
        </button>
      </div>
    </div>
  );
}
