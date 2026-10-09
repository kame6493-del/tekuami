import { useRef, useState } from 'react';
import type { AppCtx } from '../App';
import { parseStepsCsv } from '../domain/csv';
import { fmt, timeJa } from '../domain/dates';
import { openHealthSettings, readerFor, sensorAvailableOnThisPlatform } from '../platform/health';
import { platform, tap } from '../platform/native';
import { IconChevron } from './icons';

const STATE_TEXT: Record<string, string> = {
  checking: '確かめています',
  ready: 'つながっています',
  needsPermission: 'まだつないでいません',
  denied: '許可がありません',
  notInstalled: '入っていません',
  needsUpdate: '更新が要ります',
  unsupported: 'この端末では読めません',
  error: '読めませんでした',
};

export function Settings({ ctx }: { ctx: AppCtx }) {
  const { data, health, pro } = ctx;
  const reader = readerFor(data.source);
  const file = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState(false);
  const importedCount = Object.keys(data.imported).length;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    const r = parseStepsCsv(text);
    if (r.error) ctx.toast(r.error);
    else {
      ctx.importDays(r.days);
      ctx.toast(`${fmt(r.count)}日分の歩数を読み込みました`);
    }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="settings">
      <h2 className="sheet-title">設定</h2>

      <h3 className="section-title">歩数</h3>
      <ul className="rows">
        <li className="row">
          <span className="row-main">
            <span className="row-label">{reader.label}</span>
            <span className="row-sub">
              {STATE_TEXT[health] ?? ''}
              {data.lastReadAt ? `・${timeJa(data.lastReadAt)} に読みました` : ''}
            </span>
          </span>
          {health === 'ready' ? (
            <button className="btn btn-quiet btn-compact" onClick={ctx.refresh}>
              読み直す
            </button>
          ) : health === 'needsPermission' ? (
            <button className="btn btn-quiet btn-compact" onClick={ctx.connect}>
              つなぐ
            </button>
          ) : (
            <button
              className="btn btn-quiet btn-compact"
              onClick={async () => {
                tap();
                if (!(await openHealthSettings())) ctx.toast('設定を開けませんでした');
              }}
            >
              設定を開く
            </button>
          )}
        </li>
        {platform === 'android' && sensorAvailableOnThisPlatform() && (
          <li className="row">
            <span className="row-main">
              <span className="row-label">{data.source === 'sensor' ? 'ヘルスコネクトに切り替える' : '端末のセンサーで数える'}</span>
              <span className="row-sub">ヘルスコネクトに歩数が入らない端末向け</span>
            </span>
            <button className="btn btn-quiet btn-compact" onClick={() => ctx.useSource(data.source === 'sensor' ? 'health' : 'sensor')}>
              切り替える
            </button>
          </li>
        )}
        <li className="row">
          <span className="row-main">
            <span className="row-label">ほかのアプリの記録を読み込む</span>
            <span className="row-sub">{importedCount > 0 ? `${fmt(importedCount)}日分を読み込み済み` : '日付と歩数の列がある CSV ファイル'}</span>
          </span>
          <button
            className="btn btn-quiet btn-compact"
            onClick={() => {
              tap();
              file.current?.click();
            }}
          >
            選ぶ
          </button>
          <input ref={file} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </li>
      </ul>
      <p className="note">読み込んだ記録は「記録」に並びます。編み物には、てくあみを入れた日からの歩数を使います。</p>

      <h3 className="section-title">毛糸ぶくろ</h3>
      <ul className="rows">
        <li>
          <button className="row row-link" onClick={() => ctx.open({ kind: 'paywall', from: { kind: 'settings' } })}>
            <span className="row-main">
              <span className="row-label">毛糸ぶくろ</span>
              <span className="row-sub">{pro ? '開いています' : '編む物・色・模様が増えます'}</span>
            </span>
            <IconChevron />
          </button>
        </li>
      </ul>

      <h3 className="section-title">このアプリ</h3>
      <ul className="rows">
        <li>
          <button className="row row-link" onClick={() => ctx.open({ kind: 'privacy' })}>
            <span className="row-main">
              <span className="row-label">プライバシーポリシー</span>
            </span>
            <IconChevron />
          </button>
        </li>
        <li className="row">
          <span className="row-main">
            <span className="row-label">バージョン</span>
          </span>
          <span className="row-value num">1.0.0</span>
        </li>
        <li className="row">
          <span className="row-main">
            <span className="row-label">記録をすべて消す</span>
            <span className="row-sub">歩数・編みかけ・箱の中身が消えます</span>
          </span>
          {confirm ? (
            <button className="btn btn-danger btn-compact" onClick={ctx.resetAll}>
              消す
            </button>
          ) : (
            <button
              className="btn btn-quiet btn-compact"
              onClick={() => {
                tap();
                setConfirm(true);
              }}
            >
              消す…
            </button>
          )}
        </li>
      </ul>
    </div>
  );
}
