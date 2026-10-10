import type { AppCtx } from '../App';
import { ITEMS, itemOf } from '../art/items';
import { fmt } from '../domain/dates';
import { targetSteps } from '../domain/knit';
import { IconChevron, IconLock, PageHead, Ref } from './parts';

/** 次に編むものを選ぶ(見本7) */
export function Pick({ ctx }: { ctx: AppCtx }) {
  const { pro, data } = ctx;
  const made = new Set(data.done.map((p) => p.item));
  const rec = ITEMS.find((i) => (pro || !i.pro) && !made.has(i.id))?.id ?? 'muffler';
  const cur = data.current;
  return (
    <div className="page pick">
      <PageHead title="次に編むものを選ぶ" />
      {cur && (
        <p className="pick-note">
          いまは{itemOf(cur.item).name}を編んでいます。
          {data.queued ? `次は${itemOf(data.queued.item).name}に決まっています。` : '選んでおくと、編み上がったあと続けて編みはじめます。'}
        </p>
      )}
      <ul className="pick-list">
        {ITEMS.map((it) => {
          const locked = it.pro && !pro;
          const isRec = it.id === rec && !locked;
          return (
            <li key={it.id}>
              <button
                className={`pick-card ${isRec ? 'is-rec' : ''} ${locked ? 'is-locked' : ''}`}
                onClick={() => (locked ? ctx.push({ name: 'bag' }) : ctx.push({ name: 'pattern', item: it.id }))}
              >
                <Ref name={`item_${it.id}`} className="pick-art" />
                <span className="pick-text">
                  <span className="pick-name">{it.name}</span>
                  {locked ? (
                    <span className="pick-sub">(毛糸ぶくろで追加)</span>
                  ) : isRec ? (
                    <span className="pick-rec">(おすすめ)</span>
                  ) : (
                    <span className="pick-sub num">約{fmt(targetSteps(it, data.rowSteps))}歩</span>
                  )}
                </span>
                {locked ? (
                  <span className="pick-lock" aria-label="毛糸ぶくろで開きます">
                    <IconLock />
                  </span>
                ) : (
                  <span className="pick-chev">
                    <IconChevron />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
