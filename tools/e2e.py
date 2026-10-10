"""E2E: dist をブラウザで開き、見本の12画面を順に押して回る。
初回(スプラッシュ → 模様 → 毛糸の色)→ 連携 → ホーム → 1段完成 → 今日の記録 → 設定(歩数データ・1段の歩数・アプリについて・ポリシー)
→ 毛糸ぶくろ(買う)→ あみもの選択 → 模様 → 毛糸の色 → 編み上がり → 箱 → 1枚 → 画像で見る、と
失敗の画面(許可なし・ヘルスコネクトなし・歩数0・読めない端末)・歩けなかった日・空の箱・購入準備中を、375×667 と 430×932 で通す。
大きい文字(文字だけ約1.3倍)も通す。画面写真は work/shots/e2e/ に。python tools/e2e.py"""
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright

from serve import serve

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'work', 'shots', 'e2e')
os.makedirs(OUT, exist_ok=True)
for _f in os.listdir(OUT):
    if _f.endswith('.png'):
        os.remove(os.path.join(OUT, _f))
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
    over = pg.evaluate(
        """() => [...document.querySelectorAll('.screen *')].filter(e => {
        const r = e.getBoundingClientRect(); if (!r.width) return false;
        if (e.closest('.chips') || e.closest('.confetti') || e.closest('.fill')) return false;
        return r.right > innerWidth + 1 || r.left < -1;
      }).slice(0, 3).map(e => e.className + ' ' + Math.round(e.getBoundingClientRect().right))"""
    )
    for o in over:
        fails.append(f'{tag}: 横にはみ出した部品 {o}')
    text = pg.evaluate('document.body.innerText')
    for word in re.findall(r'[A-Za-z]{2,}', text):
        if word not in ALLOW_EN:
            fails.append(f'{tag}: 英語の取り残し "{word}"')
    small = pg.evaluate(
        """() => [...document.querySelectorAll('button')].filter(b => {
        const r = b.getBoundingClientRect(); const s = getComputedStyle(b);
        if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || b.hidden) return false;
        return r.height < 40 || r.width < 40;
      }).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim() + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height))"""
    )
    for s in small:
        fails.append(f'{tag}: 押せる所が小さい {s}')
    broken = pg.evaluate("() => [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.slice(-40))")
    for b in broken:
        fails.append(f'{tag}: 絵が読めない {b}')
    count += 1


def shot(pg, name, wait=350):
    pg.wait_for_timeout(wait)
    pg.screenshot(path=os.path.join(OUT, f'{name}.png'))


def tab(pg, name):
    pg.locator('.tabbar').get_by_role('button', name=name, exact=True).click()
    pg.wait_for_timeout(250)


def back(pg):
    pg.get_by_role('button', name='戻る').first.click()
    pg.wait_for_timeout(250)


def onboard(pg, palette='空と雪'):
    pg.get_by_role('button', name='はじめる').click()
    expect(pg.get_by_text('どんな模様になるか', exact=False)).to_be_visible()
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    pg.get_by_role('radio', name=re.compile(palette)).click()
    pg.get_by_role('button', name='この色で編みはじめる').click()


