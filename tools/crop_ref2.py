"""見本 B・C・D(持ち主の UI 案 2〜4枚目)から、1.2.0 で使う絵を切り出す。python tools/crop_ref2.py
crop_ref.py(見本A)と同じく src/assets/ref/ に WebP で書く。名前は b_ / c_ / d_ で始まる。
小さな絵は地の色を透明にし、文字や鍵の印が載る所は inpaint で消してから、なめらかに拡大する。"""
import os

import cv2
import numpy as np
from PIL import Image

HOME = os.path.expanduser('~')
SRC = {
    'B': os.path.join(HOME, 'Downloads', '編み物歩数計アプリ UIデザイン集-2.png'),
    'C': os.path.join(HOME, 'Downloads', '編み物歩数計「てくあみ」UI提案ボード-3.png'),
    'D': os.path.join(HOME, 'Downloads', '歩いて編む、やさしいニットアプリUI大全-4.png'),
}
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'src', 'assets', 'ref')
os.makedirs(OUT, exist_ok=True)
IM = {k: np.array(Image.open(v).convert('RGB')) for k, v in SRC.items()}


def crop(src, box):
    x0, y0, x1, y1 = box
    return IM[src][y0:y1, x0:x1].copy()


def rect_mask(img, boxes):
    m = np.zeros(img.shape[:2], np.uint8)
    for (x0, y0, x1, y1) in boxes:
        m[y0:y1, x0:x1] = 255
    return m


def inpaint(img, mask, r=5):
    return cv2.inpaint(img, mask, r, cv2.INPAINT_TELEA)


def knockout(img, t0=12, t1=36):
    """縁の画素の中央値(地の色)に近い所を透明にする"""
    border = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]], 0).astype(float)
    bg = np.median(border, axis=0)
    d = np.sqrt(((img.astype(float) - bg) ** 2).sum(axis=2))
    a = np.clip((d - t0) / (t1 - t0), 0, 1)
    # 外側とつながっていない所(絵の中の明るい部分)は残す
    solid = (a > 0.5).astype(np.uint8)
    n, lab = cv2.connectedComponents(1 - solid)
    outside = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    inner = np.isin(lab, list(outside), invert=True) & (solid == 0)
    a[inner] = 1
    a = cv2.GaussianBlur(a.astype(np.float32), (0, 0), 0.7)
    return np.dstack([img, (a * 255).astype(np.uint8)])


def save(img, name, k=3, q=84, ko=False):
    if ko:
        img = knockout(img)
    im = Image.fromarray(img)
    im = im.resize((im.width * k, im.height * k), Image.LANCZOS)
    im.save(os.path.join(OUT, f'{name}.webp'), 'WEBP', quality=q, method=6, exact=True)


# ---- 部屋の小物(見本B 右下の素材例)。ホームの手前に置く ----
save(crop('B', (1030, 876, 1114, 956)), 'b_cat', ko=True)
save(crop('B', (1130, 880, 1234, 957)), 'b_basket', ko=True)
save(crop('B', (1246, 876, 1302, 950)), 'b_mug', ko=True)
save(crop('B', (1233, 968, 1302, 1062)), 'b_plant', ko=True)
save(crop('B', (1028, 965, 1108, 1054)), 'b_needles', ko=True)
save(crop('B', (1206, 1082, 1300, 1152)), 'b_book', ko=True)
save(crop('B', (1125, 1066, 1206, 1142)), 'b_yarnbasket', ko=True)

# ---- 模様が分かる前の「?」の白い編み地(見本B 部品) ----
save(crop('B', (890, 1101, 981, 1176)), 'b_question', ko=False)

# ---- 下のタブのアイコン(見本B のホーム) ----
for name, (x0, x1) in {'home': (20, 39), 'box': (61, 79), 'zukan': (101, 119), 'bag': (141, 160), 'settings': (181, 199)}.items():
    save(crop('B', (x0, 369, x1, 385)), f'b_tab_{name}', k=4, ko=True)

# ---- 画像のプレビュー: 椅子に掛けた写真風(見本B)。元のマフラーと閉じるボタンを消し、アプリが自分の編み物を描き重ねる ----
chair = crop('B', (453, 458, 652, 760))
m = rect_mask(chair, [(166, 8, 196, 38)])
chair = inpaint(chair, m, 5)
mm = rect_mask(chair, [(26, 58, 176, 268)])
chair = inpaint(chair, mm, 9)
chair = cv2.GaussianBlur(chair, (0, 0), 0.6)
save(chair, 'b_chair', k=3, q=80)

