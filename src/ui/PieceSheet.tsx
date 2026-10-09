import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { patternOf } from '../art/motifs';
import { pieceTitle, renderShareImage, shareText } from '../art/shareImage';
import { daysBetween, fmt, labelJa } from '../domain/dates';
import { progressOf } from '../domain/knit';
import { shareImage, tap } from '../platform/native';
import { FinishedFill } from './Pixel';

export function PieceSheet({ ctx, id }: { ctx: AppCtx; id: string }) {
  const p = ctx.data.done.find((d) => d.id === id);
  if (!p) return <p className="panel-text">見つかりませんでした。</p>;
  const item = itemOf(p.item);
  const days = Math.max(1, daysBetween(p.startedOn, p.finishedOn ?? p.startedOn) + 1);
  const share = async () => {
    tap();
    const pr = progressOf(p, p.startTotal + item.steps);
    try {
      const r = await shareImage(renderShareImage(p, pr, p.finishedOn ?? ctx.today), shareText(p, pr), `tekuami-${p.id}.png`);
      if (r === 'saved') ctx.toast('画像を保存しました');
    } catch {
      ctx.toast('画像を作れませんでした');
    }
  };
  return (
    <div className="piece">
      <h2 className="sheet-title">{pieceTitle(p)}</h2>
      <div className="piece-art">
        <FinishedFill item={p.item} palette={p.palette} pattern={p.pattern} label={pieceTitle(p)} />
      </div>
      <dl className="facts">
        <div>
          <dt>模様</dt>
          <dd>{patternOf(p.pattern).name}</dd>
        </div>
        <div>
          <dt>かかった日数</dt>
          <dd className="num">{days}日</dd>
        </div>
        <div>
          <dt>歩数</dt>
          <dd className="num">{fmt(item.steps)}歩</dd>
        </div>
        <div>
          <dt>編み上がった日</dt>
          <dd>{p.finishedOn ? labelJa(p.finishedOn) : ''}</dd>
        </div>
      </dl>
      <button className="btn btn-primary" onClick={share}>
        見せる
      </button>
    </div>
  );
}
