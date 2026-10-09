"""E2E: dist をブラウザで開き、初回 → 歩数をつなぐ → 記録 → 箱 → 設定 → 毛糸ぶくろ → 仕上げ → 次の1枚、を押して回る。
375 幅と 430 幅、ライトとダーク。権限を断られた・ヘルスコネクトが無い・歩数が0、の画面も通す。
画面写真は work/shots/e2e/ に。python e2e.py"""
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

from serve import serve

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'work', 'shots', 'e2e')
os.makedirs(OUT, exist_ok=True)
# 固有名詞だけは英字のまま(ストア・サービスの名前)
ALLOW_EN = {'CSV', 'Apple', 'ID', 'Google', 'iPhone', 'Android', 'Play', 'App', 'Store', 'RevenueCat'}
fails = []
count = 0


def check_page(pg, tag):
    """横にはみ出していない・英語の取り残しが無い・押せる所が 40px 以上"""
    global count
    w = pg.evaluate('document.documentElement.scrollWidth')
    vw = pg.evaluate('innerWidth')
    if w > vw + 1:
        fails.append(f'{tag}: 横にはみ出し {w} > {vw}')
    text = pg.evaluate('document.body.innerText')
    for word in re.findall(r'[A-Za-z]{2,}', text):
        if word not in ALLOW_EN:
            fails.append(f'{tag}: 英語の取り残し "{word}"')
    small = pg.evaluate(
        """() => [...document.querySelectorAll('button')].filter(b => {
        const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
        if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || b.hidden) return false;
        if (b.closest('.sheet-wrap:not(.is-open)')) return false;
        if (b.classList.contains('link')) return false;
        return r.height < 40 || r.width < 40;
      }).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim() + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height))"""
    )
    for s in small:
        fails.append(f'{tag}: 押せる所が小さい {s}')
    count += 1


def shot(pg, name):
    pg.wait_for_timeout(350)
    pg.screenshot(path=os.path.join(OUT, f'{name}.png'))


