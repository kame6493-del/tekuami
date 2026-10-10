import type { AppCtx } from '../App';
import { addDays, fmt, labelJa, shortJa, weekdayJa } from '../domain/dates';
import { progressOf } from '../domain/knit';
import { historyRows, summarize } from '../domain/steps';
import { PageHead, Ref } from './parts';

const WD = ['月', '火', '水', '木', '金', '土', '日'];

/** 今日の記録(見本10)。円のゲージと、今週の棒グラフ。下に日ごとの記録 */
export function Record({ ctx }: { ctx: AppCtx }) {
  const { data, today } = ctx;
  const todaySteps = data.days[today] ?? 0;
  const pr = data.current ? progressOf(data.current, ctx.cumulative) : null;
  const R = pr?.rowSteps ?? data.rowSteps;
  const toNext = pr && !pr.done ? pr.toNextRow : R;
  const frac = pr && !pr.done ? 1 - toNext / R : 0;
  const dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const week = WD.map((w, i) => {
    const key = addDays(monday, i);
    const steps = key > today ? 0 : (data.days[key] ?? data.imported[key] ?? 0);
    return { w, key, steps, future: key > today };
  });
  const weekSum = week.reduce((a, d) => a + d.steps, 0);
  const max = Math.max(1, ...week.map((d) => d.steps));
  const sum = summarize(data.days, data.imported, today);
  const rows = historyRows(data.days, data.imported).filter((r) => r.key <= today);

  const C = 2 * Math.PI * 100;
  return (
    <div className="page record">
      <PageHead title="今日の記録" onBack={ctx.pop} />
      <div className="ring-wrap">
        <svg className="ring" viewBox="0 0 240 240" role="img" aria-label={`次の段まで あと${toNext}歩`}>
          <circle cx="120" cy="120" r="100" fill="none" stroke="var(--ring-bg)" strokeWidth="14" />
          <circle cx="120" cy="120" r="100" fill="none" stroke="var(--pink)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 120 120)" />
        </svg>
        <div className="ring-text">
          <p className="ring-label">今日の歩数</p>
          <p className="ring-big">
            <span className="num">{fmt(todaySteps)}</span>
            <span className="ring-unit">歩</span>
          </p>
          <span className="ring-rule" />
          <p className="ring-label">目標の段まで</p>
          <p className="ring-mid">
            <span className="ring-ato">あと</span>
            <span className="num">{fmt(toNext)}</span>
            <span className="ring-unit">歩</span>
          </p>
        </div>
        <span className="ring-badge" aria-hidden>
          <Ref name="card_week" />
        </span>
      </div>

      <section className="week-card">
        <div className="week-head">
          <h2>今週の歩数</h2>
          <p className="week-sum">
            <span className="num">{fmt(weekSum)}</span>
            <span className="ring-unit">歩</span>
          </p>
        </div>
        <figure className="week-bars" aria-label="今週の歩数">
          {week.map((d) => (
            <div key={d.key} className={`wbar ${d.key === today ? 'is-today' : ''} ${d.w === '土' ? 'is-sat' : ''}`}>
              <span className="wbar-col">
                {!d.future && (
                  <span className="wbar-fill" style={{ height: `${Math.max(3, (d.steps / max) * 100)}%` }}>
                    {d.key === today && (
                      <svg className="wbar-star" viewBox="0 0 24 24" aria-hidden>
                        <path d="M12 2 l3 6.5 7 .8 -5.2 4.8 1.4 7 L12 17.6 5.8 21.1 7.2 14.1 2 9.3 l7-.8 Z" fill="#f2b632" />
                      </svg>
                    )}
                  </span>
                )}
              </span>
              <span className="wbar-day">{d.w}</span>
            </div>
          ))}
        </figure>
      </section>

      <dl className="stats3">
        <div>
          <dt>1日あたり(7日)</dt>
          <dd className="num">{fmt(sum.weekAvg)}</dd>
        </div>
        <div>
          <dt>今月</dt>
          <dd className="num">{fmt(sum.month)}</dd>
        </div>
        <div>
          <dt>いちばん歩いた日</dt>
          <dd className="num">{sum.best ? `${shortJa(sum.best.key)} ${fmt(sum.best.steps)}` : '—'}</dd>
        </div>
      </dl>

      <h2 className="section-title">日ごと</h2>
      {rows.length === 0 ? (
        <p className="note-text">まだ記録がありません。歩数をつなぐと、ここに日ごとの歩数が並びます。</p>
      ) : (
        <ul className="daylist">
          {rows.slice(0, 120).map((r) => (
            <li key={r.key}>
              <span className="day-date">
                {r.key === today ? '今日' : labelJa(r.key).replace(/\(.\)/, '')}
                <span className="day-week">{weekdayJa(r.key)}</span>
                {r.imported && <span className="tag-mini">読み込み</span>}
              </span>
              <span className="day-steps num">{fmt(r.steps)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
