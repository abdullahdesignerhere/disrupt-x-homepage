"""Pre-renders the phone story close-ups: public/assets/story/day{6,5,4,0}.webp.

Renders the real ALEF recreation (src/lib/alef, mounted by the built site) at 1440x900 with Playwright, rings the
element each day is about, crops to the region around it and saves a 2x WebP (760px wide, shown at about 340-380px).
Phones never mount the live screen; they show these images.

Usage:  npm run build && npm run preview      (in another shell)
        python3 scripts/make-story-closeups.py [URL]      default http://127.0.0.1:4321/disrupt-x-homepage/
Needs: pip install playwright pillow
"""
import asyncio, io, os, sys
from PIL import Image
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4321/disrupt-x-homepage/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'story')
W, H = 380, 250  # crop size in canvas px; at 2x the file is 760px wide

# view, ring target (same selectors as src/scripts/story.ts used), crop: (left, top) offsets from the ring target's top-left
DAYS = {
    'day6': dict(view='asset', sel='.alef-at .tabs a:nth-child(6)', crop=(-250, -118)),
    'day5': dict(view='asset', sel='.alef-acts .alef-btn.o', crop=(-190, -56)),
    'day4': dict(view='workorders', sel='.alef tbody tr:first-child', crop=(-8, -92), narrow=True),
    'day0': dict(view='asset', sel='.alef-acts .dl', crop=(-90, -56)),
}

# Day 4: a table row is 1300px wide. For the close-up only, hide the columns after the description so the
# ID, status and description cells (and the header above them) fit at a readable size.
NARROW_CSS = """
#qh table.alef-tbl { width: 360px !important; }
#qh col:nth-child(1) { width: 72px !important; } #qh col:nth-child(2) { width: 92px !important; } #qh col:nth-child(3) { width: 196px !important; }
#qh col:nth-child(n+4), #qh th:nth-child(n+4), #qh td:nth-child(n+4) { display: none !important; }
"""
RING_CSS = """
.qring { position: absolute; z-index: 5; border: 2px solid #00ffce; border-radius: 8px; pointer-events: none;
  box-shadow: 0 0 0 3px rgba(0,255,206,.22), 0 0 18px rgba(0,255,206,.5); }
"""

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=2)
        pg = await ctx.new_page()
        await pg.goto(URL, wait_until='load')
        await pg.wait_for_function('window.AlefApp', timeout=20000)
        await pg.add_style_tag(content=RING_CSS)
        await pg.evaluate("""() => {
          const h = document.createElement('div'); h.id = 'qh';
          h.style.cssText = 'position:fixed;left:0;top:0;width:1440px;height:900px;z-index:99999;background:#fff';
          document.body.appendChild(h); window.__a = AlefApp.mount(h, {view: 'asset'});
        }""")
        for name, d in DAYS.items():
            await pg.evaluate(f"__a.setView('{d['view']}')")
            await pg.wait_for_timeout(900)
            await pg.evaluate("document.querySelectorAll('.qring').forEach(e => e.remove())")
            await pg.evaluate("document.getElementById('qnarrow')?.remove()")
            if d.get('narrow'):
                await pg.add_style_tag(content=NARROW_CSS)
                await pg.evaluate("document.head.lastElementChild.id = 'qnarrow'")
            r = await pg.evaluate("""(sel) => {
              const h = document.getElementById('qh'); const e = h.querySelector(sel); const b = e.getBoundingClientRect();
              const ring = document.createElement('i'); ring.className = 'qring'; const pad = 4;
              Object.assign(ring.style, {left: (b.left - pad) + 'px', top: (b.top - pad) + 'px', width: (b.width + 2*pad) + 'px', height: (b.height + 2*pad) + 'px', position: 'fixed'});
              h.appendChild(ring); return [b.left, b.top, b.width, b.height];
            }""", d['sel'])
            x = max(0, min(1440 - W, r[0] + d['crop'][0]))
            y = max(0, min(900 - H, r[1] + d['crop'][1]))
            png = await pg.screenshot(clip={'x': x, 'y': y, 'width': W, 'height': H})
            Image.open(io.BytesIO(png)).convert('RGB').save(os.path.join(OUT, f'{name}.webp'), quality=82, method=6)
            print(name, 'crop', round(x), round(y), W, H)
        await b.close()

asyncio.run(main())
