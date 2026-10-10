/**
 * 模様。編み込みの図案と同じで、1文字が編み目1つ。
 *  . = 地の色  o = 模様の色  * = 差し色  # = 濃い茶(目・鼻)
 * どれも手で1マスずつ置いた。右端の1列は次の模様との間(空き)。
 */
export const MOTIFS = {
  heart: [
    '.oo.oo..',
    'ooooooo.',
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
  star: [
    '....o.....',
    '...ooo....',
    'ooooooooo.',
    '.ooooooo..',
    '..ooooo...',
    '..oo.oo...',
    '.oo...oo..',
  ],
  leaf: [
    '....o.....',
    '...ooo....',
    '.o..o..o..',
    'oo..o..oo.',
    'ooo.o.ooo.',
    '.ooooooo..',
    '....o.....',
    '.o..o..o..',
    'oo..o..oo.',
    'ooo.o.ooo.',
    '.ooooooo..',
    '....o.....',
  ],
  dog: [
    '.oo....oo..',
    'oooooooooo.',
    'oooooooooo.',
    'oo#oooo#oo.',
    'oooooooooo.',
    'ooo.##.ooo.',
    '.oo....oo..',
    '..oooooo...',
  ],
  nordic: [
    'o..o..',
    '......',
    '..o...',
    '.o*o..',
    'o***o.',
    '.o*o..',
    '..o...',
    '......',
    'o..o..',
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
 * repeat=true は横に繰り返す模様(北欧風)。
 */
export interface Pattern {
  id: string;
  name: string;
  big: MotifId;
  band: MotifId;
  pro: boolean;
  repeat?: boolean;
}

/** 見本の6種。無料は ハート・雪の結晶・星、毛糸ぶくろで 木の葉・いぬ・北欧風 */
export const PATTERNS: readonly Pattern[] = [
  { id: 'heart', name: 'ハート', big: 'heart', band: 'dots', pro: false },
  { id: 'snow', name: '雪の結晶', big: 'snow', band: 'zigzag', pro: false },
  { id: 'star', name: '星', big: 'star', band: 'cross', pro: false },
  { id: 'leaf', name: '木の葉', big: 'leaf', band: 'dots', pro: true },
  { id: 'dog', name: 'いぬ', big: 'dog', band: 'check', pro: true },
  { id: 'nordic', name: '北欧風', big: 'nordic', band: 'zigzag', pro: true, repeat: true },
];

/** 選ぶ画面の見本用。模様を入れず地の色だけで描く(本番の模様は編むまで見せない) */
export const PLAIN: Pattern = { id: 'plain', name: '', big: 'dots', band: 'dots', pro: false };

export function patternOf(id: string): Pattern {
  if (id === PLAIN.id) return PLAIN;
  return PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];
}
