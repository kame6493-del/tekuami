"""ストアの画面写真(iPhone 1290x2796 / Play 1080x1920 を5枚ずつ)とフィーチャー画像(1024x500)を作る。
アプリの画面は dist をブラウザで開いて撮った本物。写真に値段・「無料」は入れない。python make_store.py
2026-10-10 持ち主「Claude 特有の背景をなくして」: 生成りの無地をやめ、アプリの窓辺の部屋の絵(src/assets/ref/home_window.webp)を
ぼかして全面に敷き、上に木の色の影をかける。見出しは白の UDデジタル教科書体。茜の線は毛糸玉の絵に替えた。
撮り直さずに組むだけなら --compose-only。前の版は store/_cream_backup_2026-10-10/。"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.sync_api import sync_playwright

from serve import serve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
RAW = os.path.join(ROOT, 'work', 'store_raw')
STORE = os.path.join(ROOT, 'store')
os.makedirs(RAW, exist_ok=True)
os.makedirs(os.path.join(STORE, 'iphone'), exist_ok=True)
os.makedirs(os.path.join(STORE, 'play'), exist_ok=True)

PAPER = (0xFB, 0xF3, 0xE6)
INK = (0x5A, 0x36, 0x24)
INK2 = (0x7C, 0x64, 0x55)
RULE = (0xEF, 0xE0, 0xCA)
AKANE = (0x8A, 0x5D, 0x42)
FONT = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'
HEADF = 'C:/Windows/Fonts/UDDigiKyokashoN-B.ttc'
SUBF = 'C:/Windows/Fonts/UDDigiKyokashoN-R.ttc'
WOOD = (0x4A, 0x2C, 0x1C)     # 窓枠の木の濃い色(影)
CREAM_T = (0xFF, 0xF4, 0xE6)  # 地の上の添え書き
REF = os.path.join(ROOT, 'src', 'assets', 'ref')


def room_bg(W, H, blur, top_a=215, mid_a=70, left=False):
    """窓辺の部屋の絵をぼかして全面に。上(left=True なら左)に木の色の影をかけて白い字を読ませる"""
    art = Image.open(os.path.join(REF, 'home_window.webp')).convert('RGB')
    k = max(W / art.width, H / art.height)
    art = art.resize((int(art.width * k) + 1, int(art.height * k) + 1), Image.LANCZOS)
    x0, y0 = (art.width - W) // 2, (art.height - H) // 2
    im = art.crop((x0, y0, x0 + W, y0 + H)).filter(ImageFilter.GaussianBlur(blur)).convert('RGBA')
    ov = Image.new('RGBA', (W, H))
    od = ImageDraw.Draw(ov)
    n = W if left else H
    for i in range(n):
        t = i / n
        a = int(top_a + (mid_a - top_a) * min(1.0, t / 0.55))
        if left:
            od.line([(i, 0), (i, H)], fill=WOOD + (a,))
        else:
            od.line([(0, i), (W, i)], fill=WOOD + (a,))
    im.alpha_composite(ov)
    return im.convert('RGB')


def yarn(size):
    b = Image.open(os.path.join(REF, 'd_ball_ichigo.webp')).convert('RGBA')
    return b.resize((size, int(b.height * size / b.width)), Image.LANCZOS)


def font(size, weight='Bold'):
    f = ImageFont.truetype(FONT, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:  # noqa: BLE001
        pass
    return f


# (名前, 開くクエリ, 押す物, 見出し, 一言)
NL = chr(10)
SHOTS = [
    ('1_knit', 'seed=show&hour=10', [], '歩いた分だけ、' + NL + 'ひと目ずつ編める', '窓辺で猫といっしょに、マフラーが編み上がっていく。'),
    ('2_done', 'seed=done&hour=10', [], '模様は、' + NL + '編み上がるまで秘密', 'ハートかな、雪の結晶かな。歩いてからのお楽しみ。'),
    ('3_box', 'seed=box&tab=box&hour=10', [], '編んだものは、' + NL + '木の棚にずっと残る', 'マフラー、帽子、ミトン、くつした。'),
    ('4_night', 'seed=show&hour=21', [], '今日はこれだけ' + NL + '編めました', '歩けた日も、歩けなかった日も、責めません。'),
    ('5_log', 'seed=show&route=record&hour=10', [], '広告なし。' + NL + '記録は端末の中だけ', 'ヘルスケアの歩数を読むだけ。書きこまない。'),
]


def take_raw():
    with serve(os.path.join(ROOT, 'dist')) as base, sync_playwright() as p:
        b = p.chromium.launch()
        for kind, (vw, vh) in [('iphone', (430, 932)), ('play', (405, 720))]:
            for name, query, clicks, *_ in SHOTS:
                ctx = b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=3, color_scheme='light')
                pg = ctx.new_page()
                pg.goto(f'{base}/index.html?{query}')
                pg.wait_for_timeout(700)
                for c in clicks:
                    pg.get_by_role('button', name=c).first.click()
                    pg.wait_for_timeout(600)
                pg.wait_for_timeout(2800)
                pg.screenshot(path=os.path.join(RAW, f'{kind}_{name}.png'))
                ctx.close()
        b.close()


def rounded(im, r):
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    out = Image.new('RGBA', im.size)
    out.paste(im, (0, 0), mask)
    return out


def compose(kind, W, H, scale):
    for name, _q, _c, head, sub in SHOTS:
        raw = Image.open(os.path.join(RAW, f'{kind}_{name}.png')).convert('RGB')
        canvas = room_bg(W, H, int(W / 70))
        d = ImageDraw.Draw(canvas)
        x = int(96 * scale)
        y = int(150 * scale)
        hf = ImageFont.truetype(HEADF, int(88 * scale))
        for line in head.split(NL):
            d.text((x, y), line, font=hf, fill=(255, 255, 255))
            y += int(116 * scale)
        y += int(20 * scale)
        yb = yarn(int(64 * scale))
        canvas.paste(yb, (x, y + int(4 * scale)), yb)
        d.text((x + int(84 * scale), y + int(8 * scale)), sub, font=ImageFont.truetype(SUBF, int(41 * scale)), fill=CREAM_T)
        y += int(36 * scale)
        y += int(110 * scale)
        # アプリの画面(枠は細い線だけ。端末の絵は描かない)
        avail_h = H - y
        sw = int(W * 0.80)
        sh = int(raw.height * sw / raw.width)
        if sh > avail_h + int(200 * scale):
            sh = avail_h + int(200 * scale)
        shot = raw.resize((sw, int(raw.height * sw / raw.width)), Image.LANCZOS).crop((0, 0, sw, sh))
        r = int(44 * scale)
        shm = Image.new('L', (W, H), 0)
        ImageDraw.Draw(shm).rounded_rectangle(((W - sw) // 2, y + int(18 * scale), (W + sw) // 2, y + sh + int(30 * scale)), r, fill=150)
        canvas.paste(WOOD, (0, 0), shm.filter(ImageFilter.GaussianBlur(int(26 * scale))))
        border = Image.new('RGB', (sw + 6, sh + 6), (255, 250, 242))
        canvas.paste(rounded(border, r + 3), ((W - sw) // 2 - 3, y - 3), rounded(border, r + 3))
        rs = rounded(shot, r)
        canvas.paste(rs, ((W - sw) // 2, y), rs)
        canvas.save(os.path.join(STORE, kind, f'{name}.png'))


def feature():
    """1024x500。左に名前、右に冬の窓辺・毛糸のかご・眠る猫(見本のスプラッシュの絵)"""
    W, H = 1024, 500
    c = Image.new('RGB', (W, H), (0x5E, 0x37, 0x25))  # 左は毛糸のこげ茶の無地
    art = Image.open(os.path.join(ROOT, 'src', 'assets', 'ref', 'c_hill.webp')).convert('RGB')
    # 丘と家のあたりを、右の 600×500 にかぶせる(元の絵の右端は角丸の縁なので削る)
    art = art.crop((0, 0, int(art.width * 0.93), art.height))
    tw, th = 600, H
    k = max(tw / art.width, th / (art.height * 0.62))
    big = art.resize((int(art.width * k), int(art.height * k)), Image.LANCZOS)
    top = int(big.height * 0.36)
    part = big.crop((0, top, tw, top + th))
    x0 = W - part.width
    # 左の端はこげ茶へなだらかに
    mask = Image.new('L', part.size, 255)
    md = ImageDraw.Draw(mask)
    for i in range(120):
        md.line([(i, 0), (i, H)], fill=int(255 * i / 120))
    c.paste(part, (x0, 0), mask)
    d = ImageDraw.Draw(c)
    d.text((70, 140), 'てくあみ', font=ImageFont.truetype(HEADF, 100), fill=(255, 255, 255))
    yb = yarn(56)
    c.paste(yb, (72, 300), yb)
    d.text((142, 306), '歩いて編む歩数計', font=ImageFont.truetype(HEADF, 40), fill=CREAM_T)
    c.save(os.path.join(STORE, 'play', 'feature_1024x500.png'))


if __name__ == '__main__':
    if '--compose-only' not in sys.argv:
        take_raw()
    compose('iphone', 1290, 2796, 1.0)
    compose('play', 1080, 1920, 0.72)
    feature()
    print('store ok')
