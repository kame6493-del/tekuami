import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { patternOf } from '../art/motifs';
import { paletteOf } from '../art/yarns';
import { fmt } from '../domain/dates';
import { targetSteps } from '../domain/knit';
import { KnitPiece, PageHead } from './parts';

/** 完成イメージ(見本C 10)。選んだ色と模様で、編み上がりの姿を見せる → この内容で編む */
export function Preview({ ctx, item, palette, pattern }: { ctx: AppCtx; item: string; palette: string; pattern?: string }) {
  const reserve = !!ctx.data.current && ctx.data.onboarded;
  const it = itemOf(item);
  return (
    <div className="page preview">
      <PageHead title="完成イメージ" onBack={ctx.pop} />
      <div className="preview-art">
        <KnitPiece item={item} palette={palette} pattern={pattern ?? 'plain'} label={`${paletteOf(palette).name}の${it.name}の完成イメージ`} />
        {!pattern && (
          <span className="preview-q" aria-hidden>
            ?
          </span>
        )}
      </div>
      <dl className="preview-facts">
        <div>
          <dt>編むもの</dt>
          <dd>{it.name}</dd>
        </div>
        <div>
          <dt>毛糸</dt>
          <dd>{paletteOf(palette).name}</dd>
        </div>
        <div>
          <dt>模様</dt>
          <dd>{pattern ? patternOf(pattern).name : 'おたのしみ(編み上がるまで秘密)'}</dd>
        </div>
        <div>
          <dt>仕上がりまで</dt>
          <dd className="num">約{fmt(targetSteps(it, ctx.data.rowSteps))}歩</dd>
        </div>
      </dl>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => ctx.choose({ item, palette, ...(pattern ? { pattern } : {}) })}>
          {reserve ? 'この内容で次に編む' : 'この内容で編む'}
        </button>
      </div>
    </div>
  );
}
