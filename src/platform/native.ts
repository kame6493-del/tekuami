import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/** 押したときの小さな振動 */
export function tap() {
  if (isNative) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/** 段が編めた・仕上がったときの振動 */
export function success() {
  if (isNative) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

/** アプリが前に戻ったとき */
export function onResume(fn: () => void): () => void {
  if (!isNative) {
    const h = () => document.visibilityState === 'visible' && fn();
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }
  const p = App.addListener('resume', fn);
  return () => {
    p.then((l) => l.remove()).catch(() => {});
  };
}

/** Android の戻るボタン。true を返したら処理済み */
export function onBack(fn: () => boolean): () => void {
  if (platform !== 'android') return () => {};
  const p = App.addListener('backButton', () => {
    if (!fn()) App.minimizeApp().catch(() => {});
  });
  return () => {
    p.then((l) => l.remove()).catch(() => {});
  };
}

/** 画像と一言を共有する。ブラウザでは保存に回す */
export async function shareImage(dataUrl: string, text: string, fileName: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const base64 = dataUrl.split(',')[1] ?? '';
  if (isNative) {
    try {
      const f = await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
      await Share.share({ text, files: [f.uri], dialogTitle: '見せる' });
      return 'shared';
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (/cancel/i.test(msg)) return 'cancelled';
      throw e;
    }
  }
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ text, files: [file] });
      return 'shared';
    }
  } catch {
    return 'cancelled';
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  a.click();
  return 'saved';
}

export async function openUrl(url: string) {
  window.open(url, '_blank', 'noopener');
}
