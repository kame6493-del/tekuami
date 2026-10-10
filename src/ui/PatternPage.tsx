import { useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/**
 * 模様(見本D・B・C 9)。先頭が「おたのしみ」(編み上がるまで分からない)。
 * 毛糸ぶくろがあれば自分で選べる。無ければ見本として並べるだけ(選ぶのは毛糸ぶくろの後)。
 */
export function PatternPage({ ctx, item }: { ctx: AppCtx; item: string }) {
  const { pro } = ctx;
  const [pick, setPick] = useState<string>('');
  return (
    <div className="page pattern">
      <PageHead title="模様" sub={`${itemOf(item).name}の模様`} onBack={ctx.pop} />
      <section className="surprise">
        <button
          className={`surprise-tile ${pick === '' ? 'is-on' : ''}`}
          aria-pressed={pick === ''}
          onClick={() => {
            tap();
            setPick('');
          }}
        >
          <Ref name="tile_random" className="surprise-art" />
        </button>
        <div className="surprise-text">
          <p className="surprise-title">おたのしみ</p>
          <p className="surprise-sub">
            編みあがるまで
            <br />
            どんな模様になるか わかりません
          </p>
        </div>
      </section>
      <h2 className="section-title">{pro ? '模様をえらぶ' : '模様をえらぶ(毛糸ぶくろで解放)'}</h2>
      <ul className="motif-grid" role={pro ? 'radiogroup' : undefined} aria-label="模様">
        {PATTERNS.map((pt) => {
          const locked = pt.pro && !pro;
          return (
            <li key={pt.id}>
              <button
                role={pro ? 'radio' : undefined}
                aria-checked={pro ? pick === pt.id : undefined}
                className={`motif ${pick === pt.id ? 'is-on' : ''} ${!pro ? 'is-sample' : ''}`}
                onClick={() => {
                  if (!pro) return ctx.push({ name: 'bag' });
                  tap();
                  setPick((v) => (v === pt.id ? '' : pt.id));
                }}
              >
                <Ref name={`tile_${pt.id}`} className="motif-art" />
                <span className="motif-name">{pt.name}</span>
                {locked && (
                  <span className="color-lock" aria-label="毛糸ぶくろで増えます">
                    <IconLock size={12} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {!pro && <p className="pattern-ex-sub">無料では、ハートなど6つの中からおたのしみで編みます</p>}
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.push({ name: 'colors', item, ...(pick ? { pattern: pick } : {}) })}>
          毛糸の色を選ぶ
        </button>
      </div>
    </div>
  );
}
