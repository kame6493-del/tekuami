import sys
from playwright.sync_api import sync_playwright
from serve import serve
root, out = sys.argv[1], sys.argv[2]
with serve(root) as base, sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1100, 'height': 900})
    pg.on('pageerror', lambda e: print('ERR', e))
    for mode in sys.argv[3:]:
        pg.goto(f'{base}/index.html?art={mode}')
        pg.wait_for_timeout(500)
        pg.screenshot(path=f'{out}/art_{mode}.png', full_page=True)
    b.close()
