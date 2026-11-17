"""Behaviour checks against `astro preview` (default http://127.0.0.1:4321/).
Ports the old smoothness check and adds tab order, overflow, tap targets, keyboard, reduced motion and screenshots.
Run:  python3 scripts/checks/run_checks.py     Output: docs/checks/results.json and docs/checks/shots/
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

URL = os.environ.get('URL', 'http://127.0.0.1:4321/')
OUT = 'docs/checks'
SHOTS = OUT + '/shots'
os.makedirs(SHOTS, exist_ok=True)
R = {}

PINS = """() => [...document.querySelectorAll('.pin-spacer')].map(s => ({
  id: (s.firstElementChild.id || s.firstElementChild.className.split(' ')[0]),
  start: Math.round(s.getBoundingClientRect().top + scrollY),
  end: Math.round(s.getBoundingClientRect().top + scrollY + s.offsetHeight - innerHeight)}))"""

async def load(b, w, h, **kw):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, **kw)
    pg = await ctx.new_page()
    pg.errors = []
    pg.on('pageerror', lambda e: pg.errors.append(str(e)))
    await pg.goto(URL, wait_until='networkidle')
    await pg.wait_for_timeout(1200)
    return pg

async def scroll_to(pg, y, wait=1900):
    await pg.evaluate(f'window.scrollTo(0,{y})')
    await pg.wait_for_timeout(wait)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1. smoothness (wheel through the whole page, look for scroll jumps)
        pg = await load(b, 1440, 860)
        R['pins_1440x860'] = await pg.evaluate(PINS)
        prev, jumps = 0, []
        for _ in range(170):
            await pg.mouse.wheel(0, 120)
            await pg.wait_for_timeout(40)
            y = await pg.evaluate('scrollY')
            if abs(y - prev) > 400: jumps.append((prev, y))
            prev = y
        R['smoothness'] = {'final': prev, 'jumps': jumps, 'errors': pg.errors}
        print('final', prev, 'jumps', jumps, 'errors', pg.errors)
        await pg.context.close()

        # 2. platform tabs advance on scroll at four desktop sizes
        R['tabs_on_scroll'] = {}
        for w, h in [(1440, 900), (1280, 720), (1024, 768), (800, 600)]:
            pg = await load(b, w, h)
            pins = await pg.evaluate(PINS)
            mod = [x for x in pins if x['id'] == 'platform'][0]
            seq = []
            for i in range(5):
                await scroll_to(pg, mod['start'] + i * 480 + 240, 1500)
                seq.append(await pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').textContent"))
            R['tabs_on_scroll'][f'{w}x{h}'] = {'sequence': seq, 'pin': mod, 'errors': pg.errors}
            print(w, h, seq)
            await pg.context.close()

        # 3. phone: click tabs
        pg = await load(b, 390, 844, has_touch=True, is_mobile=True)
        seq = []
        for i in range(5):
            await pg.locator('[role=tab]').nth(i).click()
            await pg.wait_for_timeout(500)
            seq.append(await pg.evaluate("[document.querySelector('[role=tab][aria-selected=true]').textContent, [...document.querySelectorAll('[data-panel]')].filter(p=>getComputedStyle(p).display!='none').length]"))
        R['tabs_click_390'] = seq
        print('click', seq)
        await pg.context.close()

        # 4. overflow at 7 widths
        R['overflow'] = {}
        for w in [360, 390, 414, 768, 1024, 1280, 1440]:
            pg = await load(b, w, 800)
            for y in [0, 1500, 3200, 6000, 9000]:
                await scroll_to(pg, y, 300)
            R['overflow'][w] = await pg.evaluate('[document.documentElement.scrollWidth, innerWidth]')
            await pg.context.close()
        print('overflow', R['overflow'])

        # 5. tap targets at 390 (visible interactive elements under 44px)
        pg = await load(b, 390, 844, has_touch=True, is_mobile=True)
        small = await pg.evaluate("""() => [...document.querySelectorAll('a[href],button,summary,input')].filter(e => {
            const r = e.getBoundingClientRect(), s = getComputedStyle(e);
            if (!r.width || s.visibility === 'hidden' || e.closest('[inert]') || e.closest('.skip-link')) return false;
            return r.height < 44 || r.width < 44; }).map(e => ({t: (e.textContent||e.name||'').trim().slice(0,30), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height)}))""")
        R['tap_targets_under_44'] = small
        print('small targets', small)

        # 6. keyboard: mobile menu
        await scroll_to(pg, 0, 300)
        btn = pg.locator('[data-menu-btn]')
        await btn.click()
        o = await btn.get_attribute('aria-expanded')
        await pg.keyboard.press('Escape')
        c = await btn.get_attribute('aria-expanded')
        foc = await pg.evaluate('document.activeElement.matches("[data-menu-btn]")')
        await btn.click(); await pg.locator('[data-nav] a').first.click()
        c2 = await btn.get_attribute('aria-expanded')
        R['menu'] = {'opened': o, 'closed_by_escape': c, 'focus_back_on_button': foc, 'closed_by_link': c2}
        print('menu', R['menu'])
        await pg.context.close()

        # 7. keyboard on desktop: tab order, focus ring, tab arrows, accordion, form errors
        pg = await load(b, 1440, 900)
        order = []
        for _ in range(60):
            await pg.keyboard.press('Tab')
            info = await pg.evaluate("""() => { const e = document.activeElement, s = getComputedStyle(e);
              return {tag: e.tagName.toLowerCase(), text: (e.textContent||e.name||'').trim().slice(0,28),
                      ring: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 }}""")
            order.append(info)
        R['tab_order'] = order
        R['focus_without_ring'] = [o for o in order if not o['ring'] and o['tag'] != 'body']
        print('no ring:', R['focus_without_ring'])
        await pg.evaluate('document.activeElement.blur()')
        mod = [x for x in await pg.evaluate(PINS) if x['id'] == 'platform'][0]
        await scroll_to(pg, mod['start'] + 240, 1200)
        await pg.locator('[role=tab]').first.focus()
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(1500)
        a1 = await pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').textContent")
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(1500)
        a2 = await pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').textContent")
        await pg.keyboard.press('ArrowLeft'); await pg.wait_for_timeout(1500)
        a3 = await pg.evaluate("document.querySelector('[role=tab][aria-selected=true]').textContent")
        R['tab_arrows'] = [a1, a2, a3]
        summ = pg.locator('#faq summary').nth(1)
        await summ.scroll_into_view_if_needed(); await summ.focus()
        before = await pg.evaluate("document.querySelectorAll('#faq details')[1].open")
        await pg.keyboard.press('Enter')
        after_enter = await pg.evaluate("document.querySelectorAll('#faq details')[1].open")
        await pg.keyboard.press('Space')
        after_space = await pg.evaluate("document.querySelectorAll('#faq details')[1].open")
        R['accordion'] = {'before': before, 'after_enter': after_enter, 'after_space': after_space}
        # form
        await pg.locator('#f-name').scroll_into_view_if_needed()
        await pg.locator('#demoForm button[type=submit]').click()
        r = await pg.evaluate("({focus: document.activeElement.id, invalid: [...document.querySelectorAll('[aria-invalid=true]')].length, describedby: document.getElementById('f-name').getAttribute('aria-describedby'), err: document.getElementById('err-name').textContent})")
        await pg.fill('#f-name', 'Test User'); await pg.fill('#f-email', 'bad'); await pg.fill('#f-company', 'Co'); await pg.fill('#f-role', 'Role')
        await pg.locator('#demoForm button[type=submit]').click()
        r['bad_email_focus'] = await pg.evaluate('document.activeElement.id')
        await pg.fill('#f-email', 'a@b.co')
        await pg.locator('#demoForm button[type=submit]').click()
        r['success'] = await pg.evaluate("[document.getElementById('formStatus').textContent, document.getElementById('formStatus').getAttribute('role')]")
        R['form'] = r
        print(R['tab_arrows'], R['accordion'], R['form'])
        await pg.context.close()

        # 8. reduced motion: no pins, readable static page
        pg = await load(b, 1440, 900, reduced_motion='reduce')
        R['reduced_motion'] = await pg.evaluate("""() => ({pinSpacers: document.querySelectorAll('.pin-spacer').length,
          jsClass: document.documentElement.classList.contains('js'), mpin: document.documentElement.classList.contains('mpin'),
          dayLinesVisible: [...document.querySelectorAll('.dayset')].every(e => getComputedStyle(e).display !== 'none' && getComputedStyle(e.querySelector('.dls')).visibility === 'visible'),
          storyHeight: Math.round(document.querySelector('#story').getBoundingClientRect().height),
          statementOpacity: getComputedStyle(document.querySelector('[data-read]')).opacity,
          audienceOpacity: getComputedStyle(document.querySelector('.who article')).opacity,
          scrollHeight: document.documentElement.scrollHeight})""")
        await pg.screenshot(path=SHOTS + '/reduced-motion-top.png')
        await pg.screenshot(path=SHOTS + '/reduced-motion-full.png', full_page=True)
        print('reduced', R['reduced_motion'])
        await pg.context.close()

        # 9. screenshots
        for w, h, tag, kw in [(1440, 900, '1440', {}), (390, 844, '390', dict(has_touch=True, is_mobile=True, device_scale_factor=2))]:
            pg = await load(b, w, h, **kw)
            pins = await pg.evaluate(PINS)
            st = ([x for x in pins if x['id'] == 'story'] or [None])[0]
            mod = ([x for x in pins if x['id'] == 'platform'] or [None])[0]
            if st:
                for name, off in [('day6', 900), ('day4', 2100), ('day0', 2700)]:
                    await scroll_to(pg, st['start'] + off, 2600)
                    await pg.screenshot(path=f'{SHOTS}/story-{name}-{tag}.png')
            else:  # phones: the story is a stacked timeline, no pins
                await pg.evaluate("document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager')")
                for i, name in enumerate(['day6', 'day5', 'day4', 'day0']):
                    card = pg.locator('.sk-card').nth(i)
                    await card.scroll_into_view_if_needed(); await pg.wait_for_timeout(900)
                    await card.screenshot(path=f'{SHOTS}/story-{name}-{tag}.png')
            await scroll_to(pg, 0, 600)
            for i, a in enumerate(await pg.query_selector_all('.who article')):
                await a.scroll_into_view_if_needed(); await pg.wait_for_timeout(1200)
                await a.screenshot(path=f'{SHOTS}/audience-{i+1}-{tag}.png')
            for sid in ('results', 'answers'):
                el = await pg.query_selector('#' + sid)
                await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(1500)
                await pg.evaluate("document.querySelectorAll('[data-reveal]').forEach(e => e.classList.add('is-in'))")
                await pg.wait_for_timeout(700)
                await pg.add_style_tag(content='.sitehead,.skip-link{visibility:hidden!important}')
                await el.screenshot(path=f'{SHOTS}/{sid}-{tag}.png')
            if tag == '1440':
                for name, i in [('tab1', 0), ('tab5', 4)]:
                    await scroll_to(pg, mod['start'] + i * 480 + 240, 2200)
                    await pg.screenshot(path=f'{SHOTS}/modules-{name}-{tag}.png')
            await scroll_to(pg, 0, 600)
            await pg.screenshot(path=f'{SHOTS}/full-{tag}.png', full_page=True)
            await pg.context.close()
        await b.close()
    json.dump(R, open(OUT + '/results.json', 'w'), indent=2)

asyncio.run(main())
