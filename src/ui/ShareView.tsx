import { useEffect, useState } from 'react';
import type { AppCtx } from '../App';
import { renderShareImage, shareText } from '../art/shareImage';
import { progressOf } from '../domain/knit';
import { shareImage, tap } from '../platform/native';
import { IconBack } from './parts';

/** 画像で見る(見本6)。ポラロイド風のカードを作って見せ、保存・共有する */
export function ShareView({ ctx, id }: { ctx: AppCtx; id?: string }) {
  const p = id ? ctx.data.done.find((d) => d.id === id) : ctx.data.current;
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const pr = p ? progressOf(p, id ? p.startTotal + 1e9 : ctx.cumulative) : null;
  useEffect(() => {
    if (!p || !pr) return;
    let alive = true;
    renderShareImage(p, pr, p.finishedOn ?? ctx.today)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, pr?.stitches]);

  const send = async () => {
    if (!p || !pr || !url) return;
    tap();
    try {
      const r = await shareImage(url, shareText(p, pr), `tekuami-${p.finishedOn ?? ctx.today}.png`);
      if (r === 'saved') ctx.toast('画像を保存しました');
    } catch {
      ctx.toast('画像を保存できませんでした');
    }
  };

  return (
    <div className="share wood-bg">
      <button className="back back-on-wood" aria-label="戻る" onClick={ctx.pop}>
        <IconBack />
      </button>
      <div className="share-frame">
        {url ? <img className="share-img" src={url} alt="共有用の画像" /> : <p className="share-wait">{failed || !p ? '画像を作れませんでした' : '画像を作っています'}</p>}
      </div>
      <div className="share-actions">
        <button className="btn btn-primary" onClick={send} disabled={!url}>
          画像で保存・シェア
        </button>
        <p className="share-note">#てくあみ の一言がつきます</p>
      </div>
    </div>
  );
}
