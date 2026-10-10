import { useRef, useState } from 'react';
import type { AppCtx } from '../App';
import { parseStepsCsv } from '../domain/csv';
import { fmt, timeJa } from '../domain/dates';
import { ROW_STEPS_CHOICES } from '../domain/knit';
import { openHealthSettings, readerFor, sensorAvailableOnThisPlatform } from '../platform/health';
import { THEMES } from '../domain/data';
import { openUrl, platform, tap } from '../platform/native';
import { RoomScene } from './Home';
import { IconChevron, PageHead, Ref } from './parts';

export const VERSION = '1.2.0';

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

function Row({ icon, label, sub, onClick }: { icon: string; label: string; sub?: string; onClick?: () => void }) {
  const inner = (
    <>
      <Ref name={icon} className="set-icon" />
      <span className="set-text">
        <span className="set-label">{label}</span>
        {sub && <span className="set-sub">{sub}</span>}
      </span>
      {onClick && (
        <span className="set-chev">
          <IconChevron />
        </span>
      )}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button className="set-row" onClick={onClick}>
          {inner}
        </button>
      ) : (
        <div className="set-row">{inner}</div>
      )}
    </li>
  );
}

const sourceName = () => (platform === 'android' ? 'ヘルスコネクト' : platform === 'ios' ? 'ヘルスケア' : 'ヘルスケア / ヘルスコネクト');

/** 設定(見本B・C 12・D)。下のタブから開く */
export function Settings({ ctx }: { ctx: AppCtx }) {
  const st = (ok: boolean) => (ok ? '連携中' : '未連携');
  const ready = ctx.health === 'ready';
  const theme = THEMES.find((t) => t.id === ctx.data.theme) ?? THEMES[0];
  return (
    <div className="page settings">
      <PageHead title="設定" />
      <h2 className="set-sec">歩数の連携</h2>
      <ul className="set-list">
        {platform !== 'android' && (
          <li>
            <button className="set-row" onClick={() => ctx.push({ name: 'source' })}>
              <Ref name="icon_health" className="set-icon" />
              <span className="set-text">
                <span className="set-label">ヘルスケア</span>
                <span className="set-sub">(読み取り専用)</span>
              </span>
              <span className={`set-state ${platform === 'ios' && ready ? 'is-on' : ''}`}>{platform === 'ios' ? st(ready) : st(ready)}</span>
              <span className="set-chev">
                <IconChevron />
              </span>
            </button>
          </li>
        )}
        {platform !== 'ios' && (
          <li>
            <button className="set-row" onClick={() => ctx.push({ name: 'source' })}>
              <Ref name="icon_hc" className="set-icon" />
              <span className="set-text">
                <span className="set-label">ヘルスコネクト</span>
                <span className="set-sub">(読み取り専用)</span>
              </span>
              <span className={`set-state ${platform === 'android' && ready ? 'is-on' : ''}`}>{platform === 'android' ? st(ready) : '未連携'}</span>
              <span className="set-chev">
                <IconChevron />
              </span>
            </button>
          </li>
        )}
      </ul>
      <ul className="set-list set-list-gap">
        <Row icon="set_steps" label="1段の歩数" sub={`${fmt(ctx.data.rowSteps)}歩(変更できます)`} onClick={() => ctx.push({ name: 'rowsteps' })} />
        <Row icon="set_about" label="見た目(テーマ)" sub={theme.name} onClick={() => ctx.push({ name: 'theme' })} />
        <Row icon="set_write" label="データの扱い" sub="端末に保存されます・書き込みしません" onClick={() => ctx.push({ name: 'data' })} />
        <Row icon="set_sound" label="お知らせ" sub="通知はありません" />
      </ul>
      <ul className="plain-list set-list-gap">
        <LinkRow label="使い方" onClick={() => ctx.push({ name: 'howto' })} />
        <LinkRow label="プライバシーポリシー" onClick={() => ctx.push({ name: 'privacy' })} />
        <LinkRow label="お問い合わせ" onClick={() => ctx.push({ name: 'contact' })} />
        <LinkRow label="このアプリについて" onClick={() => ctx.push({ name: 'about' })} />
      </ul>
      <div className="calm-card">
        <div className="calm">
          <Ref name="d_no_notice" className="calm-icon" />
          <span>通知は ありません</span>
        </div>
        <div className="calm">
          <Ref name="d_no_sound" className="calm-icon" />
          <span>音は ありません</span>
        </div>
        <div className="calm">
          <Ref name="set_ads" className="calm-icon" />
          <span>広告は ありません</span>
        </div>
      </div>
      <div className="cat-card">
        <p>
          歩けない日があっても
          <br />
          だいじょうぶ。
          <br />
          また、いつでも。
        </p>
        <Ref name="cat_card" className="cat-card-art" />
      </div>
    </div>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button className="plain-row plain-link" onClick={onClick}>
        <span className="plain-main">
          <span className="plain-label">{label}</span>
        </span>
        <IconChevron />
      </button>
    </li>
  );
}

