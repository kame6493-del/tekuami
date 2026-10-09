import sys, os
from playwright.sync_api import sync_playwright
from serve import serve
HERE = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]
with serve(os.path.join(HERE, '..', 'dist')) as base, sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1100, 'height': 1100})
    for arg in sys.argv[2:]:
        kind, size = arg.split(':')
        pg.goto(f'{base}/index.html?art=icon&kind={kind}&size={size}')
        pg.wait_for_timeout(300)
        pg.locator('#icon').screenshot(path=os.path.join(out, f'icon_{kind}_{size}.png'), omit_background=True)
    b.close()
