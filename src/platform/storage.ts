import { Preferences } from '@capacitor/preferences';
import { emptyData, normalize, type AppData } from '../domain/data';

/**
 * 記録は端末の中だけ(Preferences = iOS の UserDefaults / Android の SharedPreferences)。
 * 書く前に前回の分を控えに残し、読めなければ控えから戻す。
 */
const KEY = 'tekuami.data.v1';
const BACKUP = 'tekuami.data.v1.prev';

export async function loadData(today: string): Promise<AppData> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (value) return normalize(JSON.parse(value), today);
  } catch {
    /* 下で控えを読む */
  }
  try {
    const { value } = await Preferences.get({ key: BACKUP });
    if (value) return normalize(JSON.parse(value), today);
  } catch {
    /* 空で始める */
  }
  return emptyData(today);
}

let chain: Promise<void> = Promise.resolve();

export function saveData(data: AppData): Promise<void> {
  const json = JSON.stringify(data);
  chain = chain
    .then(async () => {
      const cur = await Preferences.get({ key: KEY });
      if (cur.value) await Preferences.set({ key: BACKUP, value: cur.value });
      await Preferences.set({ key: KEY, value: json });
    })
    .catch((e) => console.error('[tekuami] save failed', e));
  return chain;
}

export async function clearData(): Promise<void> {
  await Preferences.remove({ key: KEY });
  await Preferences.remove({ key: BACKUP });
}
