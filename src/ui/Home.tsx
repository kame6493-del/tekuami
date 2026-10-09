import { useEffect, useRef, useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { patternOf } from '../art/motifs';
import { pieceTitle, renderShareImage, shareText } from '../art/shareImage';
import { fmt, labelJa, timeJa } from '../domain/dates';
import { rowLengths, type Progress } from '../domain/knit';
import { HEALTH_CONNECT_PLAY_URL, openHealthSettings, readerFor, sensorAvailableOnThisPlatform } from '../platform/health';
import { openUrl, platform, shareImage, success, tap } from '../platform/native';
import { IconGear, IconRefresh } from './icons';
import { FinishedFill, Stage } from './Pixel';

/** 見せた目の数から今の目の数まで、1目ずつ足して見せる */
function useKnitAnimation(target: number, seen: number, onDone: (n: number) => void) {
  const [shown, setShown] = useState(Math.min(seen, target));
  const [frame, setFrame] = useState(0);
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
    const t = window.setTimeout(() => {
      setShown((n) => Math.min(target, n + step));
      setFrame((f) => 1 - f);
    }, 50);
    return () => window.clearTimeout(t);
  }, [shown, target]);
  return { shown, frame: shown < target ? frame : 0 };
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

export function Home({ ctx, progress }: { ctx: AppCtx; progress: Progress | null }) {
  const { data, today, health } = ctx;
  const p = data.current;
  const todaySteps = data.days[today] ?? 0;
  const startRows = useRef(p ? rowsOf(p.item, Math.min(data.seen, progress?.stitches ?? 0)) : 0);
  const { shown, frame } = useKnitAnimation(progress?.stitches ?? 0, data.seen, (n) => {
    if (!p) return;
    const gained = rowsOf(p.item, n) - startRows.current;
    if (n !== data.seen) {
      if (gained > 0) {
        success();
        ctx.toast(`前に開いたときから ${gained}段 編めました`);
      }
      ctx.markSeen(n);
    }
    startRows.current = rowsOf(p.item, n);
  });

  const reader = readerFor(data.source);
  const ready = health === 'ready' && !ctx.noData;

  const share = async () => {
    if (!p || !progress) return;
    tap();
    try {
      const url = renderShareImage(p, progress, today);
      const r = await shareImage(url, shareText(p, progress), `tekuami-${today}.png`);
      if (r === 'saved') ctx.toast('画像を保存しました');
    } catch {
      ctx.toast('画像を作れませんでした');
    }
  };

  return (
    <div className="home">
      <header className="topbar">
        <span className="topbar-date">{labelJa(today)}</span>
        <button className="icon-btn" aria-label="設定" onClick={() => ctx.open({ kind: 'settings' })}>
          <IconGear />
        </button>
      </header>

      <section className="hero" aria-live="polite">
        <p className="hero-label">今日の歩数</p>
        {ready || todaySteps > 0 ? (
          <p className="hero-num">
            <span className="num">{fmt(todaySteps)}</span>
            <span className="unit">歩</span>
          </p>
        ) : (
          <p className="hero-num">
            <span className="hero-wait">まだ読んでいません</span>
          </p>
        )}
        {p && progress && ready && !progress.done && (
          <p className="hero-next">
            次の段まで あと <strong className="num">{fmt(progress.toNextRow)}</strong>歩
          </p>
        )}
        {p && progress?.done && <p className="hero-next">編み上がりました</p>}
      </section>

      <section className="work">
        {p && progress ? (
          <>
            <p className="work-title">{pieceTitle(p)}</p>
            {progress.done ? (
              <FinishedFill item={p.item} palette={p.palette} pattern={p.pattern} label={`${pieceTitle(p)}。編み上がり`} room={0.86} />
            ) : (
              <Stage
                item={p.item}
                palette={p.palette}
                pattern={p.pattern}
                stitches={shown}
                rowsDone={rowsOf(p.item, shown)}
                frame={frame}
                label={`${pieceTitle(p)}。${progress.rowsTotal}段のうち${progress.rowsDone}段まで編めています`}
              />
            )}
          </>
        ) : (
          <div className="work-empty">
            <p>次に編む物を選ぶと、余った歩数の分から編みはじめます。</p>
          </div>
        )}
      </section>

      {p && progress && !progress.done && (
        <section className="meter" aria-label="仕上がりまで">
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${(progress.steps / progress.target) * 100}%` }} />
          </div>
          <div className="meter-row">
            <span className="num">
              {progress.rowsDone} / {progress.rowsTotal}段
            </span>
            <span>
              仕上がりまで <span className="num">{fmt(progress.toFinish)}</span>歩
            </span>
          </div>
        </section>
      )}

      <section className="action">
        <ActionPanel ctx={ctx} progress={progress} reader={reader.label} onShare={share} />
      </section>
    </div>
  );
}

function ActionPanel({ ctx, progress, reader, onShare }: { ctx: AppCtx; progress: Progress | null; reader: string; onShare: () => void }) {
  const { data, health } = ctx;
  const p = data.current;

  if (!p) {
    return (
      <div className="panel">
        <button className="btn btn-primary" onClick={() => ctx.open({ kind: 'next' })}>
          次に編む物を選ぶ
        </button>
      </div>
    );
  }

  if (progress?.done) {
    return (
      <div className="panel">
        <p className="panel-text">
          模様は「{patternOf(p.pattern).name}」でした。
        </p>
        <div className="btn-row">
          <button className="btn btn-quiet" onClick={onShare}>
            見せる
          </button>
          <button className="btn btn-primary" onClick={ctx.finishCurrent}>
            箱にしまって次へ
          </button>
        </div>
      </div>
    );
  }

  if (health === 'checking') return <div className="panel panel-quiet" />;

  if (health === 'needsPermission') {
    return (
      <div className="panel">
        <p className="panel-head">歩数をつなぐと、編みはじめます</p>
        <p className="panel-text">{reader}の歩数を読むだけです。書きこみも、外へ送ることもしません。</p>
        <button className="btn btn-primary" onClick={ctx.connect}>
          {reader}とつなぐ
        </button>
      </div>
    );
  }

  if (health === 'notInstalled' || health === 'needsUpdate') {
    return (
      <div className="panel">
        <p className="panel-head">{health === 'needsUpdate' ? 'ヘルスコネクトの更新が要ります' : 'ヘルスコネクトが入っていません'}</p>
        <p className="panel-text">歩数はヘルスコネクトから読みます。入れられない時は、この端末の歩数センサーでも数えられます。</p>
        <div className="btn-row">
          <button className="btn btn-quiet" onClick={() => ctx.useSource('sensor')}>
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
      <div className="panel">
        <p className="panel-head">この端末では歩数を読めません</p>
        <p className="panel-text">歩数は iPhone か Android のスマホで読めます。別の記録アプリの歩数は、設定から読み込めます。</p>
      </div>
    );
  }

  if (health === 'error') {
    return (
      <div className="panel">
        <p className="panel-head">歩数を読めませんでした</p>
        <p className="panel-text">少し時間をおいて、もう一度読んでみてください。</p>
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
      <div className="panel">
        <p className="panel-head">{ctx.noData && health !== 'denied' ? 'まだ歩数が届いていません' : '歩数を読む許可がありません'}</p>
        <p className="panel-text">
          {data.source === 'sensor'
            ? '設定のアプリ一覧から「てくあみ」を開き、「身体活動」を許可すると数えはじめます。'
            : ios
              ? 'ヘルスケアのアプリで、右上の自分のアイコン → アプリ → てくあみ と進み、「歩数」をオンにすると届きます。'
              : 'ヘルスコネクトの設定で、てくあみに「歩数」の読み取りを許可すると届きます。'}
        </p>
        <div className="btn-row">
          {sensorSwitch ? (
            <button className="btn btn-quiet" onClick={() => ctx.useSource('sensor')}>
              センサーを使う
            </button>
          ) : (
            <button className="btn btn-quiet" onClick={ctx.refresh}>
              読み直す
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={async () => {
              tap();
              const ok = await openHealthSettings();
              if (!ok) ctx.toast('設定を開けませんでした');
            }}
          >
            {ios ? 'ヘルスケアを開く' : '設定を開く'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-row">
      <button className="read-state" onClick={ctx.refresh} disabled={ctx.reading} aria-label="歩数を読み直す">
        <IconRefresh />
        <span>{ctx.reading ? '読んでいます' : data.lastReadAt ? `${timeJa(data.lastReadAt)} に読みました` : '読み直す'}</span>
      </button>
      <button className="btn btn-quiet btn-compact" onClick={onShare}>
        編みかけを見せる
      </button>
    </div>
  );
}
