import { useState } from 'react';
import type { AppCtx } from '../App';
import { BILLING, canBuy, loadBilling, purchase, restore } from '../platform/billing';
import { success, tap } from '../platform/native';
import { PageHead, Ref } from './parts';

/** ¥480 → 480円(ストアの表示が円記号のときだけ) */
export function yen(price: string): string {
  const m = /^[¥￥]\s*([\d,]+)$/.exec(price.trim());
  return m ? `${m[1]}円` : price;
}

/** 毛糸ぶくろ(見本12)。買い切り */
export function Bag({ ctx, pushed }: { ctx: AppCtx; pushed?: boolean }) {
  const { billing, pro } = ctx;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const price = billing.status === 'ready' && billing.price ? billing.price : BILLING.fallbackPrice;
  const later = () => (pushed ? ctx.pop() : ctx.goTab('home'));
  void yen;

  const buy = async () => {
    tap();
    setBusy(true);
    setMsg(null);
    try {
      const ok = await purchase(billing);
      if (ok) {
        success();
        ctx.setBilling(await loadBilling());
        ctx.toast('毛糸ぶくろを開きました');
        if (pushed) ctx.pop();
      }
    } catch (e) {
      console.error('[tekuami] purchase', e);
      setMsg('購入できませんでした。時間をおいてもう一度どうぞ。');
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    tap();
    setBusy(true);
    setMsg(null);
    try {
      const ok = await restore();
      if (ok) {
        ctx.setBilling(await loadBilling());
        ctx.toast('毛糸ぶくろを戻しました');
      } else setMsg('この Apple ID / Google アカウントでの購入は見つかりませんでした。');
    } catch {
      setMsg('ストアにつながりませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page bag">
      {pushed ? <PageHead title="" onBack={ctx.pop} /> : <div className="bag-top-gap" />}
      <Ref name="c_bag" className="bag-art" />
      <h1 className="bag-title">毛糸ぶくろ</h1>
      {pro ? (
        <p className="bag-price-sub">開いています。ありがとうございます。</p>
      ) : (
        <p className="bag-price">
          <span className="num">{price}</span>
          <span className="bag-price-sub">(買い切り・広告なし)</span>
        </p>
      )}
      <p className="bag-lead">
        もっと、いろんなあみものを。
        <br />
        歩くたのしみが、もっと広がります。
      </p>
      <ul className="bag-list">
        {[
          ['編めるものが増えます', 'くつした・セーター・ひざかけ'],
          ['毛糸の色 8組 追加', 'さくらもち・ねこやなぎ・マスタード など'],
          ['模様 6つ 追加', '木の実・ねこ・いぬ・北欧風・うさぎ・お花'],
          ['好きな模様をえらべるように', ''],
        ].map(([h, sub]) => (
          <li key={h}>
            <span className="bag-check" aria-hidden>
              ✓
            </span>
            <span>
              {h}
              {sub && (
                <>
                  <br />
                  <span className="bag-small">{sub}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!pro && (
        <div className="bag-foot">
          {billing.status === 'ready' && canBuy(billing) ? (
            <button className="btn btn-primary" onClick={buy} disabled={busy}>
              {busy ? '手続き中' : '購入する'}
            </button>
          ) : (
            <button className="btn btn-primary" disabled>
              {billing.status === 'unavailable' ? billing.reason : '購入は準備中です'}
            </button>
          )}
          {msg && (
            <p className="bag-msg" role="alert">
              {msg}
            </p>
          )}
          <div className="bag-links">
            <button className="btn-link" onClick={later}>
              あとで
            </button>
            <button className="btn-link" onClick={doRestore} disabled={busy}>
              購入を復元する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
