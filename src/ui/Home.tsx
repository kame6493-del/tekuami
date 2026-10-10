import { useEffect, useRef, useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { paletteOf } from '../art/yarns';
import { fmt, labelJa } from '../domain/dates';
import { rowLengths, type Progress } from '../domain/knit';
import { lastNDays } from '../domain/steps';
import { HEALTH_CONNECT_PLAY_URL, openHealthSettings, sensorAvailableOnThisPlatform } from '../platform/health';
import { openUrl, platform, success, tap } from '../platform/native';
import { Cloud, Confetti, IconGear, IconSparkle, KnitStage, Ref } from './parts';

/** 見せた目の数から今の目の数まで、1目ずつ足して見せる */
function useKnitAnimation(target: number, seen: number, onDone: (n: number) => void) {
  const [shown, setShown] = useState(Math.min(seen, target));
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (shown >= target) {
      if (shown > target) setShown(target);
      doneRef.current(target);
      return;
    }
    const gap = target - shown;
    // 多いときは速く。長くても2秒ほどで追いつく
    const step = Math.max(1, Math.ceil(gap / 40));
    const t = window.setTimeout(() => setShown((n) => Math.min(target, n + step)), 50);
    return () => window.clearTimeout(t);
  }, [shown, target]);
  return shown;
}

function rowsOf(item: string, stitches: number): number {
  const lens = rowLengths(itemOf(item));
  let r = 0;
  let left = stitches;
  while (r < lens.length && left >= lens[r]) {
    left -= lens[r];
    r++;
  }
  return r;
}

/** 今週(月曜から今日まで)の歩数 */
export function weekSteps(ctx: AppCtx): number {
  const { data, today } = ctx;
  const dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7;
  return lastNDays(data.days, data.imported, today, dow + 1).reduce((a, d) => a + d.steps, 0);
}