def run(b, base, width, height):
    tag = f'{width}'
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP', accept_downloads=True)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))

    # 1. スプラッシュ(初回)
    pg.goto(f'{base}/index.html?demo=ready&today=6240')
    expect(pg.get_by_text('歩くたび、', exact=False)).to_be_visible()
    expect(pg.get_by_role('heading', name='てくあみ')).to_be_visible()
    check_page(pg, f'{tag} スプラッシュ')
    shot(pg, f'{tag}_01_splash')
    pg.get_by_role('button', name='はじめる').click()

    # 2. 模様は秘密(初回)→ 毛糸の色
    expect(pg.get_by_text('どんな模様になるか', exact=False)).to_be_visible()
    expect(pg.get_by_text('はじめは、マフラーから編みます')).to_be_visible()
    check_page(pg, f'{tag} 模様(初回)')
    shot(pg, f'{tag}_02_pattern_first')
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    expect(pg.get_by_role('heading', name='毛糸の色を選ぶ')).to_be_visible()
    pg.get_by_role('radio', name=re.compile('いちごみるく')).click()
    expect(pg.get_by_role('radio', name=re.compile('いちごみるく'))).to_have_attribute('aria-checked', 'true')
    # 鍵の色は毛糸ぶくろへ
    pg.get_by_role('radio', name=re.compile('夜空')).click()
    expect(pg.get_by_role('heading', name='毛糸ぶくろ')).to_be_visible()
    back(pg)
    check_page(pg, f'{tag} 毛糸の色(初回)')
    shot(pg, f'{tag}_03_colors_first')
    pg.get_by_role('button', name='この色で編みはじめる').click()

    # 3. 歩数をつなぐ(使う直前に理由を添えて聞く)
    expect(pg.get_by_role('button', name='連携する')).to_be_visible()
    expect(pg.get_by_text('書き込みは行いません', exact=False)).to_be_visible()
    expect(pg.locator('.counter-num .num')).to_have_text('500')
    check_page(pg, f'{tag} 連携の前')
    shot(pg, f'{tag}_04_connect')
    pg.get_by_role('button', name='連携する').click()

    # 4. 1段完成の演出(6240歩 → 12段)
    expect(pg.get_by_text('12段編めました!')).to_be_visible(timeout=8000)
    expect(pg.get_by_role('button', name='つぎの段へ')).to_be_visible()
    pg.wait_for_timeout(600)
    check_page(pg, f'{tag} 段が編めた')
    shot(pg, f'{tag}_05_rows_done')
    pg.get_by_role('button', name='つぎの段へ').click()

    # 5. ホーム
    expect(pg.get_by_text('次の段まで')).to_be_visible()
    expect(pg.locator('.counter-num .num')).to_have_text('260')
    expect(pg.locator('.rows-text')).to_contain_text('12段')
    expect(pg.locator('.rows-text')).to_contain_text('36段')
    expect(pg.locator('.stat-num .num').first).to_have_text('6,240')
    check_page(pg, f'{tag} ホーム')
    shot(pg, f'{tag}_06_home')

    # 6. 今日の記録(札を押す)
    pg.get_by_role('button', name='今日の記録を見る').click()
    expect(pg.get_by_role('heading', name='今日の記録')).to_be_visible()
    expect(pg.get_by_text('今週の歩数')).to_be_visible()
    expect(pg.locator('.wbar.is-today .wbar-star')).to_be_visible()
    expect(pg.locator('.ring-mid .num')).to_have_text('260')
    check_page(pg, f'{tag} 今日の記録')
    shot(pg, f'{tag}_07_record')
    back(pg)

    # 7. 設定
    pg.get_by_role('button', name='設定', exact=True).click()
    expect(pg.get_by_role('heading', name='設定')).to_be_visible()
    expect(pg.get_by_text('歩けない日があっても', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 設定')
    shot(pg, f'{tag}_08_settings')
    pg.get_by_role('button', name=re.compile('^歩数データの取得')).click()
    expect(pg.get_by_text('つながっています', exact=False)).to_be_visible()
    expect(pg.get_by_text('ほかのアプリの記録を読み込む')).to_be_visible()
    check_page(pg, f'{tag} 歩数データ')
    shot(pg, f'{tag}_09_source')
    back(pg)
    pg.get_by_role('button', name=re.compile('^1段の歩数')).click()
    pg.get_by_role('radio', name=re.compile('^300歩')).click()
    expect(pg.get_by_role('radio', name=re.compile('^300歩'))).to_have_attribute('aria-checked', 'true')
    expect(pg.get_by_text('いま編んでいる物は 500歩 のまま', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 1段の歩数')
    shot(pg, f'{tag}_10_rowsteps')
    pg.get_by_role('radio', name=re.compile('^500歩')).click()
    back(pg)
    pg.get_by_role('button', name='アプリについて').click()
    expect(pg.get_by_text('バージョン 1.1.0')).to_be_visible()
    check_page(pg, f'{tag} アプリについて')
    shot(pg, f'{tag}_11_about')
    pg.get_by_role('button', name='プライバシーポリシー').click()
    expect(pg.get_by_role('heading', name='プライバシーポリシー')).to_be_visible()
    check_page(pg, f'{tag} ポリシー')
    back(pg)
    back(pg)
    back(pg)

    # 8. 毛糸ぶくろ(買う。ブラウザでは確認用の疑似購入)
    tab(pg, '毛糸ぶくろ')
    expect(pg.get_by_role('heading', name='毛糸ぶくろ')).to_be_visible()
    expect(pg.get_by_text('480円', exact=False).first).to_be_visible()
    check_page(pg, f'{tag} 毛糸ぶくろ')
    shot(pg, f'{tag}_12_bag')
    pg.get_by_role('button', name='480円で購入する').click()
    expect(pg.get_by_text('毛糸ぶくろを開きました')).to_be_visible()
    expect(pg.get_by_text('開いています', exact=False).first).to_be_visible()

    # 9. あみもの選択 → 模様(選べる)→ 毛糸の色 → 次に編むものに決める
    tab(pg, 'あみもの')
    expect(pg.get_by_role('heading', name='次に編むものを選ぶ')).to_be_visible()
    expect(pg.get_by_text('いまはマフラーを編んでいます', exact=False)).to_be_visible()
    check_page(pg, f'{tag} あみもの選択')
    shot(pg, f'{tag}_13_pick')
    pg.get_by_role('button', name=re.compile('^ニット帽')).click()
    expect(pg.get_by_text('模様を選べます', exact=False)).to_be_visible()
    pg.get_by_role('radio', name=re.compile('いぬ')).click()
    check_page(pg, f'{tag} 模様')
    shot(pg, f'{tag}_14_pattern')
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    pg.get_by_role('radio', name=re.compile('りんご')).click()
    check_page(pg, f'{tag} 毛糸の色')
    shot(pg, f'{tag}_15_colors')
    pg.get_by_role('button', name='次に編むものに決める').click()
    expect(pg.get_by_text('続けて編みはじめます', exact=False)).to_be_visible()
    tab(pg, 'あみもの')
    expect(pg.get_by_text('次はニット帽に決まっています', exact=False)).to_be_visible()

    # 10. 箱(1つも無い)= 空の状態
    tab(pg, '箱')
    expect(pg.get_by_text('まだ編んだものがありません')).to_be_visible()
    check_page(pg, f'{tag} 空の箱')
    shot(pg, f'{tag}_16_box_empty')
    ctx.close()

    # 11. 編み上がり → 画像で保存 → 箱にしまう → 箱 → 1枚 → 画像で見る
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP', accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=done')
    expect(pg.get_by_text('編み上がりました!', exact=False)).to_be_visible()
    expect(pg.locator('.tag')).to_contain_text('ハート')
    expect(pg.locator('.tag')).to_contain_text('18,000')
    check_page(pg, f'{tag} 編み上がり')
    shot(pg, f'{tag}_17_finished', 800)
    with pg.expect_download():
        pg.get_by_role('button', name='画像で保存').click()
    expect(pg.get_by_text('画像を保存しました')).to_be_visible()
    pg.get_by_role('button', name='箱にしまう').click()
    expect(pg.get_by_role('heading', name='次に編むものを選ぶ')).to_be_visible()
    tab(pg, '箱')
    expect(pg.locator('.slot-btn')).to_have_count(1)
    pg.locator('.slot-btn').first.click()
    expect(pg.locator('.tag')).to_contain_text('ハート')
    shot(pg, f'{tag}_18_piece', 600)
    pg.get_by_role('button', name='画像で見る').click()
    expect(pg.get_by_alt_text('共有用の画像')).to_be_visible(timeout=8000)
    check_page(pg, f'{tag} 画像で見る')
    shot(pg, f'{tag}_19_share', 500)
    ctx.close()

    # 12. 箱(たくさん)と絞り込み
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=box')
    tab(pg, '箱')
    expect(pg.get_by_role('heading', name='わたしの箱')).to_be_visible()
    expect(pg.locator('.slot-btn')).to_have_count(7)  # 6つ + 編み中
    expect(pg.locator('.slot-empty').first).to_be_visible()
    check_page(pg, f'{tag} 箱')
    shot(pg, f'{tag}_20_box', 900)
    pg.get_by_role('radio', name='ぼうし').click()
    expect(pg.locator('.slot-btn')).to_have_count(2)
    shot(pg, f'{tag}_21_box_hat', 600)
    ctx.close()

    # 13. 開いたら1段編み上がる → 画像で見る(編みかけ)
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=row')
    expect(pg.get_by_text('1段編めました!')).to_be_visible(timeout=6000)
    shot(pg, f'{tag}_22_row', 900)
    pg.get_by_role('button', name='画像で見る').click()
    expect(pg.get_by_alt_text('共有用の画像')).to_be_visible(timeout=8000)
    shot(pg, f'{tag}_23_share_wip', 400)
    ctx.close()

    # 14. 歩けなかった日
    ctx = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP')
    pg = ctx.new_page()
    pg.goto(f'{base}/index.html?seed=mid&today=0')
    expect(pg.get_by_text('今日はゆっくり休みましょう', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 歩けなかった日')
    shot(pg, f'{tag}_24_rest', 800)
    ctx.close()

    # 15. 失敗の画面(新しい人で)
    cases = [
        ('denied', '歩数を読む許可がありません'),
        ('notinstalled', 'ヘルスコネクトが入っていません'),
        ('nodata', 'まだ歩数が届いていません'),
        ('unsupported', 'この端末では歩数を読めません'),
    ]
    for mode, head in cases:
        c2 = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP')
        p2 = c2.new_page()
        p2.on('pageerror', lambda e: errs.append(str(e)))
        p2.goto(f'{base}/index.html?demo={mode}')
        onboard(p2)
        if mode in ('denied', 'nodata'):
            p2.get_by_role('button', name='連携する').click()
        expect(p2.get_by_text(head)).to_be_visible()
        check_page(p2, f'{tag} {mode}')
        shot(p2, f'{tag}_30_{mode}')
        c2.close()

    # 16. 毛糸ぶくろが準備中(キーが空のとき)
    c3 = b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP')
    p3 = c3.new_page()
    p3.goto(f'{base}/index.html?seed=mid&billing=off')
    tab(p3, '毛糸ぶくろ')
    expect(p3.get_by_role('button', name='購入は準備中です')).to_be_disabled()
    shot(p3, f'{tag}_31_billing_off')
    c3.close()

    if errs:
        fails.append(f'{tag}: 画面のエラー {errs[:3]}')


BIG = """() => { const els = [...document.querySelectorAll('.screen, .screen *, .tabbar, .tabbar *')].filter(e => !e.dataset.big);
  const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize));
  els.forEach((e, i) => { e.style.fontSize = (sizes[i] * 1.3) + 'px'; e.dataset.big = '1'; }); }"""


def big_text(b, base):
    """大きい文字(文字だけ約1.3倍。端末の文字の大きさの設定と同じ効き方)でも崩れないか"""
    ctx = b.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2, locale='ja-JP')
    pg = ctx.new_page()
    for name, q in [('home', 'seed=mid'), ('pick', 'seed=mid&tab=knit'), ('record', 'seed=mid&route=record'), ('bag', 'seed=mid&tab=bag'), ('settings', 'seed=mid&route=settings'), ('finished', 'seed=done'), ('box', 'seed=box&tab=box'), ('colors', 'seed=mid&route=pattern:hat,colors:hat')]:
        pg.goto(f'{base}/index.html?{q}')
        pg.wait_for_timeout(1200)
        pg.evaluate(BIG)
        pg.wait_for_timeout(300)
        check_page(pg, f'大きい文字 {name}')
        shot(pg, f'big_{name}')
    ctx.close()


with serve(os.path.join(HERE, '..', 'dist')) as base, sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h) in [(375, 667), (430, 932)]:
        try:
            run(b, base, w, h)
        except Exception as e:  # noqa: BLE001
            fails.append(f'{w}: 止まった {type(e).__name__}: {str(e)[:800]}')
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
