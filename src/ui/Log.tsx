import type { AppCtx } from '../App';
import { fmt, labelJa, shortJa, weekdayJa } from '../domain/dates';
import { historyRows, lastNDays, summarize } from '../domain/steps';

export function Log({ ctx }: { ctx: AppCtx }) {
  const { data, today } = ctx;
  const week = lastNDays(data.days, data.imported, today, 7);
  const max = Math.max(1, ...week.map((d) => d.steps));
  const sum = summarize(data.days, data.imported, today);
  const rows = historyRows(data.days, data.imported).filter((r) => r.key <= today);
  const hasAny = rows.some((r) => r.steps > 0);

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">記録</h1>
      </header>

      {!hasAny ? (
        <div className="empty">
          <p className="empty-head">まだ記録がありません</p>
          <p className="empty-text">歩数をつなぐと、ここに日ごとの歩数が並びます。ほかのアプリの記録も、設定から読み込めます。</p>
          <button className="btn btn-quiet" onClick={() => ctx.open({ kind: 'settings' })}>
            設定を開く
          </button>
        </div>
      ) : (
        <>
          <dl className="stats">
            <div>
              <dt>この7日</dt>
              <dd className="num">{fmt(sum.week)}</dd>
            </div>
            <div>
              <dt>1日あたり</dt>
              <dd className="num">{fmt(sum.weekAvg)}</dd>
            </div>
            <div>
              <dt>今月</dt>
              <dd className="num">{fmt(sum.month)}</dd>
            </div>
          </dl>

          <figure className="bars" aria-label="この7日の歩数">
            {week.map((d) => (
              <div key={d.key} className={`bar ${d.key === today ? 'is-today' : ''}`}>
                <span className="bar-val num">{d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps}</span>
                <span className="bar-col">
                  <span className="bar-fill" style={{ height: `${Math.max(2, (d.steps / max) * 100)}%` }} />
                </span>
                <span className="bar-day">{d.key === today ? '今日' : weekdayJa(d.key)}</span>
              </div>
            ))}
          </figure>

          {sum.best && (
            <p className="note">
              いちばん歩いた日は {labelJa(sum.best.key)}、<span className="num">{fmt(sum.best.steps)}</span>歩。
            </p>
          )}

          <h2 className="section-title">日ごと</h2>
          <ul className="daylist">
            {rows.map((r) => (
              <li key={r.key}>
                <span className="day-date">
                  {shortJa(r.key)}
                  <span className="day-week">{weekdayJa(r.key)}</span>
                  {r.imported && <span className="tag">読み込み</span>}
                </span>
                <span className="day-steps num">{fmt(r.steps)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
