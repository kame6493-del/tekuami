import type { AppCtx } from '../App';
import { pieceTitle } from '../art/shareImage';
import { shortJa } from '../domain/dates';
import { FinishedFill } from './Pixel';

export function Box({ ctx }: { ctx: AppCtx }) {
  const done = [...ctx.data.done].reverse();
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">箱</h1>
        {done.length > 0 && <span className="page-sub num">{done.length}つ</span>}
      </header>
      {done.length === 0 ? (
        <div className="empty">
          <p className="empty-head">まだ空っぽです</p>
          <p className="empty-text">1枚目が編み上がると、ここにしまえます。編んだ物はずっと残ります。</p>
        </div>
      ) : (
        <ul className="grid">
          {done.map((p) => (
            <li key={p.id}>
              <button className="tile" onClick={() => ctx.open({ kind: 'piece', id: p.id })}>
                <span className="tile-art">
                  <FinishedFill item={p.item} palette={p.palette} pattern={p.pattern} label={pieceTitle(p)} room={0.92} />
                </span>
                <span className="tile-name">{pieceTitle(p)}</span>
                <span className="tile-date num">{p.finishedOn ? shortJa(p.finishedOn) : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
