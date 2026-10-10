import { registerPlugin, WebPlugin } from '@capacitor/core';

/**
 * ホーム画面・ロック画面のウィジェットとの橋。
 * - iOS: ios/App/App/TekuamiWidgetPlugin.swift(App Group group.jp.tekuami.app の UserDefaults に JSON を置き、WidgetKit を更新)
 * - Android: android/app/src/main/java/jp/tekuami/app/TekuamiWidgetPlugin.java(SharedPreferences に置き、AppWidget を更新)
 * ウィジェットは見るだけ(押すとアプリが開く)。歩数はアプリが読んだ値を渡す。
 */
export interface WidgetSnapshot {
  v: 1;
  /** 次の段まで あと何歩(編んでいない時は 0) */
  toNext: number;
  /** 1段の歩数 */
  rowSteps: number;
  /** 今日の歩数 */
  today: number;
  rowsDone: number;
  rowsTotal: number;
  /** マフラー などの名前。編んでいない時は空 */
  item: string;
  /** 地・模様の色(#rrggbb) */
  main: string;
  sub: string;
  /** 見た目のテーマ */
  theme: string;
  updatedAt: number;
}

export interface TekuamiWidgetPlugin {
  setSnapshot(o: { json: string }): Promise<void>;
}

class WebWidget extends WebPlugin implements TekuamiWidgetPlugin {
  async setSnapshot(o: { json: string }) {
    try {
      localStorage.setItem('tekuami.web.widget', o.json);
    } catch {
      /* 無くても困らない */
    }
  }
}

export const TekuamiWidget = registerPlugin<TekuamiWidgetPlugin>('TekuamiWidget', { web: () => new WebWidget() });

let last = '';
export async function pushWidget(s: WidgetSnapshot) {
  const { updatedAt: _u, ...rest } = s;
  const key = JSON.stringify(rest);
  if (key === last) return;
  last = key;
  try {
    await TekuamiWidget.setSnapshot({ json: JSON.stringify(s) });
  } catch (e) {
    console.error('[tekuami] widget', e);
  }
}
