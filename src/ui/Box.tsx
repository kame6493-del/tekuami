import { useState } from 'react';
import type { AppCtx } from '../App';
import { ITEMS, itemOf } from '../art/items';
import { ref } from '../art/ref';
import { dotJa } from '../domain/dates';
import { tap } from '../platform/native';
import { KnitPiece, Ref } from './parts';

/** 箱(見本5)。木の棚に編んだ物が並ぶ。まだの所は「?」の空き枠 */
export function Box({ ctx }: { ctx: AppCtx }) {
  const [filter, setFilter] = useState<string>('all');
  const all = [...ctx.data.done].reverse();
  const done = filter === 'all' ? all : all.filter((p) => p.item === filter);
  const cur = ctx.data.current;
  const showCur = !!cur && (filter === 'all' || cur.item === filter);
  const filled = done.length + (showCur ? 1 : 0);
  const slots = Math.max(6, Math.ceil((filled + 1) / 3) * 3);
  const empties = slots - filled;
  const chips = [{ id: 'all', label: 'すべて' }, ...ITEMS.map((i) => ({ id: i.id, label: i.short }))];

  return (
    <div className="box">
      <header className="box-head">
        <Ref name="plant_l" className="box-plant-l" />
        <Ref name="plant_r" className="box-plant-r" />
        <Ref name="chest" className="box-chest" />
        <div>
          <h1 className="box-title">わたしの箱</h1>
          <p className="box-sub">編みあがったものが ずっと残ります</p>
        </div>
      </header>

      <div className="chips" role="radiogroup" aria-label="絞り込み">
        {chips.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={filter === c.id}
            className={`chip ${filter === c.id ? 'is-on' : ''}`}
            onClick={() => {
              tap();
              setFilter(c.id);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {all.length === 0 ? (
        <EmptyBox ctx={ctx} />
      ) : (
        <div className="shelf" style={{ ['--shelf-back' as string]: `url(${ref('shelf_back')})`, ['--shelf-board' as string]: `url(${ref('shelf_board')})` }}>
          <ul className="shelf-grid">
            {done.map((p) => (
              <li key={p.id} className="slot">
                <button className="slot-btn" onClick={() => ctx.push({ name: 'piece', id: p.id })}>
                  <span className="slot-art">
                    <KnitPiece item={p.item} palette={p.palette} pattern={p.pattern} label={itemOf(p.item).name} />
                  </span>
                  <span className="slot-name">{itemOf(p.item).name}</span>
                  <span className="slot-date num">{p.finishedOn ? dotJa(p.finishedOn) : ''}</span>
                </button>
              </li>
            ))}
            {showCur && cur && (
              <li className="slot">
                <button className="slot-btn slot-wip" onClick={() => ctx.goTab('home')}>
                  <span className="slot-q" aria-hidden>
                    ?
                  </span>
                  <span className="slot-name">編み中…</span>
                  <span className="slot-date">{itemOf(cur.item).name}</span>
                </button>
              </li>
            )}
            {Array.from({ length: empties }, (_, i) => (
              <li key={`e${i}`} className="slot">
                <span className="slot-empty" aria-label="まだ空いています">
                  ?
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 空の状態(見本の部品): かごの絵と、はじめのマフラーへの案内 */
export function EmptyBox({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="empty-card">
      <Ref name="empty" className="empty-art" />
      <p className="empty-head">まだ編んだものがありません</p>
      <p className="empty-text">{ctx.data.current ? '編み上がると、ここに並びます' : '歩いて、はじめのマフラーを編んでみましょう'}</p>
      <button className="btn btn-primary" onClick={() => (ctx.data.current ? ctx.goTab('home') : ctx.push({ name: 'pick' }))}>
        {ctx.data.current ? '編みかけを見る' : '次に編むものを選ぶ'}
      </button>
    </div>
  );
}
