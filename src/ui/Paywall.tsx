import { useState } from 'react';
import type { AppCtx } from '../App';
import { PALETTES } from '../art/yarns';
import { canBuy, loadBilling, purchase, restore } from '../platform/billing';
import { success, tap } from '../platform/native';
import { Ball, Finished } from './Pixel';

/** 毛糸ぶくろ(買い切り)。開くものを絵で見せて、値段はボタンの中だけに出す */
export function Paywall({ ctx }: { ctx: AppCtx }) {
  const { billing, pro } = ctx;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const proPalettes = PALETTES.filter((p) => p.pro);

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
        ctx.close();
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
        ctx.close();
      } else setMsg('この Apple ID / Google アカウントでの購入は見つかりませんでした。');
    } catch {
      setMsg('ストアにつながりませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="paywall">
      <h2 className="sheet-title">毛糸ぶくろ</h2>
      <p className="sheet-lead">1回買えば、ずっと使えます。広告もサブスクもありません。</p>

      <div className="pw-items" aria-hidden>
        {['sock', 'sweater', 'blanket'].map((id, i) => (
          <span key={id} className="pw-art">
            <Finished item={id} palette={proPalettes[i * 2].id} pattern="plain" max={{ w: 96, h: 84 }} label="" />
          </span>
        ))}
      </div>

      <ul className="pw-list">
        <li>
          <strong>編む物が3つ増えます</strong>
          <span>くつした・セーター・ひざかけ</span>
        </li>
        <li>
          <strong>毛糸の色が8組増えます</strong>
          <span className="pw-balls">
            {proPalettes.map((p) => (
              <Ball key={p.id} palette={p.id} scale={1} />
            ))}
          </span>
        </li>
        <li>
          <strong>模様が6つ増えて、選べるようになります</strong>
          <span>ねこ・ひし形・北欧の星・なみ・どんぐり・十字</span>
        </li>
      </ul>

      <div className="sheet-foot">
        {pro ? (
          <p className="pw-owned">毛糸ぶくろは開いています。</p>
        ) : billing.status === 'ready' && canBuy(billing) ? (
          <button className="btn btn-primary" onClick={buy} disabled={busy}>
            {busy ? '手続き中' : `${billing.price || '値段を確認中'}で開く`}
          </button>
        ) : (
          <button className="btn btn-primary" disabled>
            {billing.status === 'unavailable' ? billing.reason : '購入は準備中です'}
          </button>
        )}
        {msg && (
          <p className="pw-msg" role="alert">
            {msg}
          </p>
        )}
        {!pro && (
          <button className="btn btn-text" onClick={doRestore} disabled={busy}>
            購入を復元する
          </button>
        )}
      </div>
    </div>
  );
}
