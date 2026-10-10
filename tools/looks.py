"""複数の画面をまとめて撮る(開発サーバー 5199)。python tools/looks.py 名前=クエリ ..."""
import sys, os
from playwright.sync_api import sync_playwright
out = os.path.join(os.path.dirname(__file__), '..', 'work', 'look')
os.makedirs(out, exist_ok=True)
w = int(os.environ.get('W', '375')); h = int(os.environ.get('H', '667'))
with sync_playwright() as p:
    b = p.chromium.launch()
    for job in sys.argv[1:]:
        name, query = job.split('=', 1)
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, locale='ja-JP')
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        pg.goto(f'http://127.0.0.1:5199/?{query}')
        pg.wait_for_timeout(int(os.environ.get('WAIT', '2500')))
        pg.screenshot(path=os.path.join(out, f'{name}.png'), full_page=os.environ.get('FULL') == '1')
        for e in errs: print(name, 'ERR', e)
        ctx.close()
    b.close()
