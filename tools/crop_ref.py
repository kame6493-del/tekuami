"""見本の画像(持ち主から渡された UI コラージュ)から、アプリで使う絵を切り出す。
文字が載っている所は文字だけを消し(OpenCV の inpaint)、なめらかに拡大して WebP で src/assets/ref/ に書き出す。
python tools/crop_ref.py"""
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.expanduser('~'), 'Downloads', 'てくあみ編み歩数計UIコラージュ.png')
OUT = os.path.join(HERE, '..', 'src', 'assets', 'ref')
os.makedirs(OUT, exist_ok=True)

full = np.array(Image.open(SRC).convert('RGB'))


def crop(box):
    x0, y0, x1, y1 = box
    return full[y0:y1, x0:x1].copy()


def dark_mask(img, boxes, thr=135, grow=2):
    """boxes(切り出しの中の座標)の中で、暗い文字の画素だけを印にする"""
    m = np.zeros(img.shape[:2], np.uint8)
    g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    for (x0, y0, x1, y1) in boxes:
        sub = g[y0:y1, x0:x1]
        m[y0:y1, x0:x1] = np.where(sub < thr, 255, 0).astype(np.uint8)
    if grow:
        m = cv2.dilate(m, np.ones((grow * 2 + 1, grow * 2 + 1), np.uint8))
    return m


def rect_mask(img, boxes):
    m = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes:
        m[y0:y1, x0:x1] = 255
    return m


def inpaint(img, mask, r=4):
    return cv2.inpaint(img, mask, r, cv2.INPAINT_TELEA)


def knockout(img, t0=10, t1=34):
    """周りの地の色(縁の画素の中央値)に近い所を透明にする。小さな絵をカードの色に馴染ませるため"""
    border = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]], 0).astype(float)
    bg = np.median(border, axis=0)
    d = np.sqrt(((img.astype(float) - bg) ** 2).sum(axis=2))
    a = np.clip((d - t0) / (t1 - t0), 0, 1)
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 0.6)
    return np.dstack([img, (a * 255).astype(np.uint8)])


CUT = set()


def save(img, name, k=3, q=82):
    if name in CUT or any(name.startswith(p) for p in ('tab_', 'card_', 'set_', 'bag_icon', 'item_', 'balls_', 'icon_', 'plant_')) or name in ('chest', 'bag', 'cat_card', 'secret'):
        img = knockout(img)
    im = Image.fromarray(img)
    im = im.resize((im.width * k, im.height * k), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=q, method=6, exact=True)
    return im


def tile_v(strip, h):
    """縦に、上下を反転しながら積む(継ぎ目を目立たせない)"""
    out = []
    flip = False
    total = 0
    while total < h:
        out.append(strip[::-1] if flip else strip)
        total += strip.shape[0]
        flip = not flip
    return np.concatenate(out, 0)[:h]


# 1. スプラッシュ(題名・下の一言を消す。文字はアプリが重ねる)
s = crop((10, 32, 195, 488))
m = dark_mask(s, [(22, 75, 162, 117), (35, 118, 150, 142), (8, 380, 180, 432)], thr=150, grow=2)
s = inpaint(s, m, 5)
save(s, 'splash')

# 2. ホームの窓辺(日付・残り歩数・設定の歯車・マフラーと針を消す)
h = crop((210, 32, 418, 322))
m = dark_mask(h, [(40, 8, 190, 32), (20, 55, 170, 120)], thr=150, grow=2)
m |= rect_mask(h, [(170, 4, 198, 30), (150, 55, 175, 85)])  # 歯車と、きらきら
h = inpaint(h, m, 5)
# マフラーと針の所: 空と窓は、周りの色を大きくぼかして穴へ流し込む(筋が出ない)。壁の板は右の板を横へ写す
wall_top = 205  # この高さより下は板壁
hole = np.zeros(h.shape[:2], np.float32)
hole[134:wall_top, 12:198] = 1
hole[0:wall_top, 42:166] = 1
keep = 1 - hole
f = h.astype(np.float32)
# 行ごとに、穴の外の「空らしい色」(青みがあって明るい)の平均を取り、上から下へのなだらかな空にする
fill = np.zeros_like(f)
prev = np.array([200, 215, 235], np.float32)
for y in range(h.shape[0]):
    row = f[y][keep[y] > 0]
    sky = row[(row[:, 2] > row[:, 0] + 8) & (row.mean(axis=1) > 150)] if len(row) else row
    c = sky.mean(axis=0) if len(sky) > 3 else prev
    prev = c
    fill[y] = c
fill = cv2.GaussianBlur(fill, (0, 0), 6)
# やわらかい雲を2つ
yy, xx = np.mgrid[0:h.shape[0], 0:h.shape[1]]
for (cx, cy, rx, ry, al) in [(80, 70, 46, 13, 0.75), (128, 62, 30, 10, 0.65), (110, 112, 52, 12, 0.55), (70, 118, 28, 9, 0.5)]:
    d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
    m = np.clip(1.2 - d, 0, 1) * al
    fill = fill * (1 - m[..., None]) + np.array([252, 250, 246], np.float32) * m[..., None]
