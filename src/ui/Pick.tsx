import { useState } from 'react';
import type { AppCtx } from '../App';
import { ITEMS, itemOf } from '../art/items';
import { fmt } from '../domain/dates';
import { targetSteps } from '../domain/knit';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/** 編むものを選ぶ(見本D・C 7)。2列のカード、毛糸ぶくろの物は鍵 */
export function Pick({ ctx }: { ctx: AppCtx }) {
  const { pro, data } = ctx;
  const made = new Set(data.done.map((p) => p.item));
  const first = ITEMS.find((i) => (pro || !i.pro) && !made.has(i.id))?.id ?? 'muffler';
  const [sel, setSel] = useState(first);
  const cur = data.current;
  return (
    <div className="page pick">
      <PageHead title="編むものを選ぶ" onBack={ctx.pop} />
      {cur ? (
        <p className="pick-note">
          いまは{itemOf(cur.item).name}を編んでいます。
          {data.queued ? `次は${itemOf(data.queued.item).name}に決まっています。` : '選んでおくと、編み上がったあと続けて編みはじめます。'}
        </p>
      ) : (
        <p className="pick-lead">マフラーの次は、ニット帽やミトンも編めます</p>
      )}
      <ul className="pick-grid">
        {ITEMS.map((it) => {
          const locked = it.pro && !pro;
          return (
            <li key={it.id}>
              <button
                className={`pick-tile ${sel === it.id ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                aria-pressed={sel === it.id}
                onClick={() => {
                  if (locked) return ctx.push({ name: 'bag' });
                  tap();
                  setSel(it.id);
                }}
              >
                {locked && (
                  <span className="pick-lock" aria-label="毛糸ぶくろで開きます">
                    <IconLock size={16} />
                  </span>
                )}
                {sel === it.id && !locked && (
                  <span className="pick-check" aria-hidden>
                    ✓
                  </span>
                )}
                <Ref name={`c_item_${it.id}`} className="pick-img" />
                <span className="pick-name">{it.name}</span>
                <span className="pick-sub">{locked ? '(毛糸ぶくろ)' : `約${fmt(targetSteps(it, data.rowSteps))}歩`}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.push({ name: 'pattern', item: sel })}>
          模様を見る
        </button>
      </div>
    </div>
  );
}
