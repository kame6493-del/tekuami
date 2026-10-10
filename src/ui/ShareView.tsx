import { useEffect, useState } from 'react';
import type { AppCtx } from '../App';
import { renderShareImage, SHARE_STYLES, shareText, type ShareStyle } from '../art/shareImage';
import { progressOf } from '../domain/knit';
import { shareImage, tap } from '../platform/native';
import { IconBack } from './parts';

/** 画像で見る(見本B・C 14・D)。完成した物は ポラロイド/椅子に掛けて/雪の上 から選べる */
export function ShareView({ ctx, id }: { ctx: AppCtx; id?: string }) {
  const p = id ? ctx.data.done.find((d) => d.id === id) : ctx.data.current;
  const [style, setStyle] = useState<ShareStyle>('polaroid');
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const pr = p ? progressOf(p, id ? p.startTotal + 1e9 : ctx.cumulative) : null;
  const done = !!pr?.done;
  useEffect(() => {
    if (!p || !pr) return;
    let alive = true;
    setUrl(null);
    renderShareImage(p, pr, p.finishedOn ?? ctx.today, style)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p?.id, pr?.stitches, style]);

  const send = async (mode: 'save' | 'share') => {
    if (!p || !pr || !url) return;
    tap();
    try {
      const r = await shareImage(url, mode === 'share' ? shareText(p, pr) : '', `tekuami-${p.finishedOn ?? ctx.today}.png`);
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
      {done && (
        <div className="chips chips-wood" role="radiogroup" aria-label="画像の見た目">
          {SHARE_STYLES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={style === s.id}
              className={`chip ${style === s.id ? 'is-on' : ''}`}
              onClick={() => {
                tap();
                setStyle(s.id);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="share-frame">
        {url ? <img className="share-img" src={url} alt="共有用の画像" /> : <p className="share-wait">{failed || !p ? '画像を作れませんでした' : '画像を作っています'}</p>}
      </div>
      <div className="share-actions">
        <button className="btn btn-primary" onClick={() => send('save')} disabled={!url}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3 V15" />
            <path d="M7 10 L12 15 L17 10" />
            <path d="M5 20 H19" />
          </svg>
          保存
        </button>
        <button className="btn btn-cream" onClick={() => send('share')} disabled={!url}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.3 10.8 L15.7 6.2 M8.3 13.2 L15.7 17.8" />
          </svg>
          シェア
        </button>
      </div>
      <p className="share-note">シェアには #てくあみ の一言がつきます</p>
    </div>
  );
}
