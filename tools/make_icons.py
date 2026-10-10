"""アイコン・起動画面を書き出す(1.2.1)。原画は持ち主から渡された store/icon_source_1024.png
(毛糸玉・編み棒・ハートの編み地・足あと。元の絵は store/icon_source_original.png)。python tools/make_icons.py
- iOS AppIcon・store/icon_1024.png・store/play/icon_512.png: 原画そのまま(不透明)
- Android 適応アイコン: 背景は生成りの単色、前景は原画を縮めて真ん中に置き、縁をぼかして背景になじませる。
  安全域(108dp の真ん中の直径 66dp の円)に毛糸玉と編み地が入る大きさにする
- 丸アイコン(古い端末用): 生成りの丸に、原画を縮めて置く
"""
import os

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
SRC = os.path.join(ROOT, 'store', 'icon_source_1024.png')
BG = (250, 229, 199)
BG_HEX = '#FAE5C7'

full = Image.open(SRC).convert('RGB').resize((1024, 1024), Image.LANCZOS)
# 縁(元の札の影)を除いた中身。適応アイコン・丸・起動画面に使う
inner = full.crop((40, 40, 984, 984)).resize((1024, 1024), Image.LANCZOS)


def soft(size, k):
    """size 四方の透明な地に、原画を k の大きさで置き、外側を丸くぼかして消す"""
    n = int(size * k)
    im = inner.resize((n, n), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (n, n), 0)
    pad = int(n * 0.04)
    ImageDraw.Draw(mask).rounded_rectangle((pad, pad, n - 1 - pad, n - 1 - pad), int(n * 0.3), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(n * 0.05))
    im.putalpha(mask)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - n) // 2, (size - n) // 2), im)
    return canvas


def on_bg(size, k):
    c = Image.new('RGB', (size, size), BG)
    f = soft(size, k)
    c.paste(f, (0, 0), f)
    return c


# 前景の大きさ: 108dp のうち FG_K。直径 66dp の円の安全域に毛糸玉と編み地が入る(編み地の右下の角まで。work/look/launcher.png で確かめた)
FG_K = 0.56

os.makedirs(os.path.join(ROOT, 'store', 'play'), exist_ok=True)
full.save(os.path.join(ROOT, 'store', 'icon_1024.png'))
full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, 'store', 'play', 'icon_512.png'))
full.save(os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'))
# アプリの中で見せる用(このアプリについて)
full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'src', 'assets', 'ref', 'app_icon.webp'), 'WEBP', quality=88)

# iOS の起動画面(2732 四方、真ん中に)
splash = Image.new('RGB', (2732, 2732), BG)
mark = soft(760, 1.0)
splash.paste(mark, ((2732 - 760) // 2, (2732 - 760) // 2), mark)
for n in ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']:
    splash.save(os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset', n))

RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, k in dens.items():
    legacy = round(48 * k)
    full.resize((legacy, legacy), Image.LANCZOS).save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher.png'))
    # 丸: 生成りの丸に、円に収まる大きさで
    r = on_bg(legacy * 4, 0.84).resize((legacy, legacy), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (legacy * 4, legacy * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, legacy * 4 - 1, legacy * 4 - 1), fill=255)
    r.putalpha(m.resize((legacy, legacy), Image.LANCZOS))
    r.save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_round.png'))
    size = round(108 * k)
    soft(size, FG_K).save(os.path.join(RES, f'mipmap-{d}', 'ic_launcher_foreground.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8', newline='\n') as fh:
    fh.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BG_HEX}</color>\n</resources>\n')

for folder in os.listdir(RES):
    if not folder.startswith('drawable'):
        continue
    p = os.path.join(RES, folder, 'splash.png')
    if not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    s = Image.new('RGB', (w, h), BG)
    # 起動画面は一瞬なので絵は小さめに(写真のような絵を大きく入れると AAB が 10MB を超える)
    m = min(w, h) // 4
    f = soft(m, 1.0)
    s.paste(f, ((w - m) // 2, (h - m) // 2), f)
    # 色数を 160 に減らして軽くする(地は1色なので見た目はほぼ変わらない)
    s.quantize(colors=160, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(p, optimize=True)
print('icons ok')