rng = np.random.default_rng(3)
fill += rng.normal(0, 1.0, fill.shape)
soft = cv2.GaussianBlur(hole, (0, 0), 5)[..., None]
h = np.clip(f * (1 - soft) + fill * soft, 0, 255).astype(np.uint8)
right = full[32:322, 210 + 164:210 + 204]
for y in range(wall_top, h.shape[0]):
    row = np.concatenate([right[y]] * 4, 0)
    h[y, 30:190] = row[:160]
save(h, 'home_window')

# 3. 編み上がりの木の床(文字と物の無い帯を縦に積む)
floor = crop((656, 396, 866, 418))
save(cv2.resize(floor, (floor.shape[1], 460), interpolation=cv2.INTER_CUBIC), 'floor', k=2)

# 4. 箱の棚の部品
save(crop((938, 47, 978, 83)), 'chest')
save(crop((881, 38, 908, 84)), 'plant_l')
save(crop((1077, 38, 1113, 84)), 'plant_r')
save(crop((1072, 392, 1112, 455)), 'plant_pot')
save(crop((1055, 424, 1078, 452)), 'succulent')
save(crop((886, 311, 1112, 324)), 'shelf_board', k=3)
save(crop((897, 330, 911, 440)), 'shelf_back', k=3)

# 5. 画像で見る(松ぼっくりと葉)
save(crop((1137, 74, 1186, 190)), 'pinecone')

# 6. 次に編むもの(6つの絵)。マフラーの左上の小さな印は消す
mf = crop((27, 596, 81, 648))
mf = inpaint(mf, rect_mask(mf, [(0, 2, 12, 17)]), 4)
save(mf, 'item_muffler')
save(crop((26, 655, 82, 712)), 'item_hat')
save(crop((26, 720, 82, 777)), 'item_mitten')
save(crop((24, 785, 82, 847)), 'item_sock')
save(crop((22, 851, 86, 914)), 'item_sweater')
save(crop((22, 930, 86, 992)), 'item_blanket')

# 7. 模様(秘密の編み地と、例の6つ)
save(crop((255, 628, 420, 765)), 'secret')
for name, (x, y) in {'heart': (240, 830), 'snow': (308, 830), 'star': (375, 830), 'leaf': (240, 915), 'dog': (308, 915), 'nordic': (375, 915)}.items():
    save(crop((x - 2, y - 2, x + 57, y + 57)), f'motif_{name}')

# 8. 毛糸の色(8組。鍵の印は消す)
balls = {
    'ichigo': (468, 622), 'sora': (580, 622), 'mori': (468, 705), 'lavender': (580, 705),
    'cafe': (468, 788), 'yozora': (580, 788), 'ringo': (468, 871), 'mimoza': (580, 871),
}
for name, (x, y) in balls.items():
    b = crop((x, y - 3, x + 92, y + 45))
    lock = rect_mask(b, [(70, 0, 92, 20)])
    # 鍵の橙色の丸だけ
    hsv = cv2.cvtColor(b, cv2.COLOR_RGB2HSV)
    orange = ((hsv[..., 0] > 8) & (hsv[..., 0] < 25) & (hsv[..., 1] > 120) & (hsv[..., 2] > 120)).astype(np.uint8) * 255
    white = ((b.min(axis=2) > 225)).astype(np.uint8) * 255
    m = cv2.dilate((orange | white) & lock, np.ones((5, 5), np.uint8))
    if name in ('yozora', 'ringo', 'mimoza'):
        b = inpaint(b, m, 4)
    save(b, f'balls_{name}')

# 9. 設定の小さな絵と猫
for name, y in {'set_health': 598, 'set_steps': 658, 'set_about': 716, 'set_write': 769, 'set_sound': 822, 'set_ads': 874}.items():
    save(crop((918, y, 950, y + 32)), name)
save(crop((1008, 960, 1100, 1002)), 'cat_card')

# 10. 毛糸ぶくろ
save(crop((1140, 553, 1302, 652)), 'bag')
for i, y in enumerate([776, 823, 857, 891]):
    save(crop((1126, y, 1148, y + 22)), f'bag_icon{i + 1}')

# 11. 空の状態・歩けなかった日・ヘルスケア連携
save(crop((790, 1062, 952, 1106)), 'empty')
save(crop((973, 1062, 1122, 1120)), 'rest')
save(crop((1181, 1065, 1207, 1097)), 'icon_health')
save(crop((1230, 1065, 1257, 1097)), 'icon_hc')

# 12. タブと札の小さな絵
for name, box in {
    'tab_home': (225, 450, 244, 471), 'tab_box': (275, 450, 295, 471), 'tab_knit': (329, 449, 351, 471), 'tab_bag': (379, 448, 401, 471),
    'card_steps': (224, 402, 246, 433), 'card_week': (328, 399, 353, 433),
}.items():
    save(crop(box), name)

print('切り出し', len(os.listdir(OUT)), '枚 ->', os.path.abspath(OUT))
