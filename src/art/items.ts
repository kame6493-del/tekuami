/**
 * 編む物の形。1文字が編み目1つ。上の行が仕上がりの上、編むのは下の行から。
 *  . = 無い所  x = 地の編み目  r = ゴム編み(袖口・裾)  h = 差し色(かかと・つま先・縁)
 * 1行ずつ手で置いている。直したら ?art=1 の見本で拡大して確かめる。
 * 1段は何目でも同じ歩数(設定の「1段の歩数」、ふつう500歩)。
 */
export type Cell = '.' | 'x' | 'r' | 'h';

export interface ItemDef {
  id: string;
  name: string;
  /** 箱の絞り込みの名前 */
  short: string;
  /** 作品の詳細に出す大きさ */
  size: string;
  /** 作品の詳細の一言 */
  note: string;
  pro: boolean;
  /** 上から下へ */
  rows: readonly string[];
  /** 仕上げの飾り */
  decor: 'fringe' | 'pompom' | 'none';
  /** 大きい模様を真ん中に置く範囲(列)。省くと全幅 */
  span?: readonly [number, number];
}

const MUFFLER = Array.from({ length: 36 }, () => 'xxxxxxxxxxxx');

const HAT = [
  '......xxxx......',
  '....xxxxxxxx....',
  '...xxxxxxxxxx...',
  '..xxxxxxxxxxxx..',
  ...Array.from({ length: 11 }, () => '.xxxxxxxxxxxxxx.'),
  ...Array.from({ length: 5 }, () => 'rrrrrrrrrrrrrrrr'),
];

const MITTEN = [
  '.....xxxxx..',
  '....xxxxxxx.',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '.x.xxxxxxxxx',
  'xx.xxxxxxxxx',
  'xxxxxxxxxxxx',
  '.xxxxxxxxxxx',
  '..xxxxxxxxxx',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '...xxxxxxxxx',
  '...rrrrrrrrr',
  '...rrrrrrrrr',
  '...rrrrrrrrr',
  '...rrrrrrrrr',
];

const SOCK = [
  '.rrrrrrr........',
  '.rrrrrrr........',
  '.rrrrrrr........',
  '.rrrrrrr........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxx........',
  '.xxxxxxxx.......',
  '.xxxxxxxxx......',
  '.xxxxxxxxxxx....',
  'hxxxxxxxxxxxxx..',
  'hhxxxxxxxxxxxhh.',
  'hhxxxxxxxxxxxhhh',
  'hhhxxxxxxxxxxhhh',
  'hhhxxxxxxxxxxhhh',
  '.hhxxxxxxxxxxhhh',
  '..hxxxxxxxxxxhh.',
  '....xxxxxxxxxh..',
];

const SWEATER = [
  '........xxxx....xxxx........',
  '......xxxxxxrrrrxxxxxx......',
  '....xxxxxxxxxxxxxxxxxxxx....',
  '..xxxxxxxxxxxxxxxxxxxxxxxx..',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'xxxxx.xxxxxxxxxxxxxxxx.xxxxx',
  ...Array.from({ length: 11 }, () => 'xxxxx..xxxxxxxxxxxxxx..xxxxx'),
  'rrrrr..xxxxxxxxxxxxxx..rrrrr',
  'rrrrr..xxxxxxxxxxxxxx..rrrrr',
  'rrrrr..xxxxxxxxxxxxxx..rrrrr',
  '.......rrrrrrrrrrrrrr.......',
  '.......rrrrrrrrrrrrrr.......',
  '.......rrrrrrrrrrrrrr.......',
];

const BLANKET = [
  'hhhhhhhhhhhhhhhhhhhhhh',
  ...Array.from({ length: 26 }, () => 'hxxxxxxxxxxxxxxxxxxxxh'),
  'hhhhhhhhhhhhhhhhhhhhhh',
];

export const ITEMS: readonly ItemDef[] = [
  { id: 'muffler', name: 'マフラー', short: 'マフラー', size: '約150cm', note: 'ふんわりあたたかなマフラーができました。たくさん歩いた証です。', pro: false, rows: MUFFLER, decor: 'fringe' },
  { id: 'hat', name: 'ニット帽', short: 'ぼうし', size: '頭まわり 約54cm', note: 'ぽんぽんのついたニット帽ができました。寒い朝のおさんぽに。', pro: false, rows: HAT, decor: 'pompom', span: [1, 15] },
  { id: 'mitten', name: 'ミトン', short: 'ミトン', size: '約24cm', note: '両手ぶんのミトンができました。ひとつずつ、歩いて編んだ手袋です。', pro: false, rows: MITTEN, decor: 'none', span: [3, 12] },
  { id: 'sock', name: 'くつした', short: 'くつした', size: '約23cm', note: 'あったかいくつしたができました。足もとから、ほっとひと息。', pro: true, rows: SOCK, decor: 'none', span: [1, 8] },
  { id: 'sweater', name: 'セーター', short: 'セーター', size: '身幅 約52cm', note: 'たくさん歩いて、セーターが編み上がりました。よくがんばりました。', pro: true, rows: SWEATER, decor: 'none', span: [7, 21] },
  { id: 'blanket', name: 'ひざかけ', short: 'ひざかけ', size: '約70×100cm', note: '大きなひざかけができました。ここまで歩いた日々がつまっています。', pro: true, rows: BLANKET, decor: 'fringe', span: [1, 21] },
];

export function itemOf(id: string): ItemDef {
  return ITEMS.find((i) => i.id === id) ?? ITEMS[0];
}

export const widthOf = (item: ItemDef) => item.rows[0].length;
export const heightOf = (item: ItemDef) => item.rows.length;

/** 編む順(下の行から)に、行 r の文字列を返す */
export function rowFromBottom(item: ItemDef, r: number): string {
  return item.rows[item.rows.length - 1 - r];
}

/** その行で編み目のある列の一覧(左から) */
export function stitchColumns(item: ItemDef, r: number): number[] {
  const row = rowFromBottom(item, r);
  const cols: number[] = [];
  for (let c = 0; c < row.length; c++) if (row[c] !== '.') cols.push(c);
  return cols;
}