export function Home({ ctx, progress }: { ctx: AppCtx; progress: Progress | null }) {
  const { data, today, health } = ctx;
  const p = data.current;
  const todaySteps = data.days[today] ?? 0;
  const [celebrate, setCelebrate] = useState(0);
  const startRows = useRef(p ? rowsOf(p.item, Math.min(data.seen, progress?.stitches ?? 0)) : 0);
  const shown = useKnitAnimation(progress?.stitches ?? 0, data.seen, (n) => {
    if (!p) return;
    const gained = rowsOf(p.item, n) - startRows.current;
    if (n !== data.seen) {
      if (gained > 0) {
        success();
        setCelebrate(gained);
      }
      ctx.markSeen(n);
    }
    startRows.current = rowsOf(p.item, n);
  });

  const ready = health === 'ready' && !ctx.noData;
  const rowSteps = p?.rowSteps ?? data.rowSteps;
  const toNext = progress && ready ? progress.toNextRow : rowSteps;
  const near = ready && toNext <= 50;
  const rowsShown = p ? rowsOf(p.item, shown) : 0;
  const rowsTotal = progress?.rowsTotal ?? 0;
  const segs = 6;

  return (
    <div className="home">
      <div className="home-scene">
        <Ref name="home_window" className="home-bg" />
        <header className="home-top">
          <span className="home-date">{labelJa(today)}</span>
          <button className="icon-btn home-gear" aria-label="設定" onClick={() => ctx.push({ name: 'settings' })}>
            <IconGear />
          </button>
        </header>

        {celebrate > 0 ? (
          <div className="home-celebrate" aria-live="polite">
            <Confetti />
            <Cloud className="cloud-row">{celebrate === 1 ? '1段編めました!' : `${celebrate}段編めました!`}</Cloud>
          </div>
        ) : (
          <section className="counter" aria-live="polite">
            <p className="counter-label">{p ? '次の段まで' : 'つぎのあみものを'}</p>
            {p ? (
              <p className={`counter-num ${near ? 'is-near' : ''}`}>
                <span className="counter-ato">あと</span>
                <span className="num">{fmt(toNext)}</span>
                <span className="counter-unit">歩</span>
              </p>
            ) : (
              <p className="counter-num">
                <span className="counter-ato">選びましょう</span>
              </p>
            )}
            {near && <IconSparkle className="counter-spark" />}
          </section>
        )}

        <section className="home-work">
          {p && progress ? (
            <KnitStage
              item={p.item}
              palette={p.palette}
              pattern={p.pattern}
              stitches={shown}
              label={`${paletteOf(p.palette).name}の${itemOf(p.item).name}。${progress.rowsTotal}段のうち${progress.rowsDone}段まで編めています`}
            />
          ) : (
            <div className="home-empty">
              <Ref name="empty" className="home-empty-art" />
            </div>
          )}
        </section>
      </div>

      <div className="home-lower">
        {p && progress && (
          <section className="rows" aria-label="段の進み">
            <p className="rows-text num">
              {rowsShown}段 <span className="rows-sep">/</span> {rowsTotal}段
            </p>
            <div className="rows-bar">
              {Array.from({ length: segs }, (_, i) => {
                const frac = shown === progress.stitches ? (progress.rowsDone + progress.inRow / Math.max(1, progress.rowLen)) / Math.max(1, rowsTotal) : rowsShown / Math.max(1, rowsTotal);
                const f = Math.max(0, Math.min(1, frac * segs - i));
                return (
                  <span key={i} className="rows-seg">
                    <span className="rows-fill" style={{ width: `${f * 100}%` }} />
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {celebrate > 0 ? (
          <div className="home-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                tap();
                setCelebrate(0);
              }}
            >
              つぎの段へ
            </button>
            <button className="btn btn-cream" onClick={() => ctx.push({ name: 'share' })}>
              画像で見る
            </button>
          </div>
        ) : !p ? (
          <div className="note-card">
            <p className="note-head">次に編むものを選ぶと、余った歩数から編みはじめます</p>
            <button className="btn btn-primary" onClick={() => ctx.goTab('knit')}>
              あみものを選ぶ
            </button>
          </div>
        ) : (
          <StatePanel ctx={ctx} todaySteps={todaySteps} />
        )}
      </div>
    </div>
  );
}

function StatePanel({ ctx, todaySteps }: { ctx: AppCtx; todaySteps: number }) {
  const { data, health } = ctx;

  if (health === 'checking') return <div className="stat-cards is-quiet" />;

  if (health === 'needsPermission') {
    return (
      <div className="note-card hc-card">
        <div className="hc-icons" aria-hidden>
          <Ref name="icon_health" />
          <span className="hc-dots">・・</span>
          <Ref name="icon_hc" />
        </div>
        <p className="note-text">
          {platform === 'android' ? 'ヘルスコネクト' : 'ヘルスケア'}から歩数を読み取ると、歩いた分だけ編めます。
          <span className="note-small">(書き込みは行いません)</span>
        </p>
        <button className="btn btn-primary" onClick={ctx.connect}>
          連携する
        </button>
        <button className="btn-link" onClick={() => ctx.push({ name: 'privacy' })}>
          詳しく見る
        </button>
      </div>
    );
  }

  if (health === 'notInstalled' || health === 'needsUpdate') {
    return (
      <div className="note-card">
        <p className="note-head">{health === 'needsUpdate' ? 'ヘルスコネクトの更新が要ります' : 'ヘルスコネクトが入っていません'}</p>
        <p className="note-text">入れられない時は、この端末の歩数センサーでも数えられます。</p>
        <div className="btn-pair">
          <button className="btn btn-cream" onClick={() => ctx.useSource('sensor')}>
            センサーを使う
          </button>
          <button className="btn btn-primary" onClick={() => openUrl(HEALTH_CONNECT_PLAY_URL)}>
            {health === 'needsUpdate' ? '更新する' : '入れる'}
          </button>
        </div>
      </div>
    );
  }

  if (health === 'unsupported') {
    return (
      <div className="note-card">
        <p className="note-head">この端末では歩数を読めません</p>
        <p className="note-text">歩数は iPhone か Android のスマホで読めます。ほかの記録アプリの歩数は、設定から読み込めます。</p>
      </div>
    );
  }

  if (health === 'error') {
    return (
      <div className="note-card">
        <p className="note-head">歩数を読めませんでした</p>
        <p className="note-text">少し時間をおいて、もう一度読んでみてください。</p>
        <button className="btn btn-primary" onClick={ctx.refresh}>
          もう一度読む
        </button>
      </div>
    );
  }

  if (health === 'denied' || ctx.noData) {
    const ios = platform === 'ios' || platform === 'web';
    const sensorSwitch = platform === 'android' && data.source !== 'sensor' && sensorAvailableOnThisPlatform();
    return (
      <div className="note-card">
        <p className="note-head">{ctx.noData && health !== 'denied' ? 'まだ歩数が届いていません' : '歩数を読む許可がありません'}</p>
        <p className="note-text">
          {data.source === 'sensor'
            ? '設定のアプリ一覧から「てくあみ」を開き、「身体活動」を許可すると数えはじめます。'
            : ios
              ? 'ヘルスケアのアプリで、自分のアイコン → アプリ → てくあみ と進み、「歩数」をオンにすると届きます。'
              : 'ヘルスコネクトの設定で、てくあみに「歩数」の読み取りを許可すると届きます。'}
        </p>
        <div className="btn-pair">
          {sensorSwitch ? (
            <button className="btn btn-cream" onClick={() => ctx.useSource('sensor')}>
              センサーを使う
            </button>
          ) : (
            <button className="btn btn-cream" onClick={ctx.refresh}>
              読み直す
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={async () => {
              tap();
              if (!(await openHealthSettings())) ctx.toast('設定を開けませんでした');
            }}
          >
            {ios ? 'ヘルスケアを開く' : '設定を開く'}
          </button>
        </div>
      </div>
    );
  }

  // 歩けなかった日: 責めずに、休む絵を出す
  if (todaySteps === 0) {
    return (
      <button className="rest-card" onClick={() => ctx.push({ name: 'record' })}>
        <Ref name="rest" className="rest-art" />
        <span className="rest-text">
          今日はゆっくり休みましょう。
          <br />
          また、ここから編めます。
        </span>
      </button>
    );
  }

  return (
    <button className="stat-cards" onClick={() => ctx.push({ name: 'record' })} aria-label="今日の記録を見る">
      <span className="stat">
        <Ref name="card_steps" className="stat-icon" />
        <span className="stat-body">
          <span className="stat-label">今日の歩数</span>
          <span className="stat-num">
            <span className="num">{fmt(todaySteps)}</span>
            <span className="stat-unit">歩</span>
          </span>
        </span>
      </span>
      <span className="stat-div" aria-hidden />
      <span className="stat">
        <Ref name="card_week" className="stat-icon" />
        <span className="stat-body">
          <span className="stat-label">今週</span>
          <span className="stat-num">
            <span className="num">{fmt(weekSteps(ctx))}</span>
            <span className="stat-unit">歩</span>
          </span>
        </span>
      </span>
    </button>
  );
}
