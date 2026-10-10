"""src/assets/ref/ から、画面で使っていない切り出しを消す(AAB を Play のブラウザ上限 10MB 未満に保つため)。
crop_ref.py・crop_ref2.py の後に流す。python tools/prune_ref.py
使っているかは src の中に名前が出てくるかで見る。名前を組み立てて使う物(tile_ など)は頭の文字で残す。"""
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
REF = os.path.join(ROOT, 'src', 'assets', 'ref')
src = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.ts*'), recursive=True) + glob.glob(os.path.join(ROOT, 'src', '*.css')))
# 名前を組み立てて使う物(`tile_${...}` など)
DYN = ['tile_', 'd_ball_', 'c_item_', 'b_tab_']
removed = 0
for f in glob.glob(os.path.join(REF, '*.webp')):
    n = os.path.basename(f)[:-5]
    if any(n.startswith(p) for p in DYN):
        continue
    if re.search(r"(['\"/])" + re.escape(n) + r"(['\".])", src):
        continue
    os.remove(f)
    removed += 1
print('使っていない絵を消しました:', removed, '/ 残り', len(glob.glob(os.path.join(REF, '*.webp'))))
