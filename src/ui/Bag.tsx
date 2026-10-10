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
  const price = yen(billing.status === 'ready' && billing.price ? billing.price : BILLING.fallbackPrice);
  const later = () => (pushed ? ctx.pop() : ctx.goTab('home'));

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
      <Ref name="bag" className="bag-art" />
      <h1 className="bag-title">毛糸ぶくろ</h1>
      {pro ? (
        <p className="bag-price-sub">開いています。ありがとうございます。</p>
      ) : (
        <p className="bag-price">
          <span className="num">{price}</span>
          <span className="bag-price-sub">(買い切り)</span>
        </p>
      )}
      <p className="bag-lead">
        もっとたくさんの編みものを
        <br />
        楽しめるようになります
      </p>
      <ul className="bag-list">
        <li>
          <Ref name="bag_icon1" className="bag-icon" />
          <span>
            編めるものが増えます
            <br />
            <span className="bag-small">(セーター・ひざかけ)</span>
          </span>
        </li>
        <li>
          <Ref name="bag_icon2" className="bag-icon" />
          <span>毛糸の色が8組に増えます</span>
        </li>
        <li>
          <Ref name="bag_icon3" className="bag-icon" />
          <span>模様が6つに増えます</span>
        </li>
        <li>
          <Ref name="bag_icon4" className="bag-icon" />
          <span>模様を自分で選べるようになります</span>
        </li>
      </ul>
      {!pro && (
        <div className="bag-foot">
          {billing.status === 'ready' && canBuy(billing) ? (
            <button className="btn btn-primary" onClick={buy} disabled={busy}>
              {busy ? '手続き中' : `${price}で購入する`}
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
