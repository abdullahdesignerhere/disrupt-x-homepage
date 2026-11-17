// Hero and story: one pinned stage. The hero text lifts away while the product frame rises and flattens,
// then four days play out. Visuals change by day (not scrubbed); the scroll only decides which day is on.
// Phones and short screens do not use this file at all: they get the stacked story (see StoryStage.astro).
import { gsap, ScrollTrigger, root, isNarrow, coarse } from './motion';
import { mountAlef } from './alef';

// Which element of the recreated screen gets the ring. Names match `target` in the storyDays collection.
const TARGETS: Record<string, string> = {
  'alarms-tab': '.alef-at .tabs a:nth-child(6)',
  'raise-wo': '.alef-acts .alef-btn.o',
  'first-row': '.alef tbody tr:first-child',
  'download-report': '.alef-acts .dl',
};

// Scroll budget, in px. 600px for the lift, 600px for each day.
const LIFT_PX = 600;
const DAY_PX = 600;
// Timeline units: lift = 2, each day = 2.
const LIFT = 2;
const PER_DAY = 2;

export function initStory(): (() => void) | null {
  const section = document.querySelector<HTMLElement>('[data-story]');
  if (!section) return null;
  const sstage = section.querySelector<HTMLElement>('[data-sstage]')!;
  const daybar = section.querySelector<HTMLElement>('[data-daybar]')!;
  const heroIn = section.querySelector<HTMLElement>('[data-hero-in]')!;
  const frame = section.querySelector<HTMLElement>('[data-frame]')!;
  const stage = frame.querySelector<HTMLElement>('[data-stage]')!;
  const imgs = frame.querySelector<HTMLElement>('.imgs')!;
  const host = frame.querySelector<HTMLElement>('[data-alef-host]')!;
  const caption = frame.querySelector<HTMLElement>('figcaption');
  const skip = section.querySelector<HTMLAnchorElement>('[data-skip]');
  const sets = [...section.querySelectorAll<HTMLElement>('.dayset')];
  const sts = [...section.querySelectorAll<HTMLElement>('.st')].filter((el) => !host.contains(el)); // ALEF has its own .st
  const cos = [...section.querySelectorAll<HTMLElement>('.co')];
  const N = sets.length;
  const T = LIFT + PER_DAY * N;

  root.classList.add('js');

  // ---- sizing -------------------------------------------------------------------------------
  function fit() {
    const cs = getComputedStyle(sstage);
    const innerH = sstage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const innerW = sstage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const barH = daybar.offsetHeight + 10;
    const avail = innerH - barH - (isNarrow() ? 92 : 34 + 56) - 8;
    sstage.style.setProperty('--bw', `${Math.min(innerW, Math.max(260, ((avail - 36) * 1440) / 900))}px`);
  }
  fit();
  // Fit only when the layout width changes, or on a pointer:fine device (a desktop window resize).
  // On touch screens the address bar changes the height all the time and must not re-layout.
  let lastW = window.innerWidth;
  const onResize = () => {
    if (window.innerWidth === lastW && coarse()) return;
    lastW = window.innerWidth;
    fit();
  };
  window.addEventListener('resize', onResize);
  ScrollTrigger.addEventListener('refreshInit', fit);

  // ---- the live screen ------------------------------------------------------------------------
  let app: AlefInstance | null = null;
  let dayNow = -1;
  let coNow = -2;
  let token = 0;
  mountAlef(host, 'asset').then((a) => {
    app = a;
    replace();
  });

  const targetEl = (k: number) => host.querySelector<HTMLElement>(TARGETS[cos[k].dataset.target ?? ''] ?? '');
  const flat = () => Math.abs(Number(gsap.getProperty(frame, 'rotationX'))) < 0.5;

  // ring and callout card, computed from the real element so they follow any layout
  function place(k: number) {
    if (!app || !flat()) return false;
    const el = targetEl(k);
    if (!el) return false;
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const co = cos[k];
    const ring = co.querySelector<HTMLElement>('.ring')!;
    const card = co.querySelector<HTMLElement>('.ccard')!;
    const ln = co.querySelector<SVGLineElement>('line')!;
    const pad = Math.max(3, s.width * 0.004);
    const L = r.left - s.left - pad;
    const Tt = r.top - s.top - pad;
    const Wd = r.width + 2 * pad;
    const Ht = r.height + 2 * pad;
    Object.assign(ring.style, { left: `${L}px`, top: `${Tt}px`, width: `${Wd}px`, height: `${Ht}px` });
    if (isNarrow()) {
      ['x1', 'x2', 'y1', 'y2'].forEach((a) => ln.setAttribute(a, '0'));
      return true;
    }
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const cx = L + Wd / 2;
    const gap = Math.max(22, s.height * 0.05);
    const cl = Math.max(8, Math.min(s.width - cw - 8, cx - cw / 2));
    let ct = Tt + Ht + gap;
    let up = false;
    if (ct + ch > s.height - 8) {
      ct = Tt - gap - ch;
      up = true;
    }
    card.style.left = `${cl}px`;
    card.style.top = `${ct}px`;
    const lx = Math.max(cl + 14, Math.min(cl + cw - 14, cx));
    ln.setAttribute('x1', String(cx));
    ln.setAttribute('y1', String(up ? Tt : Tt + Ht));
    ln.setAttribute('x2', String(lx));
    ln.setAttribute('y2', String(up ? ct + ch : ct));
    return true;
  }

  function showCo(k: number, tries = 0) {
    if (place(k)) cos[k].classList.add('on');
    else if (tries < 12 && k === coNow) setTimeout(() => k === coNow && showCo(k, tries + 1), 120);
  }

  function goCallout(k: number) {
    const my = ++token;
    cos.forEach((el) => el.classList.remove('on'));
    if (!app) return;
    if (k < 0) return;
    const need = cos[k].dataset.view ?? 'asset';
    if (app.getView() === need) {
      host.classList.remove('sw');
      setTimeout(() => my === token && showCo(k), 260);
      return;
    }
    host.classList.add('sw');
    setTimeout(() => {
      if (my !== token || !app) return;
      app.setView(need);
      host.classList.remove('sw');
      setTimeout(() => my === token && showCo(k), 420);
    }, 320);
  }

  function setDay(k: number) {
    if (k === dayNow) return;
    dayNow = k;
    sets.forEach((el, i) => el.classList.toggle('on', i === k));
    sts.forEach((el, i) => el.classList.toggle('on', i <= k));
  }
  function setCo(k: number) {
    if (k === coNow) return;
    coNow = k;
    goCallout(k);
  }
  function replace() {
    if (coNow >= 0 && cos[coNow].classList.contains('on')) place(coNow);
  }
  const onResizeReplace = () => requestAnimationFrame(replace);
  window.addEventListener('resize', onResizeReplace);
  ScrollTrigger.addEventListener('refresh', replace);
  document.fonts?.ready.then(replace);
  setDay(0);

  // ---- the pinned timeline ----------------------------------------------------------------------
  const narrow = isNarrow();
  gsap.set(frame, { rotationX: narrow ? 14 : 22, transformPerspective: 1600, transformOrigin: '50% 0%' });
  gsap.set([daybar, caption], { autoAlpha: 0 });

  // where the frame sits at the start: below the hero text, never lower than the viewport allows
  function startY() {
    const vh = section.clientHeight; // the pinned stage height (100svh), steady while the address bar moves
    const y0 = Number(gsap.getProperty(sstage, 'y')) || 0;
    const frameTop = frame.getBoundingClientRect().top - y0;
    let target = Math.max(vh * (narrow ? 0.8 : 0.74), heroIn.getBoundingClientRect().bottom + (narrow ? 14 : 24));
    target = Math.min(target, vh - 70);
    return Math.max(0, target - frameTop);
  }

  const unit = (LIFT_PX + DAY_PX * N) / T; // px per timeline unit
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: {
      trigger: section, start: 'top top', end: `+=${Math.round(T * unit)}`,
      pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
    },
    onUpdate() {
      const t = tl.time();
      const k = Math.min(N - 1, Math.max(0, Math.floor((t - LIFT) / PER_DAY)));
      setDay(t < LIFT ? 0 : k);
      setCo(t >= LIFT ? k : -1);
      daybar.classList.toggle('cta-on', t >= T - PER_DAY * 0.65);
      sts.forEach((el, i) => (el.firstElementChild as HTMLElement).style.setProperty('--f', Math.min(1, Math.max(0, (t - LIFT - PER_DAY * i) / PER_DAY)).toFixed(3)));
    },
  });
  tl.to(heroIn, { y: -130, opacity: 0, duration: 1.2 }, 0)
    .fromTo(sstage, { y: startY }, { y: 0, duration: LIFT }, 0)
    .to(frame, { rotationX: 0, duration: LIFT }, 0)
    .to([daybar, caption], { autoAlpha: 1, duration: 0.45, ease: 'power1.out' }, LIFT - 0.5)
    .to({}, { duration: 0.1 }, T - 0.1);

  const onSkip = (e: Event) => {
    e.preventDefault();
    window.scrollTo(0, (tl.scrollTrigger?.end ?? 0) + 2);
  };
  skip?.addEventListener('click', onSkip);

  // Undo everything, so the section falls back to the plain stacked layout (short landscape phones, tiny screens).
  return () => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('resize', onResizeReplace);
    ScrollTrigger.removeEventListener('refreshInit', fit);
    ScrollTrigger.removeEventListener('refresh', replace);
    skip?.removeEventListener('click', onSkip);
    tl.scrollTrigger?.kill(true);
    tl.kill();
    gsap.killTweensOf(host);
    gsap.set([sstage, frame, heroIn, daybar, caption, host, ...sts.map((e) => e.firstElementChild as HTMLElement)], { clearProps: 'all' });
    sstage.style.removeProperty('--bw');
    daybar.classList.remove('cta-on');
    root.classList.remove('js');
  };
}
