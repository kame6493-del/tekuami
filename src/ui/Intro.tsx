import { useEffect, useState } from 'react';
import { itemOf } from '../art/items';
import { PALETTES } from '../art/yarns';
import { progressOf, newProject } from '../domain/knit';
import { tap } from '../platform/native';
import { Ball, Stage } from './Pixel';

/** 最初の説明は2画面だけ。1画面目で何のアプリか、2画面目で色を選んだらすぐ編みはじめる */
export function Intro({ onStart }: { onStart: (palette: string) => void }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [palette, setPalette] = useState(PALETTES[0].id);
  const free = PALETTES.filter((p) => !p.pro);

  // 見本の編み目が少しずつ増える(歩くとこう進む、を見せる)
  const [demo, setDemo] = useState(150);
  useEffect(() => {
    if (step !== 0) return;
    const t = window.setInterval(() => setDemo((n) => (n >= 300 ? 150 : n + 1)), 90);
    return () => window.clearInterval(t);
  }, [step]);
  const demoProject = { ...newProject({ item: 'muffler', palette: 'kon', pattern: 'snow', startTotal: 0, today: '2026-10-09' }), best: 0 };
  const per = itemOf('muffler').steps / 432;
  const pr = progressOf(demoProject, Math.round(demo * per));

  if (step === 0) {
    return (
      <div className="intro">
        <div className="intro-top">
          <p className="eyebrow">てくあみ</p>
          <h1 className="intro-title">
            歩いた分だけ、
            <br />
            ひと目ずつ編めます。
          </h1>
          <p className="intro-lead">1段はだいたい500歩。何の模様になるかは、編み上がるまでのお楽しみ。</p>
        </div>
        <div className="intro-stage">
          <Stage item="muffler" palette="kon" pattern="snow" stitches={pr.stitches} rowsDone={pr.rowsDone} frame={demo % 2} label="マフラーを編んでいる見本" />
        </div>
        <div className="intro-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              tap();
              setStep(1);
            }}
          >
            はじめる
          </button>
          <p className="steps-dots" aria-label="2画面のうち1画面目">
            <span className="on" />
            <span />
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="intro">
      <div className="intro-top">
        <p className="eyebrow">最初の1本</p>
        <h1 className="intro-title">マフラーから編みます</h1>
        <p className="intro-lead">毛糸の色を選んだら、編みはじめます。ほかの物は、編み上げたあとに選べます。</p>
      </div>
      <div className="swatches" role="radiogroup" aria-label="毛糸の色">
        {free.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={palette === p.id}
            className={`swatch ${palette === p.id ? 'is-on' : ''}`}
            onClick={() => {
              tap();
              setPalette(p.id);
            }}
          >
            <Ball palette={p.id} scale={2} />
            <span className="swatch-name">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="intro-actions">
        <button className="btn btn-primary" onClick={() => onStart(palette)}>
          この色で編みはじめる
        </button>
        <button className="btn btn-text" onClick={() => onStart(PALETTES[0].id)}>
          おまかせにする
        </button>
      </div>
    </div>
  );
}
