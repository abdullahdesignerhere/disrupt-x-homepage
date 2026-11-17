// Platform modules. At 761px and up the section is pinned: scrolling steps through the tabs, panels cross-fade,
// one pill glides between the tabs and a thin bar shows progress. Below that, and with reduced motion, it is plain tabs.
import { gsap, ScrollTrigger, root, BP_PHONE, BP_STACK, prefersReducedMotion } from './motion';
import { mountAlef } from './alef';

const STEP_PX = 480; // scroll distance per tab
const HYSTERESIS = 44; // px past a boundary before the tab changes, so it never flickers

export function initModules() {
  const plat = document.querySelector<HTMLElement>('[data-modules]');
  if (!plat) return;
  const tabs = [...plat.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const panels = [...plat.querySelectorAll<HTMLElement>('[data-panel]')];
  const pill = plat.querySelector<HTMLElement>('[data-pill]')!;
  const prog = plat.querySelector<HTMLElement>('[data-prog]')!;
  const viewport = plat.querySelector<HTMLElement>('[data-viewport]')!;
  const N = tabs.length;
  const reduced = prefersReducedMotion();

  root.classList.add('tabs-js', 'tabbed');

  let idx = 0;
  let engine: ((i: number) => void) | null = null;
  let st: ScrollTrigger | null = null;
  let lock = false;
  let mode: 'pin' | 'tabbed' | null = null;
  let onRefresh: (() => void) | null = null;

  // ---- tabs ------------------------------------------------------------------------------
  function placePill(animate: boolean) {
    if (mode !== 'pin') return;
    const t = tabs[idx];
    const v = { x: t.offsetLeft, y: t.offsetTop, width: t.offsetWidth, height: t.offsetHeight };
    if (animate) gsap.to(pill, { ...v, duration: 0.45, ease: 'power2.inOut', overwrite: true });
    else gsap.set(pill, v);
  }

  function setTab(i: number, focus = false) {
    idx = i;
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
    const row = tabs[i].parentElement!;
    if (row.scrollWidth > row.clientWidth) row.scrollLeft = tabs[i].offsetLeft - (row.clientWidth - tabs[i].offsetWidth) / 2;
    if (engine) {
      engine(i);
      placePill(true);
    }
    if (focus) tabs[i].focus();
  }

  function goTab(i: number) {
    if (!st) return setTab(i);
    const y = st.start + i * STEP_PX + STEP_PX / 2;
    lock = true;
    setTab(i);
    window.scrollTo({ top: y, behavior: 'smooth' });
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (Math.abs(window.scrollY - y) < 4 || Date.now() - t0 > 1800) {
        clearInterval(iv);
        lock = false;
      }
    }, 80);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => goTab(i));
    t.addEventListener('keydown', (e) => {
      const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : null;
      if (n === null) return;
      e.preventDefault();
      const next = (n + N) % N;
      goTab(next);
      tabs[next].focus();
    });
  });
  setTab(0);

  // ---- live screens: mounted when the section nears the viewport; the .webp stays as placeholder ----
  const hosts = [...plat.querySelectorAll<HTMLElement>('[data-alef-host][data-alef-view]')];
  const mountAll = () =>
    hosts.forEach((h) => {
      if (!h.dataset.mounted) {
        h.dataset.mounted = '1';
        mountAlef(h, h.dataset.alefView!);
      }
    });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        io.disconnect();
        mountAll();
      }
    }, { rootMargin: '900px 0px' });
    io.observe(plat);
  } else mountAll();

  if (reduced) return; // reduced motion: tabs only, no pin

  // ---- pinned stepper (761px and up) -------------------------------------------------------------
  const wantPin = () => window.innerWidth > BP_PHONE;
  const wantStack = () => window.innerWidth <= BP_STACK;

  // Stacked layout (761 to 1000px): size the screen by the height left under the text; hide the bullets, then
  // the sub-line, only if the screen would get too small.
  function fitStack() {
    if (!root.classList.contains('mstack')) {
      plat!.style.removeProperty('--mimg-h');
      root.classList.remove('nobul', 'nohp');
      return;
    }
    const room = () => {
      let tx = 0;
      panels.forEach((p) => {
        const d = p.querySelector<HTMLElement>('.mtext');
        if (d && d.offsetHeight > tx) tx = d.offsetHeight;
      });
      return viewport.clientHeight - tx - 14;
    };
    root.classList.remove('nobul', 'nohp');
    let h = room();
    if (h < 200) {
      root.classList.add('nobul');
      h = room();
    }
    if (h < 150) {
      root.classList.add('nohp');
      h = room();
    }
    plat!.style.setProperty('--mimg-h', `${Math.max(90, Math.floor(h))}px`);
  }

  function pinOn() {
    mode = 'pin';
    root.classList.add('mpin');
    root.classList.remove('tabbed');
    root.classList.toggle('mstack', wantStack());
    gsap.set(prog, { scaleX: 0, transformOrigin: '0 50%' });
    gsap.set(panels, { autoAlpha: (i: number) => (i === idx ? 1 : 0) });

    // Cross-fade queue: one transition at a time, always ending on the latest tab.
    let shown = idx;
    let want = idx;
    let busy = false;
    const run = () => {
      if (busy || want === shown) return;
      busy = true;
      const from = panels[shown];
      const to = panels[want];
      shown = want;
      const txt = [...to.querySelector('.mtext')!.children];
      const shot = to.querySelector('.mshot');
      gsap.timeline({ onComplete: () => { busy = false; run(); } })
        .to(from, { autoAlpha: 0, duration: 0.5, ease: 'sine.inOut' }, 0)
        .fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'sine.out' }, 0.15)
        .fromTo(txt, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.04 }, 0.15)
        .fromTo(shot, { scale: 1.015 }, { scale: 1, duration: 0.7, ease: 'power2.out' }, 0.15);
    };
    engine = (i) => { want = i; run(); };
    onRefresh = () => { fitStack(); placePill(false); };
    ScrollTrigger.addEventListener('refreshInit', onRefresh);
    fitStack();
    setTab(idx);
    placePill(false);
    st = ScrollTrigger.create({
      trigger: plat, start: 'top top', end: `+=${N * STEP_PX}`, pin: true, invalidateOnRefresh: true,
      onUpdate(self) {
        gsap.to(prog, { scaleX: self.progress, duration: 0.4, ease: 'power2.out', overwrite: true });
        if (lock) return;
        const p = self.scroll() - self.start;
        const lo = idx * STEP_PX;
        const hi = lo + STEP_PX;
        if (p > hi + HYSTERESIS || p < lo - HYSTERESIS) setTab(Math.max(0, Math.min(N - 1, Math.floor(p / STEP_PX))));
      },
    });
  }

  function pinOff() {
    mode = 'tabbed';
    st?.kill(true);
    st = null;
    if (onRefresh) ScrollTrigger.removeEventListener('refreshInit', onRefresh);
    onRefresh = null;
    engine = null;
    lock = false;
    gsap.killTweensOf([...panels, pill, prog]);
    panels.forEach((p) => {
      const inner = p.querySelectorAll('.mtext > *, .mshot');
      gsap.killTweensOf(inner);
      gsap.set([p, ...inner], { clearProps: 'all' });
    });
    gsap.set([pill, prog], { clearProps: 'all' });
    root.classList.remove('mpin', 'mstack', 'nobul', 'nohp');
    root.classList.add('tabbed');
    plat!.style.removeProperty('--mimg-h');
    tabs[0].parentElement!.scrollLeft = 0;
    setTab(idx);
  }

  if (wantPin()) pinOn();
  else mode = 'tabbed';

  let timer: number | undefined;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const m = wantPin() ? 'pin' : 'tabbed';
      if (m !== mode) (m === 'pin' ? pinOn : pinOff)();
      else if (mode === 'pin') {
        root.classList.toggle('mstack', wantStack());
        fitStack();
        placePill(false);
      }
      ScrollTrigger.refresh();
    }, 200);
  });
  document.fonts?.ready.then(() => {
    if (mode === 'pin') {
      fitStack();
      placePill(false);
    }
  });
}
