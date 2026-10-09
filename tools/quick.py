"""画面を何枚か撮る(作りながらの確認用)。python quick.py <名前> <クエリ> [操作...]"""
import sys
from playwright.sync_api import sync_playwright
from serve import serve
out = '../work/shots/quick'
import os; os.makedirs(out, exist_ok=True)
jobs = [a.split('|') for a in sys.argv[1:]]
with serve('../dist') as base, sync_playwright() as p:
    b = p.chromium.launch()
    for name, query, *clicks in jobs:
        scheme = 'dark' if name.endswith('_dark') else 'light'
        ctx = b.new_context(viewport={'width': 375, 'height': 667}, device_scale_factor=2, color_scheme=scheme)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: print('ERR', e))
        pg.goto(f'{base}/index.html?{query}')
        pg.wait_for_timeout(600)
        for c in clicks:
            if c.startswith('wait'):
                pg.wait_for_timeout(int(c[4:]))
            else:
                pg.get_by_text(c, exact=True).first.click()
                pg.wait_for_timeout(500)
        pg.wait_for_timeout(2600)
        pg.screenshot(path=f'{out}/{name}.png')
        ctx.close()
    b.close()
