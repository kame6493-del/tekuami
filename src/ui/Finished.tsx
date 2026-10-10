import { useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { patternOf } from '../art/motifs';
import { renderShareImage, shareText } from '../art/shareImage';
import { daysBetween, fmt, mdJa } from '../domain/dates';
import { progressOf, type Project } from '../domain/knit';
import { shareImage, tap } from '../platform/native';
import { Cloud, Confetti, KnitPiece, Ref } from './parts';

/** 札(模様・編んだ期間・合計歩数)。編み上がりと、箱の1枚で使う */
export function Tag({ p, today }: { p: Project; today: string }) {
  const end = p.finishedOn ?? today;
  const days = Math.max(1, daysBetween(p.startedOn, end) + 1);
  const pat = patternOf(p.pattern);
  const steps = progressOf(p, p.startTotal + 1e9).target;
  return (
    <div className="tag">
      <span className="tag-hole" aria-hidden />
      <dl>
        <div className="tag-row">
          <dt>模様</dt>
          <dd className="tag-motif">
            <Ref name={`motif_${pat.id}`} className="tag-motif-art" />
            {pat.name}
          </dd>
        </div>
        <div className="tag-row">
          <dt>編んだ期間</dt>
          <dd>
            <span className="tag-nowrap">{mdJa(p.startedOn)} 〜</span> <span className="tag-nowrap">{mdJa(end)}</span>
            <span className="tag-small">({days}日間)</span>
          </dd>
        </div>
        <div className="tag-row">
          <dt>合計歩数</dt>
          <dd className="tag-big">
            <span className="num">{fmt(steps)}</span>
            <span className="tag-unit">歩</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export async function saveImage(ctx: AppCtx, p: Project) {
  tap();
  try {
    const pr = progressOf(p, ctx.cumulative);
    const url = await renderShareImage(p, pr, p.finishedOn ?? ctx.today);
    const r = await shareImage(url, shareText(p, pr), `tekuami-${p.finishedOn ?? ctx.today}.png`);
    if (r === 'saved') ctx.toast('画像を保存しました');
  } catch {
    ctx.toast('画像を作れませんでした');
  }
}

/** 編み上がり(見本4)。木の床に仕上がった物と札 */
export function Finished({ ctx }: { ctx: AppCtx }) {
  const p = ctx.data.current!;
  const item = itemOf(p.item);
  const [busy, setBusy] = useState(false);
  return (
    <div className="finished wood-bg">
      <Confetti n={24} />
      <Cloud className="cloud-done">
        {item.name}が
        <br />
        編み上がりました!
      </Cloud>
      <div className="finished-main">
        <div className="finished-art">
          <KnitPiece item={p.item} palette={p.palette} pattern={p.pattern} label={`編み上がった${item.name}`} />
        </div>
        <Tag p={p} today={ctx.today} />
      </div>
      <div className="finished-actions">
        <button className="btn btn-primary" onClick={ctx.finishCurrent}>
          箱にしまう
        </button>
        <button
          className="btn btn-cream"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await saveImage(ctx, p);
            setBusy(false);
          }}
        >
          画像で保存
        </button>
      </div>
    </div>
  );
}
