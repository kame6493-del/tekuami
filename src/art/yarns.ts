/**
 * 毛糸の色。見本の毛糸玉から1色ずつ取った地の色に、編み目の奥・影・光の3段を足して4段にする。
 */
export type Shades = readonly [gap: string, shadow: string, base: string, hi: string];

export const YARN_BASE = {
  strawberry: '#d97b80',
  milkpink: '#ecbdb6',
  milk: '#f3e3cd',
  sky: '#6e8fc0',
  mist: '#aebdd3',
  snow: '#f2e8d9',
  moss: '#66714a',
  olive: '#9c936f',
  sage: '#e1dbc0',
  lavender: '#a386b5',
  lilac: '#cfbdd9',
  lace: '#efe5da',
  cocoa: '#8d6450',
  latte: '#b8977c',
  oat: '#eedac3',
  navy: '#3e4b6c',
  dusk: '#838a9e',
  silver: '#d4cbc0',
  apple: '#c1443c',
  apricot: '#d68a65',
  caramel: '#e9c094',
  mimosa: '#e0a64e',
  cream: '#f5ebd5',
  pistachio: '#c9cfa6',
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

/** 見本の8組。名前も見本どおり。毛糸ぶくろで開くのは 夜空・りんご・ミモザ */
export const PALETTES: readonly Palette[] = [
  { id: 'ichigo', name: 'いちごみるく', main: 'milk', sub: 'strawberry', accent: 'strawberry', pro: false },
  { id: 'sora', name: '空と雪', main: 'sky', sub: 'snow', accent: 'mist', pro: false },
  { id: 'mori', name: '森のこもれび', main: 'moss', sub: 'sage', accent: 'olive', pro: false },
  { id: 'lavender', name: 'ラベンダー', main: 'lilac', sub: 'lace', accent: 'lavender', pro: false },
  { id: 'cafe', name: 'カフェオレ', main: 'latte', sub: 'oat', accent: 'cocoa', pro: false },
  { id: 'yozora', name: '夜空', main: 'navy', sub: 'silver', accent: 'dusk', pro: true },
  { id: 'ringo', name: 'りんご', main: 'apple', sub: 'caramel', accent: 'apricot', pro: true },
  { id: 'mimoza', name: 'ミモザ', main: 'mimosa', sub: 'cream', accent: 'pistachio', pro: true },
];

export function paletteOf(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** 編み針(木) */
export const WOOD: Shades = ['#6b4524', '#a8743e', '#cf9d5f', '#f0cf98'];
