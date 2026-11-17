"""Loads a built site from a URL and checks: no failed requests, no console errors, every image loads,
both pins exist, ALEF screens mount, canonical and og:image carry the right base.
Usage: python3 scripts/checks/base_test.py URL"""
import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        bad, cons, req = [], [], []
        pg.on('response', lambda r: bad.append((r.status, r.url)) if r.status >= 400 else req.append(r.url))
        pg.on('console', lambda m: cons.append(m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: cons.append(str(e)))
        await pg.goto(URL, wait_until='networkidle')
        h = await pg.evaluate('document.documentElement.scrollHeight')
        for y in range(0, h, 400):
            await pg.evaluate(f'window.scrollTo(0,{y})'); await pg.wait_for_timeout(150)
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate("""() => ({
          pins: [...document.querySelectorAll('.pin-spacer')].length,
          alefMounted: [...document.querySelectorAll('[data-alef-host]')].filter(h => h.querySelector('.alef-scale')).length,
          alefHosts: document.querySelectorAll('[data-alef-host]').length,
          brokenImages: [...document.images].filter(i => !i.naturalWidth).map(i => i.src),
          imgCount: document.images.length,
          canonical: document.querySelector('link[rel=canonical]').href,
          ogImage: document.querySelector('meta[property="og:image"]').content,
          sections: ['results','answers','who','platform','how','faq','demo'].filter(id => document.getElementById(id)).length})""")
        r['failed_requests'] = bad; r['console'] = cons
        r['external_requests'] = sorted({u.split('/')[2] for u in req if not u.startswith('data:')} )
        print(json.dumps(r, indent=1))
        og = await pg.request.get(r['ogImage'].replace('https://example.com', URL.split('/', 3)[0] + '//' + URL.split('/')[2]).replace('https://abdullahdesignerhere.github.io', URL.split('/', 3)[0] + '//' + URL.split('/')[2]))
        print('og fetch (after host swap):', og.status)
        await b.close()
asyncio.run(main())
