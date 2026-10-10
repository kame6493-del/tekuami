import { useState } from 'react';
import type { AppCtx } from '../App';
import { ITEMS } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { tap } from '../platform/native';
import { IconLock, PageHead, Ref } from './parts';

/** 集めた組(編む物×模様)の数 */
export function collected(ctx: AppCtx): Set<string> {
  return new Set(ctx.data.done.map((p) => `${p.item}:${p.pattern}`));
}

/**
 * 図鑑(見本B のタブ「図鑑」)。編む物ごとに12の模様を並べ、編み上がった組は模様の絵、まだの組は「?」。
 * 何の模様かは、編み上がるまで名前も出さない。
 */
export function Zukan({ ctx }: { ctx: AppCtx }) {
  const [item, setItem] = useState(ITEMS[0].id);
  const got = collected(ctx);
  const total = ITEMS.length * PATTERNS.length;
  const inItem = PATTERNS.filter((p) => got.has(`${item}:${p.id}`)).length;
  return (
    <div className="page zukan">
      <PageHead title="図鑑" sub={`あつめた模様 ${got.size} / ${total}`} />
      <div className="chips" role="radiogroup" aria-label="編むもの">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            role="radio"
            aria-checked={item === it.id}
            className={`chip ${item === it.id ? 'is-on' : ''}`}
            onClick={() => {
              tap();
              setItem(it.id);
            }}
          >
            {it.short}
          </button>
        ))}
      </div>
      <div className="zukan-head">
        <Ref name={`c_item_${item}`} className="zukan-item" />
        <p>
          <span className="num zukan-count">
            {inItem} / {PATTERNS.length}
          </span>
          <br />
          編み上げた模様
        </p>
      </div>
      <ul className="zukan-grid">
        {PATTERNS.map((pt) => {
          const has = got.has(`${item}:${pt.id}`);
          const it = ITEMS.find((i) => i.id === item)!;
          return (
            <li key={pt.id} className={`zukan-cell ${has ? 'is-got' : ''}`}>
              {has ? <Ref name={`tile_${pt.id}`} className="zukan-art" /> : <Ref name="b_question" className="zukan-art zukan-q" />}
              <span className="zukan-name">{has ? pt.name : '???'}</span>
              {!has && (pt.pro || it.pro) && !ctx.pro && (
                <span className="color-lock" aria-label="毛糸ぶくろで編めます">
                  <IconLock size={11} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.push({ name: 'pick' })}>
          次に編むものを選ぶ
        </button>
      </div>
    </div>
  );
}
