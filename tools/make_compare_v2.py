"""1.2.0: 見本 A〜D とアプリの画面を並べた比較画像を docs/compare_v2_*.png と docs/compare_v2_all.png に作る。
アプリの画面は dist をブラウザで開いて撮った本物(375×812)。python tools/make_compare_v2.py"""
import os

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

from serve import serve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
DOCS = os.path.join(ROOT, 'docs')
RAW = os.path.join(ROOT, 'work', 'compare_v2_raw')
os.makedirs(RAW, exist_ok=True)
DL = os.path.join(os.path.expanduser('~'), 'Downloads')
SRC = {
    'A': os.path.join(DL, 'てくあみ編み歩数計UIコラージュ.png'),
    'B': os.path.join(DL, '編み物歩数計アプリ UIデザイン集-2.png'),
    'C': os.path.join(DL, '編み物歩数計「てくあみ」UI提案ボード-3.png'),
    'D': os.path.join(DL, '歩いて編む、やさしいニットアプリUI大全-4.png'),
}
FONT = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'

# (番号, 名前, [(見本, 枠)...], クエリ, 押す物)
SCREENS = [
    ('01', 'スプラッシュ', [('C', (1177, 922, 1299, 1180))], 'demo=ready&hour=10', []),
    ('02', 'ホーム', [('B', (8, 30, 212, 405)), ('D', (15, 40, 222, 532)), ('C', (5, 85, 215, 532))], 'seed=show&hour=10', []),
    ('03', '1段完成', [('B', (228, 30, 432, 405)), ('C', (225, 85, 432, 532))], 'seed=row&hour=10', []),
    ('04', '次の模様は', [('B', (882, 30, 1090, 405)), ('C', (445, 85, 650, 532))], 'seed=row&hour=10', ['つぎの段へ']),
    ('05', '1日の終わり', [('B', (1100, 30, 1306, 405))], 'seed=show&hour=21', []),
    ('06', '完成', [('C', (662, 85, 870, 532)), ('D', (668, 40, 880, 532))], 'seed=done&hour=10', []),
    ('07', '箱', [('B', (8, 455, 214, 825)), ('C', (882, 85, 1090, 532)), ('D', (882, 40, 1092, 532))], 'seed=box&tab=box&hour=10', []),
    ('08', '作品の詳細', [('D', (1102, 40, 1310, 532)), ('C', (1100, 85, 1310, 532)), ('B', (230, 455, 438, 825))], 'seed=box&route=piece:b1', []),
    ('09', '画像で見る', [('B', (452, 455, 655, 825)), ('C', (850, 865, 1060, 1195)), ('D', (728, 588, 896, 960))], 'seed=box&route=share:b1', []),
    ('10', '編むもの', [('D', (15, 585, 225, 960)), ('C', (15, 560, 590, 830))], 'seed=mid&route=pick', []),
    ('11', '模様', [('D', (500, 585, 718, 960)), ('B', (1102, 455, 1306, 825))], 'seed=mid&route=pattern:muffler', []),
    ('12', '毛糸の色', [('D', (232, 585, 490, 960))], 'seed=mid&route=pattern:muffler,colors:muffler', []),
    ('13', '完成イメージ', [('C', (1160, 610, 1300, 840))], 'seed=mid&route=pattern:muffler,colors:muffler,preview:muffler:ichigo', []),
    ('14', '1日の記録', [('C', (15, 770, 285, 1195))], 'seed=show&route=record', []),
    ('15', '設定', [('B', (248, 875, 462, 1195)), ('C', (300, 770, 540, 1195)), ('D', (1135, 588, 1310, 960))], 'seed=mid&tab=settings', []),
    ('16', '毛糸ぶくろ', [('B', (8, 875, 236, 1195)), ('C', (556, 865, 830, 1195)), ('D', (912, 588, 1110, 960))], 'seed=mid&tab=bag', []),
    ('17', 'テーマ', [('D', (1030, 1030, 1305, 1195))], 'seed=mid&tab=settings&route=theme', []),
    ('18', '図鑑', [('B', (8, 360, 212, 405))], 'seed=box&tab=zukan', []),
    ('19', '歩けなかった日', [('B', (474, 870, 656, 1195)), ('D', (296, 1000, 494, 1190))], 'seed=mid&today=0&hour=10', []),
    ('20', 'よるのテーマ', [('D', (1088, 1030, 1150, 1180))], 'seed=show&hour=10&theme=yoru', []),
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
        for num, _n, _boxes, q, clicks in SCREENS:
            ctx = b.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2, locale='ja-JP')
            pg = ctx.new_page()
            pg.goto(f'{base}/index.html?{q}')
            pg.wait_for_timeout(2400 if 'row' in q else 700)
            for c in clicks:
                pg.get_by_role('button', name=c, exact=True).first.click()
                pg.wait_for_timeout(600)
            pg.wait_for_timeout(2600)
            pg.screenshot(path=os.path.join(RAW, f'{num}.png'))
            ctx.close()
        b.close()


def ref_crop(src, box):
    im = Image.open(SRC[src]).convert('RGB')
    x0, y0, x1, y1 = box
    # D のテーマ・よるは下段の小さな絵。座標は見本の画素
    return im.crop((x0, y0, min(x1, im.width), min(y1, im.height)))


def pair(num, name, boxes, H=1000):
    refs = [ref_crop(s, b) for s, b in boxes]
    app = Image.open(os.path.join(RAW, f'{num}.png')).convert('RGB')
    head = 66
    rs = []
    for r in refs:
        k = H / r.height
        if r.width * k > 900:
            k = 900 / r.width
        rs.append(r.resize((int(r.width * k), int(r.height * k)), Image.LANCZOS))
    a = app.resize((int(app.width * H / app.height), H), Image.LANCZOS)
    W = sum(r.width for r in rs) + a.width + 30 * (len(rs) + 1) + 20
    out = Image.new('RGB', (W, H + head + 20), (255, 255, 255))
    d = ImageDraw.Draw(out)
    x = 20
    for (s, _b), r in zip(boxes, rs):
        d.text((x, 14), f'見本{s}', font=font(28), fill=(120, 60, 40))
        out.paste(r, (x, head))
        x += r.width + 30
    d.text((x + 10, 14), f'{num} {name}  アプリ 1.2.0', font=font(28), fill=(160, 50, 40))
    out.paste(a, (x + 10, head))
    out.save(os.path.join(DOCS, f'compare_v2_{num}_{name}.png'))


if __name__ == '__main__':
    take()
    for num, name, boxes, *_ in SCREENS:
        pair(num, name, boxes)
    # 一覧: アプリの20画面
    th = 520
    ims = [Image.open(os.path.join(RAW, f'{s[0]}.png')).convert('RGB') for s in SCREENS]
    ims = [i.resize((int(i.width * th / i.height), th), Image.LANCZOS) for i in ims]
    cols = 10
    cw = ims[0].width + 12
    ov = Image.new('RGB', (cols * cw + 20, 2 * (th + 50) + 20), (255, 255, 255))
    d = ImageDraw.Draw(ov)
    for i, (im, s) in enumerate(zip(ims, SCREENS)):
        x = 10 + (i % cols) * cw
        y = 10 + (i // cols) * (th + 50)
        d.text((x, y), f'{s[0]} {s[1]}', font=font(22), fill=(120, 60, 40))
        ov.paste(im, (x, y + 34))
    ov.save(os.path.join(DOCS, 'compare_v2_all.png'))
    print('compare v2 ok', len(SCREENS))
