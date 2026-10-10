import { useEffect, useRef, useState } from 'react';
import type { AppCtx } from '../App';
import { itemOf } from '../art/items';
import { paletteOf } from '../art/yarns';
import { fmt, labelJa } from '../domain/dates';
import { stitchesFor, type Progress } from '../domain/knit';
import { lastNDays } from '../domain/steps';
import { demoHour } from '../dev/demo';
import { HEALTH_CONNECT_PLAY_URL, openHealthSettings, sensorAvailableOnThisPlatform } from '../platform/health';
import { isNative, openUrl, platform, success, tap } from '../platform/native';
import { Arc, Cloud, Confetti, IconGear, IconSparkle, KnitStage, KnitStrip, Ref, rowsDoneOf, WoodBar } from './parts';

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

/** 今週(月曜から今日まで)の歩数 */
export function weekSteps(ctx: AppCtx): number {
  const { data, today } = ctx;
  const dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7;
  return lastNDays(data.days, data.imported, today, dow + 1).reduce((a, d) => a + d.steps, 0);
}

/** いまの時刻(ブラウザでの確認は ?hour= で決め打ち) */
export function hourNow(): number {
  const h = !isNative ? demoHour() : null;
  return h ?? new Date().getHours();
}

/** 窓の外が夜か。よる のテーマはいつも夜、ほかは 18時〜6時 */
export function isNightScene(theme: string, hour = hourNow()): boolean {
  return theme === 'yoru' || hour >= 18 || hour < 6;
}

/** 1日の終わりの表示(20時〜5時) */
export function isDayEnd(hour = hourNow()): boolean {
  return hour >= 20 || hour < 5;
}

/** 窓辺の部屋。窓・植物・眠る猫・毛糸のかご・マグ(見本B)。テーマと時刻で昼・夜・雪に変わる */
export function RoomScene({ night, theme, glow }: { night: boolean; theme: string; glow?: boolean }) {
  return (
    <div className={`room ${night ? 'is-night' : 'is-day'} room-${theme} ${glow ? 'is-glow' : ''}`} aria-hidden>
      <Ref name="home_window" className="room-bg" />
      <span className="room-tint" />
      {night && <span className="room-stars" />}
      {theme === 'yuki' && <span className="room-snow" />}
      <span className="room-glow" />
      <Ref name="b_plant" className="room-plant" />
      <Ref name="b_cat" className="room-cat" />
      <Ref name="b_basket" className="room-basket" />
      <Ref name="b_mug" className="room-mug" />
    </div>
  );
}

type Phase = 'normal' | 'celebrate' | 'teaser';

