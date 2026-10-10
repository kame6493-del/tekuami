"""アイコン・起動画面を書き出す。原画は work/shots/icon_1024.png(背景つき)と icon_fg_1024.png(背景なし)。
1.1.0 から: 針に掛かったハートの編み地(アプリの編み目と同じ描き方)。先に python tools/shot_icon.py を流す。"""
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SHOTS = os.path.join(ROOT, 'work', 'shots')
BG = (0xFB, 0xF3, 0xE6)

full = Image.open(os.path.join(SHOTS, 'icon_1024.png')).convert('RGB')
fg = Image.open(os.path.join(SHOTS, 'icon_fg_1024.png')).convert('RGBA')


def resized(im, size):
    return im.resize((size, size), Image.LANCZOS)


# ストア
os.makedirs(os.path.join(ROOT, 'store', 'play'), exist_ok=True)
full.save(os.path.join(ROOT, 'store', 'icon_1024.png'))
resized(full, 512).save(os.path.join(ROOT, 'store', 'play', 'icon_512.png'))

# iOS(アルファ無しの 1024)
ios_icon = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png')
full.save(ios_icon)

# iOS の起動画面(2732 四方、真ん中に小さく)
splash = Image.new('RGB', (2732, 2732), BG)
mark = fg.resize((560, 560), Image.LANCZOS)
splash.paste(mark, ((2732 - 560) // 2, (2732 - 560) // 2), mark)
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    splash.save(os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', n))

# Android
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in dens.items():
    legacy = round(48 * k)
    resized(full, legacy).save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher.png'))
    # 丸いアイコン: 円の外を背景色で埋めずに透明に
    r = resized(full, legacy).convert('RGBA')
    mask = Image.new('L', (legacy * 4, legacy * 4), 0)
    from PIL import ImageDraw

    ImageDraw.Draw(mask).ellipse((0, 0, legacy * 4 - 1, legacy * 4 - 1), fill=255)
    r.putalpha(mask.resize((legacy, legacy), Image.LANCZOS))
    r.save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_round.png'))
    # アダプティブの前景: 108dp の中央 66%(72dp)に収める
    size = round(108 * k)
    inner = round(72 * k)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    f = resized(fg, inner)
    canvas.paste(f, ((size - inner) // 2, (size - inner) // 2), f)
    canvas.save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_foreground.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FBF3E6</color>\n</resources>\n')

# Android の起動画面(縦横とも、真ん中に小さく)
for folder in os.listdir(RES):
    if not folder.startswith('drawable'):
        continue
    p = os.path.join(RES, folder, 'splash.png')
    if not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    s = Image.new('RGB', (w, h), BG)
    m = min(w, h) // 3
    mk = fg.resize((m, m), Image.LANCZOS)
    s.paste(mk, ((w - m) // 2, (h - m) // 2), mk)
    s.save(p)
print('icons ok')
