/**
 * 模様。編み込みの図案と同じで、1文字が編み目1つ。横に繰り返して並べる。
 *  . = 地の色  o = 模様の色  * = 差し色
 * どれも手で1マスずつ置いた。右端の1列は次の模様との間(空き)。
 */
export interface Motif {
  id: string;
  rows: readonly string[];
}

export const MOTIFS = {
  heart: [
    '.oo.oo..',
    'ooooooo.',
    'ooooooo.',
    '.ooooo..',
    '..ooo...',
    '...o....',
  ],
  snow: [
    '....o.....',
    '.o..o..o..',
    '..o.o.o...',
    '...ooo....',
    'oooo*oooo.',
    '...ooo....',
    '..o.o.o...',
    '.o..o..o..',
    '....o.....',
  ],
  tree: [
    '...o....',
    '..ooo...',
    '...o....',
    '..ooo...',
    '.ooooo..',
    'ooooooo.',
    '...*....',
  ],
  zigzag: [
    'o...',
    '.o.o',
    '..o.',
  ],
  check: [
    'oo..',
    'oo..',
    '..oo',
    '..oo',
  ],
  dots: [
    'o...',
    '....',
    '..o.',
    '....',
  ],
  cat: [
    '.o.....o..',
    '.oo...oo..',
    '.ooooooo..',
    '.o*ooo*o..',
    '.ooo*ooo..',
    '..ooooo...',
  ],
  diamond: [
    '...o....',
    '..o*o...',
    '.o***o..',
    'o*****o.',
    '.o***o..',
    '..o*o...',
    '...o....',
  ],
  star: [
    '..o...o...',
    '..oo.oo...',
    'oooo.oooo.',
    '.ooo.ooo..',
    '....*.....',
    '.ooo.ooo..',
    'oooo.oooo.',
    '..oo.oo...',
    '..o...o...',
  ],
  wave: [
    '.oo.....',
    'o..o....',
    '....o..o',
    '.....oo.',
  ],
  acorn: [
    '....*....',
    '..ooooo..',
    '.ooooooo.',
    '.*******.',
    '.*******.',
    '..*****..',
    '...***...',
    '....*....',
  ],
  cross: [
    '.o.',
    'ooo',
    '.o.',
    '...',
  ],
} as const satisfies Record<string, readonly string[]>;

export type MotifId = keyof typeof MOTIFS;

/**
 * 模様の組。大きい模様1つと、間に入る細い帯1つ。
 * 名前は編み上がったときに初めて出す(何の模様かは編むまで秘密)。
 */
export interface Pattern {
  id: string;
  name: string;
  big: MotifId;
  band: MotifId;
  pro: boolean;
}

export const PATTERNS: readonly Pattern[] = [
  { id: 'heart', name: 'ハート', big: 'heart', band: 'dots', pro: false },
  { id: 'snow', name: '雪の結晶', big: 'snow', band: 'zigzag', pro: false },
  { id: 'tree', name: 'もみの木', big: 'tree', band: 'dots', pro: false },
  { id: 'zigzag', name: 'ぎざぎざ', big: 'zigzag', band: 'check', pro: false },
  { id: 'check', name: '市松', big: 'check', band: 'zigzag', pro: false },
  { id: 'dots', name: '水玉', big: 'dots', band: 'cross', pro: false },
  { id: 'cat', name: 'ねこ', big: 'cat', band: 'dots', pro: true },
  { id: 'diamond', name: 'ひし形', big: 'diamond', band: 'zigzag', pro: true },
  { id: 'star', name: '北欧の星', big: 'star', band: 'cross', pro: true },
  { id: 'wave', name: 'なみ', big: 'wave', band: 'dots', pro: true },
  { id: 'acorn', name: 'どんぐり', big: 'acorn', band: 'check', pro: true },
  { id: 'cross', name: '十字', big: 'cross', band: 'zigzag', pro: true },
];

/** 選ぶ画面の見本用。模様を入れず地の色だけで描く(本番の模様は編むまで見せない) */
export const PLAIN: Pattern = { id: 'plain', name: '', big: 'dots', band: 'dots', pro: false };

export function patternOf(id: string): Pattern {
  if (id === PLAIN.id) return PLAIN;
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
}
