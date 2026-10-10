import { useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/** 模様は編み上がるまで秘密(見本8)。毛糸ぶくろがあれば自分で選べる */
export function PatternPage({ ctx, item }: { ctx: AppCtx; item: string }) {
  const { pro } = ctx;
  const [pick, setPick] = useState<string>('');
  return (
    <div className="page pattern">
      <PageHead title="模様" onBack={ctx.pop} />
      <p className="pattern-lead">
        どんな模様になるか
        <br />
        編み上がるまで分かりません
      </p>
      <div className={`secret ${pick ? 'is-chosen' : ''}`}>
        {pick ? <Ref name={`motif_${pick}`} className="secret-art" /> : <Ref name="secret" className="secret-art" />}
      </div>
      <p className="pattern-ex">{pro ? '模様を選べます(選ばなければ、お楽しみ)' : 'たとえば…こんな模様があります'}</p>
      {!pro && <p className="pattern-ex-sub">(毛糸ぶくろで6種類に増えます)</p>}
      <ul className="motif-grid" role={pro ? 'radiogroup' : undefined} aria-label="模様">
        {PATTERNS.map((pt) => {
          const locked = pt.pro && !pro;
          const inner = (
            <>
              <Ref name={`motif_${pt.id}`} className="motif-art" />
              <span className="motif-name">{pt.name}</span>
              {locked && (
                <span className="color-lock" aria-label="毛糸ぶくろで増えます">
                  <IconLock size={12} />
                </span>
              )}
            </>
          );
          return (
            <li key={pt.id}>
              {pro ? (
                <button
                  role="radio"
                  aria-checked={pick === pt.id}
                  className={`motif ${pick === pt.id ? 'is-on' : ''}`}
                  onClick={() => {
                    tap();
                    setPick((v) => (v === pt.id ? '' : pt.id));
                  }}
                >
                  {inner}
                </button>
              ) : (
                <div className="motif">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="page-foot">
        {!ctx.data.onboarded && <p className="pattern-choice">はじめは、{itemOf(item).name}から編みます</p>}
        <button className="btn btn-primary" onClick={() => ctx.push({ name: 'colors', item, ...(pick ? { pattern: pick } : {}) })}>
          毛糸の色を選ぶ
        </button>
      </div>
    </div>
  );
}
