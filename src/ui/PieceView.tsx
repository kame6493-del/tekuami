import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { patternOf } from '../art/motifs';
import { pieceName } from '../art/shareImage';
import { paletteOf, YARNS } from '../art/yarns';
import { dotJa, fmt } from '../domain/dates';
import { progressOf } from '../domain/knit';
import { tap } from '../platform/native';
import { saveImage } from './Finished';
import { IconBack, IconChevron, KnitPiece, Ref } from './parts';

/** 作品の詳細(見本D・C 6・B)。大きな写真、名前と記録、左右で前後の作品へ */
export function PieceView({ ctx, id }: { ctx: AppCtx; id: string }) {
  const list = [...ctx.data.done].reverse();
  const idx = list.findIndex((d) => d.id === id);
  const p = list[idx];
  if (!p) {
    return (
      <div className="page">
        <button className="back" aria-label="戻る" onClick={ctx.pop}>
          <IconBack />
        </button>
        <p className="piece-missing">見つかりませんでした。</p>
      </div>
    );
  }
  const item = itemOf(p.item);
  const pal = paletteOf(p.palette);
  const pr = progressOf(p, p.startTotal + 1e9);
  const go = (d: number) => {
    const n = list[(idx + d + list.length) % list.length];
    if (!n) return;
    tap();
    ctx.replace({ name: 'piece', id: n.id });
  };
  return (
    <div className="detail">
      <div className="detail-photo wood-bg">
        <button className="back back-round" aria-label="戻る" onClick={ctx.pop}>
          <IconBack />
        </button>
        <div className="detail-art">
          <KnitPiece item={p.item} palette={p.palette} pattern={p.pattern} label={pieceName(p)} />
        </div>
        {list.length > 1 && (
          <>
            <button className="detail-nav detail-prev" aria-label="前の作品" onClick={() => go(-1)}>
              <IconChevron />
            </button>
            <button className="detail-nav detail-next" aria-label="次の作品" onClick={() => go(1)}>
              <IconChevron />
            </button>
          </>
        )}
        <span className="detail-count num">
          {idx + 1} / {list.length}
        </span>
      </div>
      <div className="detail-card">
        <h1 className="detail-name">{pieceName(p)}</h1>
        <p className="detail-date num">{p.finishedOn ? `${dotJa(p.finishedOn)} 完成` : ''}</p>
        <dl className="detail-rows">
          <div>
            <dt>歩数</dt>
            <dd className="num">{fmt(pr.target)}歩</dd>
          </div>
          <div>
            <dt>段数</dt>
            <dd className="num">{pr.rowsTotal}段</dd>
          </div>
          <div>
            <dt>サイズ</dt>
            <dd>{item.size}</dd>
          </div>
          <div>
            <dt>模様</dt>
            <dd className="detail-pattern">
              <Ref name={`tile_${patternOf(p.pattern).id}`} className="detail-tile" />
              {patternOf(p.pattern).name}
            </dd>
          </div>
          <div>
            <dt>毛糸</dt>
            <dd>
              {pal.name}
              <span className="yarn-dot" style={{ background: YARNS[pal.sub][2] }} />
              <span className="yarn-dot" style={{ background: YARNS[pal.main][2] }} />
            </dd>
          </div>
        </dl>
        <p className="detail-note">{item.note}</p>
        <div className="detail-actions">
          <button className="btn btn-primary" onClick={() => saveImage(ctx, p)}>
            画像を保存
          </button>
          <button className="btn btn-cream btn-icon" aria-label="画像で見る・シェア" onClick={() => ctx.push({ name: 'share', id: p.id })}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 15 V3" />
              <path d="M7 8 L12 3 L17 8" />
              <path d="M5 12 V20 H19 V12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