export function Home({ ctx, progress }: { ctx: AppCtx; progress: Progress | null }) {
  const { data, today, health } = ctx;
  const p = data.current;
  const todaySteps = data.days[today] ?? 0;
  const [phase, setPhase] = useState<Phase>('normal');
  const [gained, setGained] = useState(0);
  const [showWork, setShowWork] = useState(false);
  const startRows = useRef(p ? rowsDoneOf(p.item, Math.min(data.seen, progress?.stitches ?? 0)) : 0);
  const shown = useKnitAnimation(progress?.stitches ?? 0, data.seen, (n) => {
    if (!p) return;
    const g = rowsDoneOf(p.item, n) - startRows.current;
    if (n !== data.seen) {
      if (g > 0) {
        success();
        setGained(g);
        setPhase('celebrate');
      }
      ctx.markSeen(n);
    }
    startRows.current = rowsDoneOf(p.item, n);
  });

  const ready = health === 'ready' && !ctx.noData;
  const rowSteps = p?.rowSteps ?? data.rowSteps;
  const inRowSteps = progress && ready ? rowSteps - progress.toNextRow : 0;
  const toNext = progress && ready ? progress.toNextRow : rowSteps;
  const near = ready && toNext <= 50;
  const night = isNightScene(data.theme);
  const dayEnd = isDayEnd() && !!p && ready && !showWork && phase === 'normal';
  const rest = !!p && ready && todaySteps === 0 && phase === 'normal';
  const label = p ? `${paletteOf(p.palette).name}の${itemOf(p.item).name}` : '';

  // 今日編めた分(目の数): 今日の歩数ぶん前から今まで
  const fromToday = p && progress ? stitchesFor(itemOf(p.item), Math.max(0, progress.steps - todaySteps), p.rowSteps) : 0;

  let top: React.ReactNode;
  if (phase === 'celebrate') {
    top = (
      <div className="home-celebrate" aria-live="polite">
        <Confetti />
        <IconSparkle className="spark spark-1" />
        <IconSparkle className="spark spark-2" />
        <p className="celebrate-text">
          <span className="celebrate-big">{gained === 1 ? '1段' : `${gained}段`}</span>
          <br />
          編み上がりました!
        </p>
      </div>
    );
  } else if (phase === 'teaser') {
    top = (
      <div className="home-teaser" aria-live="polite">
        <Cloud className="cloud-teaser">
          どんな模様が
          <br />
          編み上がるかな?
        </Cloud>
      </div>
    );
  } else if (dayEnd) {
    top = (
      <div className="home-dayend">
        <p className="dayend-title">今日はこれだけ編めました</p>
      </div>
    );
  } else if (rest) {
    top = (
      <div className="home-rest" aria-live="polite">
        <Cloud className="cloud-rest">
          歩けない日もありますよね。
          <br />
          また、好きなペースで
          <br />
          つづけていきましょう。
        </Cloud>
      </div>
    );
  } else {
    top = (
      <section className="bubble-next" aria-live="polite">
        <p className="bn-label">{p ? '次の段まで' : 'つぎのあみものを'}</p>
        {p ? (
          <p className={`bn-num ${near ? 'is-near' : ''}`}>
            <span className="bn-ato">あと</span>
            <span className="num">{fmt(toNext)}</span>
            <span className="bn-unit">歩</span>
          </p>
        ) : (
          <p className="bn-num">
            <span className="bn-ato">選びましょう</span>
          </p>
        )}
        {p && <Arc frac={inRowSteps / rowSteps} className="bn-arc" />}
        {p && (
          <p className="bn-sub num">
            {fmt(inRowSteps)}歩 / {fmt(rowSteps)}歩
          </p>
        )}
        {near && <IconSparkle className="bn-spark" />}
      </section>
    );
  }

  let work: React.ReactNode;
  if (!p || !progress) {
    work = (
      <div className="home-empty">
        <Ref name="b_yarnbasket" className="home-empty-art" />
      </div>
    );
  } else if (phase === 'teaser') {
    work = (
      <div className="teaser-work">
        <WoodBar />
        <Ref name="b_question" className="teaser-fabric" alt="まだ分からない模様" />
      </div>
    );
  } else if (dayEnd) {
    work = (
      <div className="dayend-work">
        <div className="dayend-strip" style={{ ['--strip-w' as string]: `${Math.min(330, Math.max(120, 104 * 0.9 * 0.74 * Math.max(1, rowsDoneOf(p.item, shown) - rowsDoneOf(p.item, fromToday) + 1) / 12 + 24))}px` }}>
          {shown > fromToday ? (
            <KnitStrip item={p.item} palette={p.palette} pattern={p.pattern} from={fromToday} to={shown} label="今日編めた分" />
          ) : (
            <p className="dayend-none">今日はまだ編んでいません</p>
          )}
        </div>
        <Cloud className="cloud-dayend">
          歩けたぶんだけ
          <br />
          すてきな模様になっていきます。
          <br />
          またあしたも、ゆっくりと。
        </Cloud>
      </div>
    );
  } else {
    work = <KnitStage item={p.item} palette={p.palette} pattern={p.pattern} stitches={shown} label={`${label}。${progress.rowsTotal}段のうち${progress.rowsDone}段まで編めています`} />;
  }

  const balls = 10;
  const on = Math.round((inRowSteps / rowSteps) * balls);

  return (
    <div className={`home ${night ? 'home-night' : ''}`}>
      <div className="home-scene">
        <RoomScene night={night} theme={data.theme} glow={phase === 'celebrate' || phase === 'teaser'} />
        <header className="home-top">
          <span className="home-date">{labelJa(today)}</span>
          <button className="icon-btn home-gear" aria-label="設定" onClick={() => ctx.goTab('settings')}>
            <IconGear />
          </button>
        </header>
        <div className="pill-today">
          <span className="pill-label">今日の歩数</span>
          <span className="pill-num">
            <span className="num">{fmt(todaySteps)}</span>
            <span className="pill-unit">歩</span>
          </span>
        </div>
        {top}
        <section className={`home-work ${phase === 'celebrate' ? 'is-glow' : ''}`}>{work}</section>
        {(phase === 'celebrate' || phase === 'teaser') && (
          <div className="home-actions">
            {phase === 'celebrate' ? (
              <>
                <button
                  className="btn btn-cream btn-float"
                  onClick={() => {
                    tap();
                    setPhase('teaser');
                  }}
                >
                  つぎの段へ
                </button>
                <button className="btn-link btn-link-light" onClick={() => ctx.push({ name: 'share' })}>
                  画像で見る
                </button>
              </>
            ) : (
              <button
                className="btn btn-cream btn-float"
                onClick={() => {
                  tap();
                  setPhase('normal');
                }}
              >
                つぎの段を編みはじめる
              </button>
            )}
          </div>
        )}
        {dayEnd && (
          <div className="home-actions">
            <button
              className="btn-link btn-link-light"
              onClick={() => {
                tap();
                setShowWork(true);
              }}
            >
              編みかけを見る
            </button>
          </div>
        )}
      </div>

      <div className="home-lower">
        {p && progress && (
          <section className="rowmeter" aria-label="段の進み">
            <div className="rowmeter-head">
              <span className="rowmeter-rows num">
                {rowsDoneOf(p.item, shown)}段 <span className="rows-sep">/</span> {progress.rowsTotal}段
              </span>
              <span className="rowmeter-steps num">
                {fmt(inRowSteps)} / {fmt(rowSteps)}歩
              </span>
            </div>
            <div className="ballrow" aria-hidden>
              {Array.from({ length: balls }, (_, i) => (
                <Ref key={i} name={i < on ? 'c_ball_on' : 'c_ball_off'} className="ballrow-ball" />
              ))}
            </div>
          </section>
        )}
        {!p ? (
          <div className="note-card">
            <p className="note-head">次に編むものを選ぶと、余った歩数から編みはじめます</p>
            <button className="btn btn-primary" onClick={() => ctx.push({ name: 'pick' })}>
              次に編むものを選ぶ
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

  if (health === 'checking') return <div className="today-card is-quiet" />;

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

  // 歩けなかった日: 責めずに、休む猫を出す(見本D)
  if (todaySteps === 0) {
    return (
      <button className="rest-card" onClick={() => ctx.push({ name: 'record' })}>
        <Ref name="d_rest_cat" className="rest-art" />
        <span className="rest-text">
          今日はあまり歩けなかったみたいです。
          <br />
          またゆっくり、マイペースで編んでいきましょう。
        </span>
      </button>
    );
  }

  // 下の札(見本D):今日の歩数と「くわしく」
  return (
    <div className="today-card">
      <Ref name="card_steps" className="today-icon" />
      <span className="today-body">
        <span className="today-label">今日の歩数</span>
        <span className="today-num">
          <span className="num">{fmt(todaySteps)}</span>
          <span className="today-unit">歩</span>
        </span>
      </span>
      <span className="today-week">
        <span className="today-label">今週</span>
        <span className="today-wnum num">{fmt(weekSteps(ctx))}歩</span>
      </span>
      <button className="btn btn-cream btn-s today-more" onClick={() => ctx.push({ name: 'record' })}>
        くわしく
      </button>
    </div>
  );
}
