import { useState } from 'react';
import type { AppCtx } from '../App';
import { dayKey, fmt } from '../domain/dates';
import { tap } from '../platform/native';
import { IconChevron, Ref } from './parts';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** その月のマス(週ごと)。null は前後の月の空き */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(dayKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const out: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
  return out;
}

/** 1日の記録(見本C 11)。歩いた日は毛糸玉、今日は丸で囲む。歩けなかった日も責めない */
export function Calendar({ ctx }: { ctx: AppCtx }) {
  const { data, today } = ctx;
  const [y0, m0] = today.split('-').map(Number);
  const [ym, setYm] = useState({ y: y0, m: m0 - 1 });
  const grid = monthGrid(ym.y, ym.m);
  const steps = (k: string) => data.days[k] ?? data.imported[k] ?? 0;
  const move = (d: number) => {
    tap();
    setYm((v) => {
      const t = new Date(v.y, v.m + d, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });
  };
  const isThisMonth = ym.y === y0 && ym.m === m0 - 1;
  const todaySteps = steps(today);
  return (
    <section className="cal-card" aria-label="月の記録">
      <div className="cal-head">
        <button className="cal-nav cal-prev" aria-label="前の月" onClick={() => move(-1)}>
          <IconChevron />
        </button>
        <h2 className="cal-title num">
          {ym.y}年 {ym.m + 1}月
        </h2>
        <button className="cal-nav" aria-label="次の月" onClick={() => move(1)} disabled={isThisMonth}>
          <IconChevron />
        </button>
      </div>
      <table className="cal">
        <thead>
          <tr>
            {WD.map((w) => (
              <th key={w} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week, i) => (
            <tr key={i}>
              {week.map((k, j) => {
                if (!k) return <td key={j} />;
                const n = steps(k);
                const d = Number(k.slice(8));
                const future = k > today;
                return (
                  <td key={j} className={`${k === today ? 'is-today' : ''}`} title={future ? '' : `${fmt(n)}歩`}>
                    {n > 0 && !future ? <Ref name="c_dayball" className="cal-ball" /> : null}
                    <span className={`cal-d num ${n > 0 && !future ? 'on-ball' : ''}`}>{d}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cal-cat">
        <Ref name="c_cat" className="cal-cat-art" />
        <p>
          {todaySteps > 0 ? (
            <>
              今日は{fmt(todaySteps)}歩、歩きました。
              <br />
              毛糸玉がひとつ増えました。
            </>
          ) : (
            <>
              今日はのんびり過ごした日。
              <br />
              また、好きなときに
              <br />
              少しずつ編んでいきましょう。
            </>
          )}
        </p>
      </div>
    </section>
  );
}
