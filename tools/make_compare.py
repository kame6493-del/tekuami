"""見本(持ち主の UI コラージュ)とアプリの画面を左右に並べた比較画像を docs/compare_*.png に作る。
アプリの画面は dist をブラウザで開いて撮った本物(375×812)。python tools/make_compare.py"""
import os

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

from serve import serve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
DOCS = os.path.join(ROOT, 'docs')
RAW = os.path.join(ROOT, 'work', 'compare_raw')
os.makedirs(RAW, exist_ok=True)
SRC = os.path.join(os.path.expanduser('~'), 'Downloads', 'てくあみ編み歩数計UIコラージュ.png')
FONT = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'

# (番号, 名前, 見本の枠, 開くクエリ, 押す物)
SCREENS = [
    ('01', 'スプラッシュ', (8, 30, 197, 490), 'demo=ready', []),
    ('02', 'ホーム', (210, 30, 418, 490), 'seed=show', []),
    ('03', '1段完成の演出', (432, 30, 640, 490), 'seed=row', []),
    ('04', '編み上がり', (652, 30, 870, 490), 'seed=done', []),
    ('05', '箱', (884, 30, 1112, 490), 'seed=box&tab=box', []),
    ('06', '画像で見る', (1126, 30, 1310, 490), 'seed=box&route=share:b1', []),
    ('07', 'あみもの選択', (8, 543, 222, 1010), 'seed=mid&tab=knit', []),
    ('08', '模様', (228, 543, 442, 1010), 'seed=mid&route=pattern:muffler', []),
    ('09', '毛糸の色', (452, 543, 670, 1010), 'seed=mid&route=pattern:muffler,colors:muffler', []),
    ('10', '今日の記録', (694, 543, 890, 1010), 'seed=show&route=record', []),
    ('11', '設定', (903, 543, 1105, 1010), 'seed=mid&route=settings', []),
    ('12', '毛糸ぶくろ', (1117, 543, 1305, 1010), 'seed=mid&tab=bag', []),
]
# 部品の状態(見本の下の段)
PARTS = [
    ('13', '空の状態', (788, 1045, 955, 1197), 'seed=mid&tab=box', []),
    ('14', '歩けなかった日', (970, 1045, 1125, 1197), 'seed=mid&today=0', []),
    ('15', 'ヘルスケア連携の説明', (1140, 1045, 1305, 1197), 'demo=ready', ['はじめる', '毛糸の色を選ぶ', 'この色で編みはじめる']),
    ('16', '段の進み・歩数カウンター', (0, 1045, 780, 1197), 'seed=row', []),
]


def font(size):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name('Bold')
    except Exception:  # noqa: BLE001
        pass
    return f


def take():
    with serve(os.path.join(ROOT, 'dist')) as base, sync_playwright() as p:
        b = p.chromium.launch()
        for num, _n, _box, q, clicks in SCREENS + PARTS:
            ctx = b.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, locale='ja-JP')
            pg = ctx.new_page()
            pg.goto(f'{base}/index.html?{q}')
            pg.wait_for_timeout(700)
            for c in clicks:
                pg.get_by_role('button', name=c, exact=True).first.click()
                pg.wait_for_timeout(500)
            pg.wait_for_timeout(2600)
            pg.screenshot(path=os.path.join(RAW, f'{num}.png'))
            ctx.close()
        b.close()


def pair(num, name, box, H=1100):
    ref = Image.open(SRC).convert('RGB').crop(box)
    app = Image.open(os.path.join(RAW, f'{num}.png')).convert('RGB')
    head = 70
    r = ref.resize((int(ref.width * H / ref.height), H), Image.LANCZOS)
    if r.width > 900:  # 横長の部品は幅で合わせる
        r = ref.resize((900, int(ref.height * 900 / ref.width)), Image.LANCZOS)
    a = app.resize((int(app.width * H / app.height), H), Image.LANCZOS)
    W = r.width + a.width + 60
    out = Image.new('RGB', (W, H + head + 20), (255, 255, 255))
    d = ImageDraw.Draw(out)
    d.text((20, 14), f'{num} {name}  見本', font=font(30), fill=(120, 60, 40))
    d.text((r.width + 40, 14), 'アプリ(1.1.0 実画面 375×812)', font=font(30), fill=(120, 60, 40))
    out.paste(r, (20, head))
    out.paste(a, (r.width + 40, head))
    path = os.path.join(DOCS, f'compare_{num}_{name}.png')
    out.save(path)
    return out


if __name__ == '__main__':
    take()
    tiles = []
    for num, name, box, *_ in SCREENS + PARTS:
        tiles.append(pair(num, name, box))
    # 12画面の一覧(見本の上段・アプリの下段)
    th = 560
    cols = 6
    row_imgs = []
    for k in range(2):
        refs = [Image.open(SRC).convert('RGB').crop(s[2]) for s in SCREENS[k * 6:(k + 1) * 6]]
        apps = [Image.open(os.path.join(RAW, f'{s[0]}.png')).convert('RGB') for s in SCREENS[k * 6:(k + 1) * 6]]
        row_imgs.append([i.resize((int(i.width * th / i.height), th), Image.LANCZOS) for i in refs])
        row_imgs.append([i.resize((int(i.width * th / i.height), th), Image.LANCZOS) for i in apps])
    colw = max(i.width for row in row_imgs for i in row) + 16
    ov = Image.new('RGB', (cols * colw + 160, len(row_imgs) * (th + 16) + 20), (255, 255, 255))
    d = ImageDraw.Draw(ov)
    for ri, row in enumerate(row_imgs):
        y = 10 + ri * (th + 16)
        d.text((10, y + th // 2 - 20), '見本' if ri % 2 == 0 else 'アプリ', font=font(34), fill=(120, 60, 40))
        for ci, im in enumerate(row):
            ov.paste(im, (150 + ci * colw, y))
    ov.save(os.path.join(DOCS, 'compare_all.png'))
    print('compare ok', len(tiles))
