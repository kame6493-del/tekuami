/**
 * 見本の画像(持ち主から渡された UI コラージュ)から切り出した絵。tools/crop_ref.py で作る。
 * 名前 → URL
 */
const files = import.meta.glob('../assets/ref/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

const REF: Record<string, string> = {};
for (const [k, v] of Object.entries(files)) REF[k.split('/').pop()!.replace('.webp', '')] = v;

export function ref(name: string): string {
  return REF[name] ?? '';
}
