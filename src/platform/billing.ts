import { Capacitor } from '@capacitor/core';
import { Purchases, type CustomerInfo, type PurchasesPackage } from '@revenuecat/purchases-capacitor';

/**
 * 課金は RevenueCat。買い切り(非消耗型)1つだけ。
 * - 商品ID: tekuami_yarnbag(App Store / Google Play 共通の名前にする)
 * - entitlement: yarnbag
 * キーは公開用の API キー(秘密ではない)。空のままなら購入ボタンは「購入は準備中です」になり、課金は走らない。
 */
export const BILLING = {
  productId: 'tekuami_yarnbag',
  entitlement: 'yarnbag',
  /** ストアから値段が取れないときの表示(ブラウザの確認用) */
  fallbackPrice: '¥480',
  keys: { ios: 'appl_ojdAceeDiJQpKrLXWknfHvsPpgs', android: '' },
} as const;

export type BillingState =
  | { status: 'unavailable'; reason: string; pro: boolean }
  | { status: 'ready'; pro: boolean; price: string; pkg: PurchasesPackage | null };

const platform = Capacitor.getPlatform();
const key = platform === 'ios' ? BILLING.keys.ios : platform === 'android' ? BILLING.keys.android : '';
/** ブラウザで開いたときだけ、画面確認用の疑似購入を使う(端末のアプリでは使わない) */
const mock = !Capacitor.isNativePlatform();
const MOCK_KEY = 'tekuami.mockYarnbag';

const proOf = (info: CustomerInfo) => BILLING.entitlement in info.entitlements.active;

let configured = false;
async function ensure() {
  if (configured) return;
  await Purchases.configure({ apiKey: key });
  configured = true;
}

function mockPro(): boolean {
  try {
    return localStorage.getItem(MOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export async function loadBilling(): Promise<BillingState> {
  if (mock) {
    if (new URLSearchParams(location.search).get('billing') === 'off') return { status: 'unavailable', reason: '購入は準備中です', pro: false };
    return { status: 'ready', pro: mockPro(), price: BILLING.fallbackPrice, pkg: null };
  }
  if (!key) return { status: 'unavailable', reason: '購入は準備中です', pro: false };
  try {
    await ensure();
    const [{ customerInfo }, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
    const pkg = offerings.current?.availablePackages.find((p) => p.product.identifier === BILLING.productId) ?? null;
    return { status: 'ready', pro: proOf(customerInfo), price: pkg?.product.priceString ?? '', pkg };
  } catch (e) {
    console.error('[tekuami] billing', e);
    return { status: 'unavailable', reason: 'ストアにつながりませんでした', pro: false };
  }
}

export function canBuy(state: BillingState): boolean {
  return state.status === 'ready' && (mock || !!state.pkg);
}

/** true=開いた / false=やめた。失敗は例外 */
export async function purchase(state: BillingState): Promise<boolean> {
  if (mock) {
    try {
      localStorage.setItem(MOCK_KEY, '1');
    } catch {
      /* 確認用なので無視 */
    }
    return true;
  }
  if (state.status !== 'ready' || !state.pkg) throw new Error('今は購入できません');
  await ensure();
  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: state.pkg });
    return proOf(customerInfo);
  } catch (e) {
    if ((e as { userCancelled?: boolean })?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (mock) return mockPro();
  if (!key) return false;
  await ensure();
  const { customerInfo } = await Purchases.restorePurchases();
  return proOf(customerInfo);
}
