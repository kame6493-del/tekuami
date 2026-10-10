import { useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { PALETTES } from '../art/yarns';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/** 毛糸の色を選ぶ(見本9)。選んだら模様の画面へ */
export function Colors({ ctx, item, pattern }: { ctx: AppCtx; item: string; pattern?: string }) {
  const { pro } = ctx;
  const last = ctx.data.done.at(-1)?.palette;
  const [sel, setSel] = useState(PALETTES.find((p) => p.id === last && (pro || !p.pro))?.id ?? PALETTES[0].id);
  const reserve = !!ctx.data.current && ctx.data.onboarded;
  return (
    <div className="page colors">
      <PageHead title="毛糸の色を選ぶ" sub={pro ? `${itemOf(item).name}を編む毛糸` : '(毛糸ぶくろで8組に増えます)'} onBack={ctx.pop} />
      <ul className="color-grid" role="radiogroup" aria-label="毛糸の色">
        {PALETTES.map((p) => {
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
                <Ref name={`balls_${p.id}`} className="color-balls" />
                <span className="color-name">{p.name}</span>
                {locked && (
                  <span className="color-lock" aria-label="毛糸ぶくろで開きます">
                    <IconLock size={14} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.choose({ item, palette: sel, ...(pattern ? { pattern } : {}) })}>
          {reserve ? '次に編むものに決める' : 'この色で編みはじめる'}
        </button>
      </div>
    </div>
  );
}
