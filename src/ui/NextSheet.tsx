import { useState } from 'react';
import type { AppCtx } from '../App';
import { ITEMS } from '../art/items';
import { PATTERNS } from '../art/motifs';
import { PALETTES } from '../art/yarns';
import { fmt } from '../domain/dates';
import { tap } from '../platform/native';
import { IconLock } from './icons';
import { Ball, Finished } from './Pixel';

/** 次に編む物を選ぶ。1画面で 物 → 色 →(毛糸ぶくろがあれば模様)→ 編みはじめる */
export function NextSheet({ ctx }: { ctx: AppCtx }) {
  const { pro } = ctx;
  const lastPalette = ctx.data.done.at(-1)?.palette ?? PALETTES[0].id;
  const [item, setItem] = useState('hat');
  const [palette, setPalette] = useState(PALETTES.find((p) => p.id === lastPalette && (pro || !p.pro))?.id ?? PALETTES[0].id);
  const [pattern, setPattern] = useState<string>('');

  const pick = (fn: () => void, locked: boolean) => () => {
    if (locked) {
      ctx.open({ kind: 'paywall', from: { kind: 'next' } });
      return;
    }
    tap();
    fn();
  };

  return (
    <div className="next">
      <h2 className="sheet-title">次に編む物</h2>
      {ctx.data.carry !== null && <p className="sheet-lead">前の1枚の余りの歩数から編みはじめます。</p>}

      <ul className="items" aria-label="編む物">
        {ITEMS.map((it) => {
          const locked = it.pro && !pro;
          return (
            <li key={it.id}>
              <button className={`item ${item === it.id ? 'is-on' : ''}`} aria-pressed={item === it.id} onClick={pick(() => setItem(it.id), locked)}>
                {locked && (
                  <span className="lock" aria-label="毛糸ぶくろで開きます">
                    <IconLock />
                  </span>
                )}
                <span className="item-art">
                  <Finished item={it.id} palette={palette} pattern="plain" max={{ w: 80, h: 68 }} label="" />
                </span>
                <span className="item-name">{it.name}</span>
                <span className="item-steps num">{fmt(it.steps)}歩</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="section-title">毛糸の色</h3>
      <ul className="palettes" aria-label="毛糸の色">
        {PALETTES.map((p) => {
          const locked = p.pro && !pro;
          return (
            <li key={p.id}>
              <button className={`pal ${palette === p.id ? 'is-on' : ''}`} aria-pressed={palette === p.id} onClick={pick(() => setPalette(p.id), locked)}>
                {locked && (
                  <span className="lock" aria-label="毛糸ぶくろで開きます">
                    <IconLock />
                  </span>
                )}
                <Ball palette={p.id} scale={1.5} />
                <span className="pal-name">{p.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="section-title">模様</h3>
      {pro ? (
        <div className="chips" role="radiogroup" aria-label="模様">
          <button role="radio" aria-checked={pattern === ''} className={`chip ${pattern === '' ? 'is-on' : ''}`} onClick={() => setPattern('')}>
            おまかせ
          </button>
          {PATTERNS.map((pt) => (
            <button key={pt.id} role="radio" aria-checked={pattern === pt.id} className={`chip ${pattern === pt.id ? 'is-on' : ''}`} onClick={() => setPattern(pt.id)}>
              {pt.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="note">
          模様は編み上がるまでのお楽しみです。
          <button className="link" onClick={() => ctx.open({ kind: 'paywall', from: { kind: 'next' } })}>
            毛糸ぶくろ
          </button>
          があると選べます。
        </p>
      )}

      <div className="sheet-foot">
        <button className="btn btn-primary" onClick={() => ctx.startProject({ item, palette, pattern: pattern || undefined })}>
          編みはじめる
        </button>
      </div>
    </div>
  );
}
