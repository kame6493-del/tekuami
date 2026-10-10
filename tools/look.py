"""作りながら絵を見る。vite の開発サーバー(5199)を開いて撮る。python tools/look.py 名前 クエリ [幅 高さ]"""
import sys, os
from playwright.sync_api import sync_playwright
name, query = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
h = int(sys.argv[4]) if len(sys.argv) > 4 else 1000
dsf = float(sys.argv[5]) if len(sys.argv) > 5 else 1
out = os.path.join(os.path.dirname(__file__), '..', 'work', 'look')
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dsf)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(f'http://127.0.0.1:5199/?{query}')
    pg.wait_for_timeout(int(os.environ.get('WAIT', '1500')))
    pg.screenshot(path=os.path.join(out, f'{name}.png'), full_page=os.environ.get('FULL') == '1')
    for e in errs: print('ERR', e)
    b.close()