/** 見た目(見本D 下段のテーマ3つ) */
export function ThemePage({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="page">
      <PageHead title="見た目(テーマ)" onBack={ctx.pop} />
      <ul className="theme-grid" role="radiogroup" aria-label="テーマ">
        {THEMES.map((t) => (
          <li key={t.id}>
            <button
              role="radio"
              aria-checked={ctx.data.theme === t.id}
              className={`theme-card ${ctx.data.theme === t.id ? 'is-on' : ''}`}
              onClick={() => {
                tap();
                ctx.setTheme(t.id);
              }}
            >
              <span className={`theme-thumb theme-thumb-${t.id}`} aria-hidden>
                <RoomScene night={t.id === 'yoru'} theme={t.id} />
              </span>
              <span className="theme-name">{t.name}</span>
              <span className="theme-sub">{t.sub}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="set-hint">ひだまり は、夕方6時から朝6時まで窓の外が夜になります。夜8時をすぎると、ホームに「今日はこれだけ編めました」が出ます。</p>
    </div>
  );
}

/** データの扱い */
export function DataPage({ ctx }: { ctx: AppCtx }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="page">
      <PageHead title="データの扱い" onBack={ctx.pop} />
      <div className="doc">
        <p>歩数・編みかけ・箱の中身は、この端末の中だけに保存します。外のサーバーへは送りません。アカウント登録もありません。</p>
        <p>ヘルスケア・ヘルスコネクトからは歩数を読むだけで、書き込みはしません。</p>
      </div>
      <ul className="plain-list set-list-gap">
        <LinkRow label="ほかのアプリの記録を読み込む" onClick={() => ctx.push({ name: 'source' })} />
        <li className="plain-row">
          <span className="plain-main">
            <span className="plain-label">記録をすべて消す</span>
            <span className="plain-sub">歩数・編みかけ・箱の中身が消えます</span>
          </span>
          {confirm ? (
            <button className="btn btn-danger btn-s" onClick={ctx.resetAll}>
              消す
            </button>
          ) : (
            <button
              className="btn btn-cream btn-s"
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

/** 使い方 */
export function HowtoPage({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="page">
      <PageHead title="使い方" onBack={ctx.pop} />
      <ol className="howto">
        <li>
          <strong className="howto-h">歩くと編めます</strong>
          <span>ヘルスケア(Android はヘルスコネクト)の歩数を読んで、1段 {fmt(ctx.data.rowSteps)}歩 で編み進めます。開くたびに読み直します。</span>
        </li>
        <li>
          <strong className="howto-h">模様は編み上がるまで秘密</strong>
          <span>最後の段まで編むと、何の模様だったか分かります。毛糸ぶくろがあれば、模様を自分で選べます。</span>
        </li>
        <li>
          <strong className="howto-h">箱にしまう</strong>
          <span>編み上がった物は「箱」にずっと残ります。「図鑑」で、集めた模様が見られます。</span>
        </li>
        <li>
          <strong className="howto-h">余った歩数は持ち越し</strong>
          <span>たくさん歩いた日の余りは、次に編む物へ持ち越します。編んだ段は減りません。</span>
        </li>
        <li>
          <strong className="howto-h">ウィジェット</strong>
          <span>ホーム画面・ロック画面に「次の段まで あと何歩」を置けます。ホーム画面を長押しして、てくあみのウィジェットを選んでください。</span>
        </li>
      </ol>
    </div>
  );
}

export const CONTACT_URL = 'https://github.com/kame6493-del/tekuami/issues';

/** お問い合わせ */
export function ContactPage({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="page">
      <PageHead title="お問い合わせ" onBack={ctx.pop} />
      <div className="doc">
        <p>ご意見・不具合のお知らせは、下のページから送れます(GitHub のアカウントが要ります)。</p>
        <p>歩数が届かないときは、ホームの案内か、設定の「ヘルスケア」「ヘルスコネクト」から読み取りの許可を確かめてください。</p>
      </div>
      <div className="page-foot">
        <button className="btn btn-primary" onClick={() => openUrl(CONTACT_URL)}>
          お問い合わせのページを開く
        </button>
      </div>
    </div>
  );
}

/** 歩数データの取得 */
export function SourcePage({ ctx }: { ctx: AppCtx }) {
  const { data, health } = ctx;
  const reader = readerFor(data.source);
  const file = useRef<HTMLInputElement>(null);
  const importedCount = Object.keys(data.imported).length;
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const r = parseStepsCsv(await f.text());
    if (r.error) ctx.toast(r.error);
    else {
      ctx.importDays(r.days);
      ctx.toast(`${fmt(r.count)}日分の歩数を読み込みました`);
    }
    if (file.current) file.current.value = '';
  };
  return (
    <div className="page">
      <PageHead title="歩数データの取得" onBack={ctx.pop} />
      <div className="hc-explain">
        <div className="hc-icons" aria-hidden>
          <Ref name="icon_health" />
          <span className="hc-dots">・・</span>
          <Ref name="icon_hc" />
        </div>
        <p>
          {sourceName()}から
          <br />
          歩数を読み取ります
          <br />
          <span className="note-small">(書き込みは行いません)</span>
        </p>
      </div>
      <ul className="plain-list">
        <li className="plain-row">
          <span className="plain-main">
            <span className="plain-label">{reader.label}</span>
            <span className="plain-sub">
              {STATE_TEXT[health] ?? ''}
              {data.lastReadAt ? `・${timeJa(data.lastReadAt)} に読みました` : ''}
            </span>
          </span>
          {health === 'ready' ? (
            <button className="btn btn-cream btn-s" onClick={ctx.refresh}>
              読み直す
            </button>
          ) : health === 'needsPermission' ? (
            <button className="btn btn-primary btn-s" onClick={ctx.connect}>
              連携する
            </button>
          ) : (
            <button
              className="btn btn-cream btn-s"
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
          <li className="plain-row">
            <span className="plain-main">
              <span className="plain-label">{data.source === 'sensor' ? 'ヘルスコネクトに切り替える' : '端末のセンサーで数える'}</span>
              <span className="plain-sub">ヘルスコネクトに歩数が入らない端末向け</span>
            </span>
            <button className="btn btn-cream btn-s" onClick={() => ctx.useSource(data.source === 'sensor' ? 'health' : 'sensor')}>
              切り替える
            </button>
          </li>
        )}
        <li className="plain-row">
          <span className="plain-main">
            <span className="plain-label">ほかのアプリの記録を読み込む</span>
            <span className="plain-sub">{importedCount > 0 ? `${fmt(importedCount)}日分を読み込み済み` : '日付と歩数の列がある CSV ファイル'}</span>
          </span>
          <button
            className="btn btn-cream btn-s"
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
      <p className="set-hint">読み込んだ記録は「今日の記録」の日ごとに並びます。編み物には、てくあみを入れた日からの歩数を使います。</p>
    </div>
  );
}

/** 1段の歩数 */
export function RowStepsPage({ ctx }: { ctx: AppCtx }) {
  const cur = ctx.data.current;
  return (
    <div className="page">
      <PageHead title="1段の歩数" onBack={ctx.pop} />
      <p className="set-hint">1段を編むのに使う歩数です。少なくすると、少し歩いただけでも段が進みます。</p>
      <ul className="plain-list" role="radiogroup" aria-label="1段の歩数">
        {ROW_STEPS_CHOICES.map((n) => (
          <li key={n}>
            <button
              role="radio"
              aria-checked={ctx.data.rowSteps === n}
              className={`radio-row ${ctx.data.rowSteps === n ? 'is-on' : ''}`}
              onClick={() => {
                tap();
                ctx.setRowSteps(n);
              }}
            >
              <span className="radio-dot" aria-hidden />
              <span className="num">{fmt(n)}歩</span>
              {n === 500 && <span className="plain-sub">(ふつう)</span>}
            </button>
          </li>
        ))}
      </ul>
      {cur && <p className="set-hint">次に編みはじめる物から変わります。いま編んでいる物は {fmt(cur.rowSteps)}歩 のままです。</p>}
    </div>
  );
}

/** アプリについて */
export function About({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="page">
      <PageHead title="このアプリについて" onBack={ctx.pop} />
      <ul className="plain-list">
        <li className="plain-row">
          <span className="plain-main">
            <span className="plain-label">てくあみ - 歩いて編む歩数計</span>
            <span className="plain-sub">バージョン {VERSION}</span>
          </span>
        </li>
        <li>
          <button className="plain-row plain-link" onClick={() => ctx.push({ name: 'bag' })}>
            <span className="plain-main">
              <span className="plain-label">毛糸ぶくろ</span>
              <span className="plain-sub">{ctx.pro ? '開いています' : '編めるもの・色・模様が増えます'}</span>
            </span>
            <IconChevron />
          </button>
        </li>
        <li>
          <button className="plain-row plain-link" onClick={() => ctx.push({ name: 'privacy' })}>
            <span className="plain-main">
              <span className="plain-label">プライバシーポリシー</span>
            </span>
            <IconChevron />
          </button>
        </li>
      </ul>
      <p className="set-hint">広告なし・音なし・ログインなし。歩数と編んだ物は、この端末の中だけに残ります。</p>
    </div>
  );
}

/** アプリの中で読めるプライバシーポリシー。store/privacy.md・public/privacypolicy.html と同じ中身 */
export function Privacy({ ctx }: { ctx: AppCtx }) {
  return (
    <div className="page">
      <PageHead title="プライバシーポリシー" onBack={ctx.pop} />
      <article className="doc">
        <p className="doc-date">2026年10月9日</p>
        <h3>読むもの</h3>
      <p>
        てくあみは、iPhone では「ヘルスケア」、Android では「ヘルスコネクト」から、日ごとの歩数だけを読みます。ヘルスコネクトが使えない Android
        の端末では、許可をもらったうえで端末の歩数センサーの数を読みます。歩数のほかの健康の記録(心拍・睡眠・体重など)は読みません。
      </p>
      <h3>書きこまないもの・送らないもの</h3>
      <p>ヘルスケア・ヘルスコネクトへ書きこみはしません。歩数も、編んだ物の記録も、この端末の中だけに保存し、外のサーバーへは送りません。アカウント登録もありません。</p>
      <h3>使い道</h3>
      <p>読んだ歩数は、編み物を進めることと、記録の画面に日ごとの歩数を並べることだけに使います。広告・分析・販売には使いません。</p>
      <h3>購入</h3>
      <p>
        「毛糸ぶくろ」の購入は App Store / Google Play が扱います。購入済みかどうかを確かめるために、RevenueCat(購入の管理サービス)へ、端末ごとの番号と購入の記録が送られます。歩数や健康の記録は送りません。
      </p>
      <h3>読み込んだ記録</h3>
      <p>ほかのアプリから書き出した歩数のファイルを読み込んだときも、中身は端末の中だけに保存します。</p>
      <h3>消すとき</h3>
      <p>設定の「アプリについて」→「記録をすべて消す」で、この端末に保存した記録はすべて消えます。アプリを消しても消えます。歩数を読む許可は、ヘルスケア・ヘルスコネクト・端末の設定からいつでも取り消せます。</p>
      <h3>医療について</h3>
      <p>てくあみは歩くことを楽しむためのアプリで、病気の診断・治療・予防を目的としたものではありません。</p>
      <h3>変更</h3>
      <p>この内容を変えるときは、アプリの更新とあわせてこのページを書き換えます。</p>
      </article>
    </div>
  );
}
