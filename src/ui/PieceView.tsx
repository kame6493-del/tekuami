import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { saveImage, Tag } from './Finished';
import { IconBack, KnitPiece } from './parts';

/** 箱の1枚を大きく見る。編み上がりの画面と同じ並び */
export function PieceView({ ctx, id }: { ctx: AppCtx; id: string }) {
  const p = ctx.data.done.find((d) => d.id === id);
  return (
    <div className="finished wood-bg">
      <button className="back back-on-wood" aria-label="戻る" onClick={ctx.pop}>
        <IconBack />
      </button>
      {p ? (
        <>
          <h1 className="piece-title">{itemOf(p.item).name}</h1>
          <div className="finished-main">
            <div className="finished-art">
              <KnitPiece item={p.item} palette={p.palette} pattern={p.pattern} label={itemOf(p.item).name} />
            </div>
            <Tag p={p} today={ctx.today} />
          </div>
          <div className="finished-actions">
            <button className="btn btn-primary" onClick={() => ctx.push({ name: 'share', id: p.id })}>
              画像で見る
            </button>
            <button className="btn btn-cream" onClick={() => saveImage(ctx, p)}>
              画像で保存
            </button>
          </div>
        </>
      ) : (
        <p className="piece-missing">見つかりませんでした。</p>
      )}
    </div>
  );
}
