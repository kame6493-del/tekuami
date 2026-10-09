/**
 * 毛糸の色。1色ごとに4段の濃さを手で決めている(編み目の奥・影・地・光)。
 * 計算で暗くした色にしないのは、毛糸らしいくすみを1色ずつ見て合わせたいから。
 */
export type Shades = readonly [gap: string, shadow: string, base: string, hi: string];

export const YARNS = {
  ecru: ['#8f826d', '#cfc3ac', '#e9e0cc', '#f7f1e3'],
  akane: ['#5a1a12', '#8e2c1f', '#b5402a', '#d46a4e'],
  charcoal: ['#141210', '#2c2824', '#403a34', '#5a524a'],
  navy: ['#0e1626', '#1d2a44', '#2b3c5e', '#43577d'],
  cream: ['#9a8a63', '#dccfa9', '#efe5c6', '#fbf5e1'],
  mustard: ['#5e4508', '#a07a16', '#c99a22', '#e2b94a'],
  brown: ['#22140c', '#4a2e1c', '#64402a', '#82583c'],
  forest: ['#0d2219', '#1e4433', '#2d5e46', '#47805f'],
  red: ['#4a0c0e', '#861b1e', '#a9282b', '#c9484a'],
  pink: ['#8a5560', '#d79aa6', '#eab7c0', '#f6d3d9'],
  cocoa: ['#2a1b15', '#573a2e', '#7a5242', '#9a6f5c'],
  heather: ['#4c4a47', '#8e8b86', '#aba8a2', '#c8c5bf'],
  coral: ['#6e2a1e', '#c55e48', '#e07b62', '#f19c86'],
  teal: ['#0b302e', '#1d5753', '#2c7570', '#4a9690'],
  mint: ['#4f6e62', '#9cc4b4', '#b8dacb', '#d4ede2'],
  black: ['#050505', '#161616', '#252525', '#3a3a3a'],
  white: ['#8c8a86', '#d9d7d2', '#efede8', '#ffffff'],
  orange: ['#6a2c05', '#b85a12', '#de7a20', '#f29c48'],
  azuki: ['#2e0e14', '#5b1f2a', '#7a2e3b', '#9a4655'],
  sky: ['#3c5a70', '#7fa5bf', '#9cbfd6', '#bdd8ea'],
  oat: ['#6e604c', '#b5a68c', '#cdbfa5', '#e2d6bf'],
} as const satisfies Record<string, Shades>;

export type YarnId = keyof typeof YARNS;

export interface Palette {
  id: string;
  name: string;
  /** 地の色・模様の色・差し色 */
  main: YarnId;
  sub: YarnId;
  accent: YarnId;
  pro: boolean;
}

export const PALETTES: readonly Palette[] = [
  { id: 'akane', name: '茜とミルク', main: 'akane', sub: 'cream', accent: 'charcoal', pro: false },
  { id: 'kon', name: '紺と生成り', main: 'navy', sub: 'ecru', accent: 'mustard', pro: false },
  { id: 'karashi', name: 'からし', main: 'mustard', sub: 'cream', accent: 'brown', pro: false },
  { id: 'momi', name: 'もみの木', main: 'forest', sub: 'ecru', accent: 'red', pro: false },
  { id: 'sakura', name: 'さくら', main: 'pink', sub: 'white', accent: 'cocoa', pro: true },
  { id: 'moku', name: '杢グレー', main: 'heather', sub: 'white', accent: 'coral', pro: true },
  { id: 'aotake', name: '青竹', main: 'teal', sub: 'oat', accent: 'navy', pro: true },
  { id: 'hakka', name: '薄荷', main: 'mint', sub: 'brown', accent: 'white', pro: true },
  { id: 'kuro', name: '黒と赤', main: 'black', sub: 'white', accent: 'red', pro: true },
  { id: 'mikan', name: '蜜柑', main: 'orange', sub: 'cream', accent: 'forest', pro: true },
  { id: 'azuki', name: '小豆', main: 'azuki', sub: 'pink', accent: 'oat', pro: true },
  { id: 'sora', name: '空', main: 'sky', sub: 'white', accent: 'navy', pro: true },
];

export function paletteOf(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** 編み針(木)・床の影など、毛糸以外の色 */
export const WOOD: Shades = ['#5b3d1f', '#a67f48', '#c9a36b', '#e6cc98'];