# ---- 画像のプレビュー: 雪の上(見本D)。文字と元のマフラーを消す ----
snow = crop('D', (731, 593, 894, 660))
save(snow, 'd_snow', k=3, q=80)

# ---- 1日の記録(見本C 11): 歩いた日の毛糸玉と、猫 ----
save(crop('C', (64, 1013, 87, 1038)), 'c_dayball', k=4, ko=True)
save(crop('C', (44, 1108, 102, 1180)), 'c_cat', ko=True)

# ---- 段の目盛りの毛糸玉(見本C 1 のホーム下) ----
save(crop('C', (34, 442, 51, 466)), 'c_ball_on', k=4, ko=True)
save(crop('C', (110, 442, 125, 466)), 'c_ball_off', k=4, ko=True)

# ---- 編むもの(見本C 7)。鍵のカードは灰色の地を透明にする ----
for name, box in {
    'muffler': (27, 712, 100, 802), 'hat': (118, 716, 194, 796), 'mitten': (207, 716, 286, 798),
    'sock': (305, 718, 381, 802), 'sweater': (394, 720, 483, 796), 'blanket': (494, 722, 578, 796),
}.items():
    save(crop('C', box), f'c_item_{name}', ko=True)

# ---- 毛糸ぶくろ(見本C 13 の刺しゅうの巾着) ----
save(crop('C', (566, 948, 686, 1128)), 'c_bag', ko=True)

# ---- アイコン(見本C 15 左)と、スプラッシュの丘(見本C 15 右。題名は消してアプリが重ねる) ----
save(crop('C', (1087, 922, 1164, 998)), 'c_icon', k=4)
hill = crop('C', (1177, 922, 1299, 1180))
m = np.zeros(hill.shape[:2], np.uint8)
g = cv2.cvtColor(hill, cv2.COLOR_RGB2GRAY)
m[60:115] = np.where(g[60:115] < 170, 255, 0)
m = cv2.dilate(m, np.ones((5, 5), np.uint8))
hill = inpaint(hill, m, 6)
save(hill, 'c_hill', k=4, q=84)

# ---- 毛糸の色(見本D)。2つ並んだ毛糸玉 ----
BALLS = {
    'milk': (242, 609), 'ichigo': (304, 609), 'mori': (366, 609), 'sora': (428, 609),
    'yuki': (242, 686), 'lavender': (304, 686), 'komugi': (366, 686), 'sumi': (428, 686),
    'sakuramochi': (242, 801), 'nekoyanagi': (304, 801), 'mustard': (366, 801), 'akazukin': (428, 801),
    'yomogi': (242, 868), 'aoumi': (304, 868), 'kuri': (366, 868), 'yozora': (428, 868),
}
for name, (x, y) in BALLS.items():
    save(crop('D', (x, y + 4, x + 50, y + 44)), f'd_ball_{name}', ko=True)

# ---- 模様の見本(D・B・C から1つずつ) ----
TILES = {
    'heart': ('D', (509, 777, 565, 833)), 'snow': ('D', (581, 777, 636, 833)), 'norwegian': ('D', (651, 777, 707, 833)),
    'nut': ('D', (509, 866, 565, 921)), 'cat': ('D', (581, 866, 636, 921)), 'mountain': ('D', (651, 866, 707, 921)),
    'star': ('B', (1180, 607, 1232, 667)), 'tree': ('B', (1112, 607, 1168, 667)), 'nordic': ('B', (1242, 607, 1296, 667)),
    'rabbit': ('B', (1112, 704, 1168, 769)), 'flower': ('B', (1242, 704, 1296, 769)), 'dog': ('C', (1076, 628, 1140, 694)),
    'random': ('B', (1112, 512, 1168, 564)),
}
for name, (src, box) in TILES.items():
    t = crop(src, box)
    if name in ('rabbit', 'flower'):
        # 右上の鍵の印を消す
        h, w = t.shape[:2]
        t = inpaint(t, rect_mask(t, [(w - 16, 0, w, 16)]), 4)
    save(t, f'tile_{name}', k=3)

# ---- 通知なし・音なし(見本D 下段) ----
save(crop('D', (560, 1034, 612, 1078)), 'd_no_notice', ko=True)
save(crop('D', (560, 1100, 612, 1140)), 'd_no_sound', ko=True)

# ---- 歩けなかった日の猫(見本D 下段) ----
save(crop('D', (300, 1094, 440, 1158)), 'd_rest_cat', ko=True)

# ---- ウィジェットの絵(見本D 下段左の小さなマフラー) ----
save(crop('D', (24, 1036, 70, 1086)), 'd_widget_muffler', k=4)

print('切り出し B/C/D 完了')
