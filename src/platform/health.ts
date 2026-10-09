import { registerPlugin } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';
import { addDays, dayKey, parseDayKey } from '../domain/dates';
import type { Source } from '../domain/data';
import { sensorDelta, type Days, type SensorMark } from '../domain/steps';
import { demoMode, demoDays } from '../dev/demo';
import { isNative, platform } from './native';

/**
 * 歩数の読み取り。
 * - iOS: ヘルスケア(HealthKit)の歩数を日ごとに合計して読む。書きこみはしない
 * - Android: ヘルスコネクトの歩数を読む。入っていない・歩数が無い端末は、端末の歩数センサー(自前の小さなプラグイン)で数える
 * - ブラウザ: 確認用の作り物(?demo=...)だけ
 */
export type HealthState =
  | 'ready'
  | 'needsPermission'
  | 'denied'
  | 'notInstalled'
  | 'needsUpdate'
  | 'unsupported'
  | 'error';

export type ReadResult =
  | { mode: 'replace'; days: Days }
  | { mode: 'add'; days: Days; mark: SensorMark };

export interface Reader {
  source: Source;
  /** 画面に出す読み取り元の名前 */
  label: string;
  check(asked: boolean): Promise<HealthState>;
  request(): Promise<HealthState>;
  read(today: string, prevMark: SensorMark | null): Promise<ReadResult>;
}

const READ = { read: ['steps' as const] };

/** 何日前まで読むか。記録の画面が最初から空にならないよう、入れる前の分も少し読む */
export const LOOKBACK_DAYS = 30;

const healthReader: Reader = {
  source: 'health',
  label: platform === 'android' ? 'ヘルスコネクト' : 'ヘルスケア',
  async check(asked) {
    try {
      const a = await Health.isAvailable();
      if (!a.available) {
        if (platform === 'android') return /update/i.test(a.reason ?? '') ? 'needsUpdate' : 'notInstalled';
        return 'unsupported';
      }
      if (platform === 'ios') return asked ? 'ready' : 'needsPermission';
      const st = await Health.checkAuthorization(READ);
      if (st.readAuthorized.includes('steps')) return 'ready';
      return asked ? 'denied' : 'needsPermission';
    } catch (e) {
      console.error('[tekuami] health check', e);
      return 'error';
    }
  },
  async request() {
    try {
      const st = await Health.requestAuthorization(READ);
      // iOS は読み取りを断られたかどうかを教えてくれない。聞けたら読みに行き、0 のままなら案内を出す
      if (platform === 'ios') return 'ready';
      return st.readAuthorized.includes('steps') ? 'ready' : 'denied';
    } catch (e) {
      console.error('[tekuami] health request', e);
      return 'error';
    }
  },
  async read(today) {
    const from = parseDayKey(addDays(today, -(LOOKBACK_DAYS - 1)));
    const res = await Health.queryAggregated({
      dataType: 'steps',
      startDate: from.toISOString(),
      endDate: new Date().toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    });
    const days: Days = {};
    for (const s of res.samples) {
      const k = dayKey(new Date(s.startDate));
      if (Number.isFinite(s.value)) days[k] = Math.round((days[k] ?? 0) + s.value);
    }
    // 読んだ範囲で記録が無い日は 0 として置き換える(後から消えた分を残さない)
    for (let i = 0; i < LOOKBACK_DAYS; i++) {
      const k = addDays(today, -i);
      if (days[k] === undefined) days[k] = 0;
    }
    return { mode: 'replace', days };
  },
};

interface StepSensorPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  read(): Promise<{ counter: number; at: number; bootAt: number }>;
}

const StepSensor = registerPlugin<StepSensorPlugin>('StepSensor');

const sensorReader: Reader = {
  source: 'sensor',
  label: 'この端末の歩数センサー',
  async check(asked) {
    try {
      if (!(await StepSensor.isAvailable()).available) return 'unsupported';
      if ((await StepSensor.checkPermission()).granted) return 'ready';
      return asked ? 'denied' : 'needsPermission';
    } catch {
      return 'unsupported';
    }
  },
  async request() {
    try {
      return (await StepSensor.requestPermission()).granted ? 'ready' : 'denied';
    } catch {
      return 'error';
    }
  },
  async read(_today, prevMark) {
    const now = await StepSensor.read();
    const mark: SensorMark = { counter: now.counter, at: now.at, bootAt: now.bootAt };
    return { mode: 'add', days: sensorDelta(prevMark, mark), mark };
  },
};

/** ブラウザで画面を確かめるための作り物 */
const demoReader: Reader = {
  source: 'health',
  label: 'ヘルスケア',
  async check(asked) {
    const m = demoMode();
    if (m === 'notinstalled') return 'notInstalled';
    if (m === 'unsupported' || m === 'off') return 'unsupported';
    if (m === 'denied') return asked ? 'denied' : 'needsPermission';
    return asked ? 'ready' : 'needsPermission';
  },
  async request() {
    return demoMode() === 'denied' ? 'denied' : 'ready';
  },
  async read(today) {
    return { mode: 'replace', days: demoDays(today) };
  },
};

export function readerFor(source: Source | null): Reader {
  if (!isNative) return demoReader;
  if (platform === 'android' && source === 'sensor') return sensorReader;
  return healthReader;
}

export function sensorAvailableOnThisPlatform(): boolean {
  return platform === 'android';
}

/** 設定の画面を開く。Android はヘルスコネクトの設定、iOS はヘルスケアのアプリ */
export async function openHealthSettings(): Promise<boolean> {
  if (!isNative) return false;
  try {
    if (platform === 'android') {
      await Health.openHealthConnectSettings();
      return true;
    }
    window.open('x-apple-health://', '_system');
    return true;
  } catch {
    return false;
  }
}

export const HEALTH_CONNECT_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
