/**
 * 毛糸の色。見本D の毛糸玉から1色ずつ取った地の色に、編み目の奥・影・光の3段を足して4段にする。
 */
export type Shades = readonly [gap: string, shadow: string, base: string, hi: string];

export const YARN_BASE = {
  cream: '#f5ead6',
  snow: '#f7f2ea',
  peach: '#eba27a',
  peachDeep: '#cf7a52',
  ichigo: '#d65750',
  ichigoDeep: '#a83a35',
  moss: '#5f7350',
  mossLight: '#9ba580',
  sky: '#86b6d4',
  skyDeep: '#5f8fb0',
  beige: '#dcc3a6',
  lilac: '#c9b0d4',
  lavender: '#8f6f9a',
  wheat: '#e0bd95',
  wheatDeep: '#a9713f',
  charcoal: '#3b332d',
  gray: '#a89c92',
  sakura: '#f2a7a0',
  sakuraDeep: '#d47460',
  willow: '#cdb59c',
  willowDeep: '#8a6a52',
  mustard: '#e3a142',
  mustardDeep: '#b06c1c',
  akazukin: '#c43a33',
  akazukinDeep: '#8a2420',
  yomogi: '#a5a67c',
  yomogiDeep: '#596040',
  aoumi: '#3f76a6',
  aoumiDeep: '#2c4b6c',
  kuri: '#8d5536',
  kuriDeep: '#5a321e',
  navy: '#3c4560',
  navyDeep: '#262a36',
  silver: '#d6cfc6',
  bark: '#4d362b',
} as const;

export type YarnId = keyof typeof YARN_BASE;

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function toHex(rgb: readonly number[]): string {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** a と b を t の割合で混ぜる */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

/** 地の色から4段の濃さを作る。影は少し赤みのある茶へ寄せる(毛糸のくすみ) */
export function shadesOf(base: string): Shades {
  return [mix(base, '#2a1810', 0.62), mix(base, '#3a2418', 0.3), base, mix(base, '#fffaf2', 0.5)];
}

export const YARNS = Object.fromEntries(Object.entries(YARN_BASE).map(([k, v]) => [k, shadesOf(v)])) as Record<YarnId, Shades>;

export interface Palette {
  id: string;
  name: string;
  /** 地の色・模様の色・差し色(帯・ゴム編み・ぼんぼん) */
  main: YarnId;
  sub: YarnId;
  accent: YarnId;
  pro: boolean;
}

/** 見本D の16色。基本の8色は無料、毛糸ぶくろで8色増える */
export const PALETTES: readonly Palette[] = [
  { id: 'milk', name: 'ミルク', main: 'cream', sub: 'peach', accent: 'peachDeep', pro: false },
  { id: 'ichigo', name: 'いちご', main: 'cream', sub: 'ichigo', accent: 'ichigoDeep', pro: false },
  { id: 'mori', name: 'もり', main: 'moss', sub: 'cream', accent: 'mossLight', pro: false },
  { id: 'sora', name: 'そら', main: 'cream', sub: 'skyDeep', accent: 'sky', pro: false },
  { id: 'yuki', name: 'ゆき', main: 'snow', sub: 'beige', accent: 'beige', pro: false },
  { id: 'lavender', name: 'ラベンダー', main: 'cream', sub: 'lavender', accent: 'lilac', pro: false },
  { id: 'komugi', name: 'こむぎ', main: 'cream', sub: 'wheatDeep', accent: 'wheat', pro: false },
  { id: 'sumi', name: 'すみ', main: 'charcoal', sub: 'cream', accent: 'gray', pro: false },
  { id: 'sakuramochi', name: 'さくらもち', main: 'cream', sub: 'sakuraDeep', accent: 'sakura', pro: true },
  { id: 'nekoyanagi', name: 'ねこやなぎ', main: 'willow', sub: 'cream', accent: 'willowDeep', pro: true },
  { id: 'mustard', name: 'マスタード', main: 'cream', sub: 'mustard', accent: 'mustardDeep', pro: true },
  { id: 'akazukin', name: 'あかずきん', main: 'akazukin', sub: 'cream', accent: 'akazukinDeep', pro: true },
  { id: 'yomogi', name: 'よもぎ', main: 'yomogi', sub: 'cream', accent: 'yomogiDeep', pro: true },
  { id: 'aoumi', name: 'あおうみ', main: 'aoumi', sub: 'cream', accent: 'aoumiDeep', pro: true },
  { id: 'kuri', name: 'くり', main: 'kuri', sub: 'cream', accent: 'kuriDeep', pro: true },
  { id: 'yozora', name: 'よぞら', main: 'navy', sub: 'silver', accent: 'navyDeep', pro: true },
];

/** 1.1.0 までの色の名前 → 1.2.0 の色(保存された記録を読み直すとき) */
export const PALETTE_ALIAS: Record<string, string> = { cafe: 'komugi', ringo: 'akazukin', mimoza: 'mustard' };

export function paletteOf(id: string): Palette {
  const k = PALETTE_ALIAS[id] ?? id;
  return PALETTES.find((p) => p.id === k) ?? PALETTES[0];
}

/** 編み針(木) */
export const WOOD: Shades = ['#6b4524', '#a8743e', '#cf9d5f', '#f0cf98'];
