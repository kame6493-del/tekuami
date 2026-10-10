"""アイコンの原画を撮る(dist を開いて ?art=icon)。work/shots/icon_1024.png と icon_fg_1024.png"""
import os
from playwright.sync_api import sync_playwright
from serve import serve
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'work', 'shots')
os.makedirs(OUT, exist_ok=True)
with serve(os.path.join(HERE, '..', 'dist')) as base, sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1100, 'height': 1100})
    for name, q in [('icon_1024', 'art=icon'), ('icon_fg_1024', 'art=icon&fg=1')]:
        pg.goto(f'{base}/index.html?{q}')
        pg.wait_for_timeout(800)
        pg.locator('#icon').screenshot(path=os.path.join(OUT, f'{name}.png'), omit_background=True)
    b.close()
print('icon shots ok')
