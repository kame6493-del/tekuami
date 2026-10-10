/**
 * 模様。編み込みの図案と同じで、1文字が編み目1つ。
 *  . = 地の色  o = 模様の色  * = 差し色  # = 濃い茶(目・鼻)
 * どれも手で1マスずつ置いた。右端の1列は次の模様との間(空き)。マフラーの幅(12目)に収める。
 */
export const MOTIFS = {
  heart: ['.oo.oo..', 'ooooooo.', 'ooooooo.', 'ooooooo.', '.ooooo..', '..ooo...', '...o....'],
  snow: ['....o.....', '.o..o..o..', '..o.o.o...', '...ooo....', 'oooo*oooo.', '...ooo....', '..o.o.o...', '.o..o..o..', '....o.....'],
  norwegian: ['....o.....', '...o*o....', '..o***o...', '.o*****o..', 'o***o***o.', '.o*****o..', '..o***o...', '...o*o....', '....o.....'],
  nut: ['.oo...oo..', 'oooo.oooo.', '.oo...oo..', '..*...*...', '...*.*....', '....*.....', '..**.**...', '...***....', '....*.....'],
  cat: ['.o.....o..', '.oo...oo..', '.ooooooo..', '.o#ooo#o..', '.ooo*ooo..', '..ooooo...'],
  mountain: ['...o....', '..ooo..o', '.ooooooo', 'oooooooo'],
  star: ['....o.....', '...ooo....', 'ooooooooo.', '.ooooooo..', '..ooooo...', '..oo.oo...', '.oo...oo..'],
  tree: ['....o.....', '...ooo....', '....o.....', '...ooo....', '..ooooo...', '.ooooooo..', '....*.....'],
  dog: ['.oo....oo..', 'oooooooooo.', 'oooooooooo.', 'oo#oooo#oo.', 'oooooooooo.', 'ooo.##.ooo.', '.oo....oo..', '..oooooo...'],
  nordic: ['o..o..', '......', '..o...', '.o*o..', 'o***o.', '.o*o..', '..o...', '......', 'o..o..'],
  rabbit: ['..o...o..', '..o...o..', '..oo.oo..', '.ooooooo.', '.o#ooo#o.', '.ooo*ooo.', '..ooooo..'],
  flower: ['...oo....', '..o**o...', '.oo**oo..', '..oooo...', '....*....', '..*.*.*..', '...***...', '....*....'],
  zigzag: ['o...', '.o.o', '..o.'],
  check: ['oo..', 'oo..', '..oo', '..oo'],
  dots: ['o...', '....', '..o.', '....'],
  cross: ['.o.', 'ooo', '.o.', '...'],
} as const satisfies Record<string, readonly string[]>;

export type MotifId = keyof typeof MOTIFS;

/**
 * 模様の組。大きい模様1つと、間に入る細い帯1つ。
 * 名前は編み上がったときに初めて出す(何の模様かは編むまで秘密)。
 * repeat=true は横に繰り返す模様。
 */
export interface Pattern {
  id: string;
  name: string;
  big: MotifId;
  band: MotifId;
  pro: boolean;
  repeat?: boolean;
}

/** 見本D・B の12種(並びも見本どおり)。無料6・毛糸ぶくろで6つ増える */
export const PATTERNS: readonly Pattern[] = [
  { id: 'heart', name: 'ハート', big: 'heart', band: 'dots', pro: false },
  { id: 'snow', name: '雪の結晶', big: 'snow', band: 'zigzag', pro: false },
  { id: 'norwegian', name: 'ノルディック', big: 'norwegian', band: 'cross', pro: false },
  { id: 'nut', name: '木の実', big: 'nut', band: 'dots', pro: true },
  { id: 'cat', name: 'ねこ', big: 'cat', band: 'dots', pro: true },
  { id: 'mountain', name: 'やま', big: 'mountain', band: 'zigzag', pro: false, repeat: true },
  { id: 'star', name: '星', big: 'star', band: 'cross', pro: false },
  { id: 'tree', name: 'ツリー', big: 'tree', band: 'dots', pro: false },
  { id: 'dog', name: 'いぬ', big: 'dog', band: 'check', pro: true },
  { id: 'nordic', name: '北欧風', big: 'nordic', band: 'zigzag', pro: true, repeat: true },
  { id: 'rabbit', name: 'うさぎ', big: 'rabbit', band: 'dots', pro: true },
  { id: 'flower', name: 'お花', big: 'flower', band: 'cross', pro: true },
];

/** 1.1.0 までの模様 → 1.2.0 */
export const PATTERN_ALIAS: Record<string, string> = { leaf: 'tree' };

/** 選ぶ画面の見本用。模様を入れず地の色だけで描く(本番の模様は編むまで見せない) */
export const PLAIN: Pattern = { id: 'plain', name: '', big: 'dots', band: 'dots', pro: false };

export function patternOf(id: string): Pattern {
  if (id === PLAIN.id) return PLAIN;
  const k = PATTERN_ALIAS[id] ?? id;
  return PATTERNS.find((p) => p.id === k) ?? PATTERNS[0];
}