def run(b, base, width, height, scheme):
    tag = f'{width}_{scheme}'
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, color_scheme=scheme, locale='ja-JP')
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))

    # 1. 初回
    pg.goto(f'{base}/index.html?demo=ready&today=6240')
    expect(pg.get_by_text('ひと目ずつ編めます', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 説明1')
    shot(pg, f'{tag}_01_intro')
    pg.get_by_role('button', name='はじめる').click()
    expect(pg.get_by_text('マフラーから編みます')).to_be_visible()
    pg.get_by_role('radio', name=re.compile('もみの木')).click()
    expect(pg.get_by_role('radio', name=re.compile('もみの木'))).to_have_attribute('aria-checked', 'true')
    check_page(pg, f'{tag} 説明2')
    shot(pg, f'{tag}_02_color')
    pg.get_by_role('button', name='この色で編みはじめる').click()

    # 2. 歩数をつなぐ(使う直前に理由を添えて聞く)
    expect(pg.get_by_text('歩数をつなぐと、編みはじめます')).to_be_visible()
    expect(pg.get_by_text('まだ読んでいません')).to_be_visible()
    check_page(pg, f'{tag} つなぐ前')
    shot(pg, f'{tag}_03_connect')
    pg.get_by_role('button', name='ヘルスケアとつなぐ').click()
    expect(pg.locator('.hero-num .num')).to_have_text('6,240')
    expect(pg.get_by_text('次の段まで', exact=False)).to_be_visible()
    expect(pg.get_by_text('もみの木のマフラー')).to_be_visible()
    pg.wait_for_timeout(2600)  # 編み目が足されていく動き
    expect(pg.locator('.meter-row')).to_contain_text('12 / 36段')
    check_page(pg, f'{tag} 編む')
    shot(pg, f'{tag}_04_knit')

    # 3. 記録
    pg.get_by_role('button', name='記録').click()
    expect(pg.get_by_role('heading', name='記録')).to_be_visible()
    expect(pg.get_by_text('この7日')).to_be_visible()
    expect(pg.locator('.bar.is-today .bar-day')).to_have_text('今日')
    check_page(pg, f'{tag} 記録')
    shot(pg, f'{tag}_05_log')

    # 4. 箱(空)
    pg.get_by_role('button', name='箱').click()
    expect(pg.get_by_text('まだ空っぽです')).to_be_visible()
    check_page(pg, f'{tag} 箱空')
    shot(pg, f'{tag}_06_box_empty')

    # 5. 設定 → 毛糸ぶくろ → 買う(ブラウザでは確認用の疑似購入)
    pg.get_by_role('button', name='編む').click()
    pg.get_by_role('button', name='設定').click()
    expect(pg.get_by_role('heading', name='設定')).to_be_visible()
    expect(pg.get_by_text('つながっています', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 設定')
    shot(pg, f'{tag}_07_settings')
    pg.get_by_role('button', name=re.compile('毛糸ぶくろ 編む物')).click()
    expect(pg.get_by_role('heading', name='毛糸ぶくろ')).to_be_visible()
    check_page(pg, f'{tag} 毛糸ぶくろ')
    shot(pg, f'{tag}_08_paywall')
    pg.get_by_role('button', name=re.compile('で開く$')).click()
    expect(pg.get_by_text('毛糸ぶくろを開きました')).to_be_visible()
    expect(pg.get_by_role('heading', name='設定')).to_be_visible()
    expect(pg.get_by_text('開いています')).to_be_visible()
    pg.get_by_role('button', name='プライバシーポリシー').click()
    expect(pg.get_by_role('heading', name='プライバシーポリシー')).to_be_visible()
    check_page(pg, f'{tag} ポリシー')
    shot(pg, f'{tag}_09_privacy')
    pg.get_by_role('button', name='閉じる').click()
    pg.wait_for_timeout(300)

    # 6. 仕上げ → 次の1枚(毛糸ぶくろの物も選べる)
    pg.goto(f'{base}/index.html?seed=done')
    expect(pg.get_by_text('編み上がりました').first).to_be_visible()
    expect(pg.get_by_text('模様は「雪の結晶」でした', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 編み上がり')
    shot(pg, f'{tag}_10_done')
    pg.get_by_role('button', name='箱にしまって次へ').click()
    expect(pg.get_by_role('heading', name='次に編む物')).to_be_visible()
    check_page(pg, f'{tag} 次')
    shot(pg, f'{tag}_11_next')
    pg.get_by_role('button', name=re.compile('^セーター')).click()
    pg.get_by_role('button', name=re.compile('^黒と赤')).click()
    pg.get_by_role('radio', name='ねこ').click()
    pg.get_by_role('button', name='編みはじめる').click()
    expect(pg.get_by_text('黒と赤のセーター')).to_be_visible()
    pg.get_by_role('button', name='箱').click()
    expect(pg.get_by_text('紺と生成りのマフラー')).to_be_visible()
    pg.get_by_text('紺と生成りのマフラー').click()
    expect(pg.get_by_text('雪の結晶')).to_be_visible()
    check_page(pg, f'{tag} 1枚')
    shot(pg, f'{tag}_12_piece')
    pg.get_by_role('button', name='閉じる').click()

    # 7. 箱(たくさん)
    pg.goto(f'{base}/index.html?seed=box')
    pg.get_by_role('button', name='箱').click()
    expect(pg.locator('.tile')).to_have_count(7)
    check_page(pg, f'{tag} 箱')
    shot(pg, f'{tag}_13_box')
    pg.get_by_role('button', name='編む').click()
    pg.wait_for_timeout(2600)
    check_page(pg, f'{tag} ひざかけ')
    shot(pg, f'{tag}_14_blanket')
    ctx.close()

    # 8. 失敗の画面(新しい人で)
    cases = [
        ('denied', '歩数を読む許可がありません'),
        ('notinstalled', 'ヘルスコネクトが入っていません'),
        ('nodata', 'まだ歩数が届いていません'),
        ('unsupported', 'この端末では歩数を読めません'),
    ]
    for mode, head in cases:
        c2 = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, color_scheme=scheme)
        p2 = c2.new_page()
        p2.on('pageerror', lambda e: errs.append(str(e)))
        p2.goto(f'{base}/index.html?demo={mode}')
        p2.get_by_role('button', name='はじめる').click()
        p2.get_by_role('button', name='おまかせにする').click()
        if mode in ('denied', 'nodata'):
            p2.get_by_role('button', name='ヘルスケアとつなぐ').click()
        expect(p2.get_by_text(head)).to_be_visible()
        check_page(p2, f'{tag} {mode}')
        shot(p2, f'{tag}_20_{mode}')
        c2.close()

    # 9. 毛糸ぶくろが準備中(キーが空のとき)
    c3 = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, color_scheme=scheme)
    p3 = c3.new_page()
    p3.goto(f'{base}/index.html?seed=mid&billing=off')
    p3.get_by_role('button', name='設定').click()
    p3.get_by_role('button', name=re.compile('毛糸ぶくろ 編む物')).click()
    expect(p3.get_by_role('button', name='購入は準備中です')).to_be_disabled()
    shot(p3, f'{tag}_21_billing_off')
    c3.close()

    if errs:
        fails.append(f'{tag}: 画面のエラー {errs[:3]}')


def big_text(b, base):
    """大きい文字(文字を 1.3 倍)でも崩れないか"""
    ctx = b.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.add_init_script(
        "document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');"
        "s.textContent=':root{--f-cap:16px;--f-body:19.5px;--f-lead:22px;--f-title:28px;--f-hero:52px} body{font-size:19.5px}';"
        "document.head.appendChild(s)})"
    )
    pg.goto(f'{base}/index.html?seed=mid')
    pg.wait_for_timeout(2800)
    check_page(pg, '大きい文字 編む')
    shot(pg, 'big_01_knit')
    pg.get_by_role('button', name='記録').click()
    check_page(pg, '大きい文字 記録')
    shot(pg, 'big_02_log')
    pg.goto(f'{base}/index.html?seed=done')
    pg.get_by_role('button', name='箱にしまって次へ').click()
    pg.wait_for_timeout(400)
    check_page(pg, '大きい文字 次')
    shot(pg, 'big_03_next')
    ctx.close()


with serve(os.path.join(HERE, '..', 'dist')) as base, sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in [(375, 667), (430, 932)]:
        for scheme in ['light', 'dark']:
            try:
                run(b, base, w, h, scheme)
            except Exception as e:  # noqa: BLE001
                fails.append(f'{w}_{scheme}: 止まった {type(e).__name__}: {str(e)[:600]}')
    try:
        big_text(b, base)
    except Exception as e:  # noqa: BLE001
        fails.append(f'大きい文字: 止まった {e}')
    b.close()

print(f'確かめた画面: {count}')
if fails:
    print('NG')
    for f in fails:
        print(' -', f)
    sys.exit(1)
print('E2E ALL PASS')
