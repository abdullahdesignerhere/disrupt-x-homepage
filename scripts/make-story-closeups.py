"""Pre-renders the phone story close-ups: public/assets/story/day{6,5,4,0}.webp.

Renders the real ALEF recreation (src/lib/alef, mounted by the built site) at 1440x900 with Playwright, rings the
element each day is about, crops a tight strip around it and saves a WebP 760px wide (about 2.4x, shown at 336px on a 390 phone).
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
W = 320            # crop width in canvas px; every image is OUT_W px wide, so the scale is OUT_W / W (about 2.4x)
OUT_W = 760
SCALE = OUT_W / W

# Each day: the view, the ringed element, and the crop as a canvas rectangle (x, y, h) with width W.
#   hide: CSS selectors hidden for the shot, so the strip shows the title, breadcrumb and the ringed control together
#         without cutting words (the recreated screen is 1440px wide, a phone shows about 320px of it at a readable size)
#   fade: edges where content continues past the crop; a soft white fade is painted there so it reads as "continues"
DAYS = {
    'day6': dict(view='asset', sel='.alef-at .tabs a:nth-child(6)', rect=(361, 84, 128), fade='r',
                 hide=['.alef-at .tabs a:nth-child(-n+4)']),
    'day5': dict(view='asset', sel='.alef-acts .alef-btn.o', rect=(1104, 84, 122), fade=''),
    'day4': dict(view='workorders', sel='.alef tbody tr:first-child', rect=None, fade='r', narrow=True),
    'day0': dict(view='asset', sel='.alef-acts .dl', rect=(838, 60, 110), fade='r',
                 hide=['.alef-at .tabs']),
}

# Day 4: a table row is 1300px wide. For the close-up only, hide the columns after the description and narrow the
# first three, so ID, status and description (and the header above them) fit at a readable size.
NARROW_CSS = """
#qh table.alef-tbl { width: 316px !important; }
#qh col:nth-child(1) { width: 74px !important; } #qh col:nth-child(2) { width: 92px !important; } #qh col:nth-child(3) { width: 150px !important; }
#qh col:nth-child(n+4), #qh th:nth-child(n+4), #qh td:nth-child(n+4) { display: none !important; }
"""
RING_CSS = """
.qring { position: absolute; z-index: 5; border: 2px solid #00ffce; border-radius: 8px; pointer-events: none;
  box-shadow: 0 0 0 3px rgba(0,255,206,.22), 0 0 18px rgba(0,255,206,.5); }
"""

FADE = 18  # canvas px (about 43px in the image)

async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=SCALE)
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
            await pg.evaluate("document.querySelectorAll('.qring,.qfade,.qtmp').forEach(e => e.remove())")
            css = (NARROW_CSS if d.get('narrow') else '') + ''.join(f'#qh {h} {{ display: none !important; }}\n' for h in d.get('hide', []))
            if css:
                await pg.evaluate("(css) => { const s = document.createElement('style'); s.className = 'qtmp'; s.textContent = css; document.head.appendChild(s); }", css)
                await pg.wait_for_timeout(200)
            if d['rect']:
                x, y, h = d['rect']
                if name == 'day6':  # follow the shifted tabs: crop starts at the title's left edge
                    x = await pg.evaluate("document.querySelector('#qh .alef-at').getBoundingClientRect().left") - 10
            else:
                # Day 4: from the card's left edge, the tab strip on top, to the bottom of the fourth row
                x, y, h = await pg.evaluate("""() => {
                  const hh = document.getElementById('qh'); const t = hh.querySelector('table.alef-tbl');
                  const card = t.parentElement.getBoundingClientRect(); const rows = t.querySelectorAll('tbody tr');
                  const r1 = rows[0].getBoundingClientRect(); const r4 = rows[3].getBoundingClientRect();
                  return [card.left - 8, r1.top - 94, r4.bottom - (r1.top - 94) + 1];
                }""")
            r = await pg.evaluate("""([sel, x, y, w, h, fade, FADE]) => {
              const hh = document.getElementById('qh'); const e = hh.querySelector(sel); const b = e.getBoundingClientRect();
              const ring = document.createElement('i'); ring.className = 'qring'; const pad = 4;
              Object.assign(ring.style, {left: (b.left - pad) + 'px', top: (b.top - pad) + 'px', width: (b.width + 2*pad) + 'px', height: (b.height + 2*pad) + 'px', position: 'fixed'});
              hh.appendChild(ring);
              const edge = (css) => { const f = document.createElement('i'); f.className = 'qfade'; f.style.cssText = 'position:fixed;z-index:6;pointer-events:none;' + css; hh.appendChild(f); };
              if (fade.includes('r')) edge(`left:${x + w - FADE}px;top:${y}px;width:${FADE}px;height:${h}px;background:linear-gradient(90deg,rgba(255,255,255,0),#fff)`);
              if (fade.includes('l')) edge(`left:${x}px;top:${y}px;width:${FADE}px;height:${h}px;background:linear-gradient(270deg,rgba(255,255,255,0),#fff)`);
              if (fade.includes('b')) edge(`left:${x}px;top:${y + h - FADE}px;width:${w}px;height:${FADE}px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff)`);
              return [b.left, b.top, b.width, b.height];
            }""", [d['sel'], x, y, W, h, d['fade'], FADE])
            png = await pg.screenshot(clip={'x': x, 'y': y, 'width': W, 'height': h})
            im = Image.open(io.BytesIO(png)).convert('RGB')
            im.save(os.path.join(OUT, f'{name}.webp'), quality=82, method=6)
            print(name, 'crop', round(x), round(y), W, round(h), '-> image', im.size, 'ring', [round(v) for v in r])
        await b.close()

asyncio.run(main())
