"""E2E(1.2.0): dist をブラウザで開き、見本4枚の画面を順に押して回る。テーマ3つと昼・夜も通す。
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
ALLOW_EN = {'CSV', 'Apple', 'ID', 'Google', 'iPhone', 'Android', 'Play', 'App', 'Store', 'RevenueCat', 'cm', 'GitHub'}
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


def onboard(pg, palette='そら'):
    pg.get_by_role('button', name='はじめる').click()
    expect(pg.get_by_text('おたのしみ', exact=True)).to_be_visible()
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    pg.get_by_role('radio', name=re.compile(palette)).first.click()
    pg.get_by_role('button', name='完成イメージを見る').click()
    pg.get_by_role('button', name='この内容で編む').click()


def ctx_new(b, width, height, **kw):
    return b.new_context(viewport={'width': width, 'height': height}, device_scale_factor=2, locale='ja-JP', **kw)


def run(b, base, width, height):
    tag = f'{width}'
    errs = []
    ctx = ctx_new(b, width, height, accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))

    # 1. スプラッシュ(見本C 15)
    pg.goto(f'{base}/index.html?demo=ready&today=6240&hour=10')
    expect(pg.get_by_role('heading', name='てくあみ')).to_be_visible()
    expect(pg.get_by_text('歩くたび、', exact=False)).to_be_visible()
    check_page(pg, f'{tag} スプラッシュ')
    shot(pg, f'{tag}_01_splash')

    # 2. 模様(おたのしみ)→ 毛糸の色(16色)→ 完成イメージ → この内容で編む
    pg.get_by_role('button', name='はじめる').click()
    expect(pg.get_by_text('おたのしみ', exact=True)).to_be_visible()
    check_page(pg, f'{tag} 模様(初回)')
    shot(pg, f'{tag}_02_pattern_first')
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    expect(pg.get_by_text('基本の毛糸(無料)')).to_be_visible()
    pg.get_by_role('radio', name=re.compile('いちご')).first.click()
    expect(pg.get_by_role('radio', name=re.compile('^いちご'))).to_have_attribute('aria-checked', 'true')
    pg.get_by_role('radio', name=re.compile('よぞら')).click()
    expect(pg.get_by_role('heading', name='毛糸ぶくろ')).to_be_visible()
    back(pg)
    check_page(pg, f'{tag} 毛糸の色(初回)')
    shot(pg, f'{tag}_03_colors_first')
    pg.get_by_role('button', name='完成イメージを見る').click()
    expect(pg.get_by_role('heading', name='完成イメージ')).to_be_visible()
    expect(pg.get_by_text('おたのしみ(編み上がるまで秘密)')).to_be_visible()
    check_page(pg, f'{tag} 完成イメージ')
    shot(pg, f'{tag}_04_preview', 600)
    pg.get_by_role('button', name='この内容で編む').click()

    # 3. 歩数をつなぐ(使う直前に理由を添えて聞く)
    expect(pg.get_by_role('button', name='連携する')).to_be_visible()
    expect(pg.get_by_text('書き込みは行いません', exact=False)).to_be_visible()
    expect(pg.locator('.bn-num .num')).to_have_text('500')
    check_page(pg, f'{tag} 連携の前')
    shot(pg, f'{tag}_05_connect')
    pg.get_by_role('button', name='連携する').click()

    # 4. 1段完成の演出(見本B 2)→ どんな模様が編み上がるかな?(見本B 5)→ ホーム
    expect(pg.get_by_text('編み上がりました!')).to_be_visible(timeout=8000)
    expect(pg.locator('.celebrate-big')).to_have_text('12段')
    pg.wait_for_timeout(600)
    check_page(pg, f'{tag} 段が編めた')
    shot(pg, f'{tag}_06_rows_done')
    pg.get_by_role('button', name='つぎの段へ').click()
    expect(pg.get_by_text('どんな模様が', exact=False)).to_be_visible()
    check_page(pg, f'{tag} つぎの模様は?')
    shot(pg, f'{tag}_07_teaser')
    pg.get_by_role('button', name='つぎの段を編みはじめる').click()
    expect(pg.get_by_text('次の段まで')).to_be_visible()
    expect(pg.locator('.bn-num .num')).to_have_text('260')
    expect(pg.locator('.rowmeter-rows')).to_contain_text('12段')
    expect(pg.locator('.rowmeter-steps')).to_contain_text('240 / 500歩')
    expect(pg.locator('.pill-num .num')).to_have_text('6,240')
    expect(pg.locator('.ballrow-ball')).to_have_count(10)
    check_page(pg, f'{tag} ホーム')
    shot(pg, f'{tag}_08_home')

    # 5. くわしく → 今日の記録(円・今週・カレンダー)
    pg.get_by_role('button', name='くわしく').click()
    expect(pg.get_by_role('heading', name='今日の記録')).to_be_visible()
    expect(pg.locator('.wbar.is-today .wbar-star')).to_be_visible()
    expect(pg.locator('.cal td.is-today')).to_have_count(1)
    expect(pg.get_by_text('毛糸玉がひとつ増えました', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 今日の記録')
    shot(pg, f'{tag}_09_record')
    pg.locator('.cal-card').scroll_into_view_if_needed()
    shot(pg, f'{tag}_10_calendar')
    pg.get_by_role('button', name='前の月').click()
    expect(pg.get_by_role('button', name='次の月')).to_be_enabled()
    back(pg)

    # 6. 設定(タブ)と下の画面
    tab(pg, '設定')
    expect(pg.get_by_role('heading', name='設定')).to_be_visible()
    expect(pg.get_by_text('通知は ありません')).to_be_visible()
    check_page(pg, f'{tag} 設定')
    shot(pg, f'{tag}_11_settings')
    pg.get_by_role('button', name=re.compile('^ヘルスケア')).click()
    expect(pg.get_by_text('つながっています', exact=False)).to_be_visible()
    expect(pg.get_by_text('ほかのアプリの記録を読み込む')).to_be_visible()
    check_page(pg, f'{tag} 歩数の連携')
    back(pg)
    pg.get_by_role('button', name=re.compile('^1段の歩数')).click()
    pg.get_by_role('radio', name=re.compile('^300歩')).click()
    expect(pg.get_by_text('いま編んでいる物は 500歩 のまま', exact=False)).to_be_visible()
    pg.get_by_role('radio', name=re.compile('^500歩')).click()
    back(pg)
    pg.get_by_role('button', name=re.compile('^データの扱い')).click()
    expect(pg.get_by_text('記録をすべて消す')).to_be_visible()
    check_page(pg, f'{tag} データの扱い')
    back(pg)
    pg.get_by_role('button', name='使い方').click()
    expect(pg.get_by_text('歩くと編めます')).to_be_visible()
    check_page(pg, f'{tag} 使い方')
    back(pg)
    pg.get_by_role('button', name='お問い合わせ').click()
    expect(pg.get_by_role('button', name='お問い合わせのページを開く')).to_be_visible()
    back(pg)
    pg.get_by_role('button', name='プライバシーポリシー').click()
    expect(pg.get_by_role('heading', name='プライバシーポリシー')).to_be_visible()
    back(pg)
    pg.get_by_role('button', name='このアプリについて').click()
    expect(pg.get_by_text('バージョン 1.2.0')).to_be_visible()
    back(pg)
    # 見た目(テーマ): よる → ホームが夜、ゆき → 雪、ひだまりに戻す
    pg.get_by_role('button', name=re.compile('^見た目')).click()
    expect(pg.get_by_role('radio', name=re.compile('ひだまり'))).to_have_attribute('aria-checked', 'true')
    check_page(pg, f'{tag} テーマ')
    shot(pg, f'{tag}_12_theme', 600)
    pg.get_by_role('radio', name=re.compile('^よる')).click()
    expect(pg.locator('.app')).to_have_attribute('data-look', 'yoru')
    back(pg)
    tab(pg, 'ホーム')
    expect(pg.locator('.room')).to_have_class(re.compile('is-night'))
    shot(pg, f'{tag}_13_home_yoru', 900)
    tab(pg, '設定')
    pg.get_by_role('button', name=re.compile('^見た目')).click()
    pg.get_by_role('radio', name=re.compile('^ゆき')).click()
    back(pg)
    tab(pg, 'ホーム')
    expect(pg.locator('.room')).to_have_class(re.compile('room-yuki'))
    expect(pg.locator('.room')).to_have_class(re.compile('is-day'))
    shot(pg, f'{tag}_14_home_yuki', 900)
    tab(pg, '設定')
    pg.get_by_role('button', name=re.compile('^見た目')).click()
    pg.get_by_role('radio', name=re.compile('^ひだまり')).click()
    back(pg)

    # 7. 毛糸ぶくろ(タブ)→ 購入(ブラウザでは確認用の疑似購入)
    tab(pg, '毛糸ぶくろ')
    expect(pg.get_by_role('heading', name='毛糸ぶくろ')).to_be_visible()
    expect(pg.get_by_text('¥480', exact=False).first).to_be_visible()
    check_page(pg, f'{tag} 毛糸ぶくろ')
    shot(pg, f'{tag}_15_bag')
    pg.get_by_role('button', name='購入する').click()
    expect(pg.get_by_text('毛糸ぶくろを開きました')).to_be_visible()
    expect(pg.get_by_text('開いています', exact=False).first).to_be_visible()

    # 8. 図鑑 → 次に編むものを選ぶ(2列)→ 模様をえらぶ → 毛糸ぶくろの色 → 完成イメージ → 次に編む
    tab(pg, '図鑑')
    expect(pg.get_by_role('heading', name='図鑑')).to_be_visible()
    expect(pg.locator('.zukan-cell')).to_have_count(12)
    check_page(pg, f'{tag} 図鑑')
    shot(pg, f'{tag}_16_zukan')
    pg.get_by_role('button', name='次に編むものを選ぶ').click()
    expect(pg.get_by_role('heading', name='編むものを選ぶ')).to_be_visible()
    expect(pg.get_by_text('いまはマフラーを編んでいます', exact=False)).to_be_visible()
    check_page(pg, f'{tag} 編むもの')
    shot(pg, f'{tag}_17_pick')
    pg.get_by_role('button', name=re.compile('くつした')).click()
    pg.get_by_role('button', name='模様を見る').click()
    expect(pg.get_by_role('heading', name='模様', exact=True)).to_be_visible()
    pg.get_by_role('radio', name=re.compile('いぬ')).click()
    check_page(pg, f'{tag} 模様')
    shot(pg, f'{tag}_18_pattern')
    pg.get_by_role('button', name='毛糸の色を選ぶ').click()
    pg.get_by_role('radio', name=re.compile('あかずきん')).click()
    check_page(pg, f'{tag} 毛糸の色')
    shot(pg, f'{tag}_19_colors')
    pg.get_by_role('button', name='完成イメージを見る').click()
    expect(pg.get_by_text('いぬ', exact=True)).to_be_visible()
    shot(pg, f'{tag}_20_preview_pro', 700)
    pg.get_by_role('button', name='この内容で次に編む').click()
    expect(pg.get_by_text('続けて編みはじめます', exact=False)).to_be_visible()

    # 9. 箱(まだ1つも無い)= 空の状態
    tab(pg, '箱')
    expect(pg.get_by_text('まだ編んだものがありません')).to_be_visible()
    check_page(pg, f'{tag} 空の箱')
    shot(pg, f'{tag}_21_box_empty')
    ctx.close()

    # 10. 完成(見本C 4)→ 画像を保存する → 箱にしまう → 編むものを選ぶ → 箱 → 作品の詳細 → 画像で見る(3種)
    ctx = ctx_new(b, width, height, accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=done&hour=10')
    expect(pg.get_by_text('完成しました!', exact=False)).to_be_visible()
    expect(pg.get_by_text('ハートの模様でした♡')).to_be_visible()
    expect(pg.locator('.tag')).to_contain_text('18,000')
    check_page(pg, f'{tag} 完成')
    shot(pg, f'{tag}_22_finished', 900)
    with pg.expect_download():
        pg.get_by_role('button', name='画像を保存する').click()
    expect(pg.get_by_text('画像を保存しました')).to_be_visible()
    pg.get_by_role('button', name='箱にしまう').click()
    expect(pg.get_by_role('heading', name='編むものを選ぶ')).to_be_visible()
    back(pg)
    tab(pg, '箱')
    expect(pg.locator('.slot-btn')).to_have_count(1)
    pg.locator('.slot-btn').first.click()
    expect(pg.get_by_role('heading', name='ハートのマフラー')).to_be_visible()
    expect(pg.get_by_text('約150cm')).to_be_visible()
    check_page(pg, f'{tag} 作品の詳細')
    shot(pg, f'{tag}_23_detail', 700)
    pg.get_by_role('button', name='画像で見る・シェア').click()
    expect(pg.get_by_alt_text('共有用の画像')).to_be_visible(timeout=8000)
    check_page(pg, f'{tag} 画像で見る')
    shot(pg, f'{tag}_24_share_polaroid', 500)
    for i, st in enumerate(['椅子に掛けて', '雪の上']):
        pg.get_by_role('radio', name=st).click()
        expect(pg.get_by_alt_text('共有用の画像')).to_be_visible(timeout=8000)
        shot(pg, f'{tag}_25_share_{i}', 600)
    with pg.expect_download():
        pg.get_by_role('button', name='保存').click()
    ctx.close()

    # 11. 箱(たくさん)・絞り込み・詳細の前後・図鑑
    ctx = ctx_new(b, width, height)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=box&hour=10')
    tab(pg, '箱')
    expect(pg.get_by_role('heading', name='わたしの箱')).to_be_visible()
    expect(pg.locator('.slot-btn')).to_have_count(7)
    check_page(pg, f'{tag} 箱')
    shot(pg, f'{tag}_26_box', 900)
    pg.get_by_role('radio', name='ぼうし').click()
    expect(pg.locator('.slot-btn')).to_have_count(2)
    pg.get_by_role('radio', name='すべて').click()
    pg.locator('.slot-btn').first.click()
    expect(pg.locator('.detail-count')).to_have_text('1 / 6')
    pg.get_by_role('button', name='次の作品').click()
    expect(pg.locator('.detail-count')).to_have_text('2 / 6')
    pg.get_by_role('button', name='前の作品').click()
    pg.get_by_role('button', name='前の作品').click()
    expect(pg.locator('.detail-count')).to_have_text('6 / 6')
    back(pg)
    tab(pg, '図鑑')
    expect(pg.locator('.zukan-cell.is-got')).to_have_count(2)
    shot(pg, f'{tag}_27_zukan_box', 600)
    ctx.close()

    # 12. 開いたら1段編める → 画像で見る(編みかけ)
    ctx = ctx_new(b, width, height)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'{base}/index.html?seed=row&hour=10')
    expect(pg.get_by_text('編み上がりました!')).to_be_visible(timeout=6000)
    pg.get_by_role('button', name='画像で見る').click()
    expect(pg.get_by_alt_text('共有用の画像')).to_be_visible(timeout=8000)
    shot(pg, f'{tag}_28_share_wip', 400)
    ctx.close()

    # 13. 1日の終わり(夜 21時)・歩けなかった日・朝のよるテーマ
    for name, q, check in [
        ('29_dayend', 'seed=show&hour=21', '今日はこれだけ編めました'),
        ('30_rest', 'seed=mid&today=0&hour=10', '歩けない日もありますよね'),
        ('31_yoru', 'seed=show&hour=10&theme=yoru', '次の段まで'),
        ('32_yuki_night', 'seed=show&hour=19&theme=yuki', '次の段まで'),
    ]:
        ctx = ctx_new(b, width, height)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'{base}/index.html?{q}')
        expect(pg.get_by_text(check, exact=False).first).to_be_visible(timeout=6000)
        check_page(pg, f'{tag} {name}')
        shot(pg, f'{tag}_{name}', 900)
        if name == '29_dayend':
            pg.get_by_role('button', name='編みかけを見る').click()
            expect(pg.get_by_text('次の段まで')).to_be_visible()
        ctx.close()

    # 14. 失敗の画面(新しい人で)
    cases = [
        ('denied', '歩数を読む許可がありません'),
        ('notinstalled', 'ヘルスコネクトが入っていません'),
        ('nodata', 'まだ歩数が届いていません'),
        ('unsupported', 'この端末では歩数を読めません'),
    ]
    for mode, head in cases:
        c2 = ctx_new(b, width, height)
        p2 = c2.new_page()
        p2.on('pageerror', lambda e: errs.append(str(e)))
        p2.goto(f'{base}/index.html?demo={mode}&hour=10')
        onboard(p2)
        if mode in ('denied', 'nodata'):
            p2.get_by_role('button', name='連携する').click()
        expect(p2.get_by_text(head)).to_be_visible()
        check_page(p2, f'{tag} {mode}')
        shot(p2, f'{tag}_40_{mode}')
        c2.close()

    # 15. 毛糸ぶくろが準備中(キーが空のとき)
    c3 = ctx_new(b, width, height)
    p3 = c3.new_page()
    p3.goto(f'{base}/index.html?seed=mid&billing=off&hour=10')
    tab(p3, '毛糸ぶくろ')
    expect(p3.get_by_role('button', name='購入は準備中です')).to_be_disabled()
    shot(p3, f'{tag}_41_billing_off')
    c3.close()

    if errs:
        fails.append(f'{tag}: 画面のエラー {errs[:3]}')


BIG = """() => { const els = [...document.querySelectorAll('.screen, .screen *, .tabbar, .tabbar *')].filter(e => !e.dataset.big);
  const sizes = els.map(e => parseFloat(getComputedStyle(e).fontSize));
  els.forEach((e, i) => { e.style.fontSize = (sizes[i] * 1.3) + 'px'; e.dataset.big = '1'; }); }"""


def big_text(b, base):
    """大きい文字(文字だけ約1.3倍。端末の文字の大きさの設定と同じ効き方)でも崩れないか"""
    ctx = ctx_new(b, 375, 667)
    pg = ctx.new_page()
    for name, q in [('home', 'seed=mid&hour=10'), ('pick', 'seed=mid&route=pick'), ('record', 'seed=mid&route=record'), ('bag', 'seed=mid&tab=bag'),
                    ('settings', 'seed=mid&tab=settings'), ('finished', 'seed=done&hour=10'), ('box', 'seed=box&tab=box'), ('zukan', 'seed=box&tab=zukan'),
                    ('colors', 'seed=mid&route=pattern:hat,colors:hat'), ('detail', 'seed=box&route=piece:b1')]:
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
