"""アイコン・起動画面を書き出す(1.2.0)。原画は見本C 15 のアイコン(毛糸玉と編み棒)を切り出した物。
切り抜きの縁は丸い角と地が混じるので、少し縮めて同じ桃色の地に置き、縁をぼかしてなじませる。
python tools/make_icons.py"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(os.path.expanduser('~'), 'Downloads', '編み物歩数計「てくあみ」UI提案ボード-3.png')
BG = (250, 223, 204)

src = Image.open(SRC).convert('RGB')
c = src.crop((1087 + 3, 922 + 3, 1164 - 3, 998 - 3))


def icon(size, k=0.9):
    """size 四方。中に k の大きさで原画を置き、縁 8% をぼかす"""
    canvas = Image.new('RGB', (size, size), BG)
    n = int(size * k)
    im = c.resize((n, n), Image.LANCZOS)
    mask = Image.new('L', (n, n), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, n - 1, n - 1), int(n * 0.16), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(n * 0.08))
    canvas.paste(im, ((size - n) // 2, (size - n) // 2), mask)
    return canvas


full = icon(1024)
os.makedirs(os.path.join(ROOT, 'store', 'play'), exist_ok=True)
full.save(os.path.join(ROOT, 'store', 'icon_1024.png'))
full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'store', 'play', 'icon_512.png'))
full.save(os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'))

# iOS の起動画面(2732 四方、真ん中に小さく)
splash = Image.new('RGB', (2732, 2732), BG)
mark = icon(640, 0.98)
splash.paste(mark, ((2732 - 640) // 2, (2732 - 640) // 2))
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    splash.save(os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', n))

# Android
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in dens.items():
    legacy = round(48 * k)
    full.resize((legacy, legacy), Image.LANCZOS).save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher.png'))
    r = full.resize((legacy, legacy), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (legacy * 4, legacy * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, legacy * 4 - 1, legacy * 4 - 1), fill=255)
    r.putalpha(m.resize((legacy, legacy), Image.LANCZOS))
    r.save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_round.png'))
    # アダプティブの前景: 108dp いっぱいに置く(地と同じ色なので、どの形に切られても毛糸玉は真ん中に残る)
    size = round(108 * k)
    icon(size, 0.72).save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_foreground.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FADFCC</color>\n</resources>\n')

for folder in os.listdir(RES):
    if not folder.startswith('drawable'):
        continue
    p = os.path.join(RES, folder, 'splash.png')
    if not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    s = Image.new('RGB', (w, h), BG)
    m = min(w, h) // 3
    s.paste(icon(m, 0.98), ((w - m) // 2, (h - m) // 2))
    s.save(p)
print('icons ok', np.array(full).shape)
