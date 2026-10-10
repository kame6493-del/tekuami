"""ストアの画面写真(iPhone 1290x2796 / Play 1080x1920 を5枚ずつ)とフィーチャー画像(1024x500)を作る。
アプリの画面は dist をブラウザで開いて撮った本物。写真に値段・「無料」は入れない。python make_store.py"""
import os

from PIL import Image, ImageDraw, ImageFont
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
INK = (0x4B, 0x34, 0x26)
INK2 = (0x7C, 0x64, 0x55)
RULE = (0xEF, 0xE0, 0xCA)
AKANE = (0xD9, 0x64, 0x6F)
FONT = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'


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
    ('1_knit', 'seed=show', [], '歩いた分だけ、' + NL + 'ひと目ずつ編める', '次の段まで、あと少しが見える。'),
    ('2_done', 'seed=done', [], '模様は、' + NL + '編み上がるまで秘密', '何が出てくるかは、歩いてからのお楽しみ。'),
    ('3_box', 'seed=box&tab=box', [], '編んだものは、' + NL + '木の棚にずっと残る', 'マフラー、帽子、ミトン、くつした。'),
    ('4_next', 'seed=mid&tab=knit', [], '次は何を編もう', '余った歩数は、次のあみものへ。'),
    ('5_log', 'seed=show&route=record', [], '広告なし。' + NL + '記録は端末の中だけ', 'ヘルスケアの歩数を読むだけ。書きこまない。'),
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
        canvas = Image.new('RGB', (W, H), PAPER)
        d = ImageDraw.Draw(canvas)
        x = int(96 * scale)
        y = int(150 * scale)
        hf = font(int(84 * scale))
        for line in head.split('\n'):
            d.text((x, y), line, font=hf, fill=INK)
            y += int(112 * scale)
        y += int(12 * scale)
        d.rectangle((x, y, x + int(72 * scale), y + int(8 * scale)), fill=AKANE)
        y += int(36 * scale)
        d.text((x, y), sub, font=font(int(44 * scale), 'Regular'), fill=INK2)
        y += int(110 * scale)
        # アプリの画面(枠は細い線だけ。端末の絵は描かない)
        avail_h = H - y
        sw = int(W * 0.80)
        sh = int(raw.height * sw / raw.width)
        if sh > avail_h + int(200 * scale):
            sh = avail_h + int(200 * scale)
        shot = raw.resize((sw, int(raw.height * sw / raw.width)), Image.LANCZOS).crop((0, 0, sw, sh))
        r = int(44 * scale)
        border = Image.new('RGB', (sw + 4, sh + 4), RULE)
        canvas.paste(rounded(border, r + 2), ((W - sw) // 2 - 2, y - 2), rounded(border, r + 2))
        rs = rounded(shot, r)
        canvas.paste(rs, ((W - sw) // 2, y), rs)
        canvas.save(os.path.join(STORE, kind, f'{name}.png'))


def feature():
    """1024x500。左に名前、右に冬の窓辺・毛糸のかご・眠る猫(見本のスプラッシュの絵)"""
    W, H = 1024, 500
    c = Image.new('RGB', (W, H), PAPER)
    art = Image.open(os.path.join(ROOT, 'src', 'assets', 'ref', 'splash.webp')).convert('RGB')
    # かごと猫のあたり(木々の下から雪の上まで)
    box = (0, int(art.height * 0.43), art.width, int(art.height * 0.86))
    part = art.crop(box)
    k = H / part.height
    part = part.resize((int(part.width * k), H), Image.LANCZOS)
    x0 = W - part.width
    # 左の端は生成りへなだらかに
    mask = Image.new('L', part.size, 255)
    md = ImageDraw.Draw(mask)
    for i in range(120):
        md.line([(i, 0), (i, H)], fill=int(255 * i / 120))
    c.paste(part, (x0, 0), mask)
    d = ImageDraw.Draw(c)
    d.text((70, 150), 'てくあみ', font=font(96), fill=(0x6E, 0x3D, 0x27))
    d.rounded_rectangle((72, 282, 72 + 64, 290), 4, fill=AKANE)
    d.text((70, 312), '歩いて編む歩数計', font=font(40), fill=INK)
    c.save(os.path.join(STORE, 'play', 'feature_1024x500.png'))


if __name__ == '__main__':
    take_raw()
    compose('iphone', 1290, 2796, 1.0)
    compose('play', 1080, 1920, 0.72)
    feature()
    print('store ok')
