// Hero and story: one pinned stage. The hero text lifts away while the product frame rises and flattens,
// then four days play out. Visuals change by day (not scrubbed); the scroll only decides which day is on.
// On phones the screen becomes a close-up window that pans and zooms to the ringed element of each day.
import { gsap, ScrollTrigger, root, isNarrow, isPhone } from './motion';
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
const MIN_TEXT_PX = 11; // smallest effective text size in the phone close-up
const MAX_ZOOM = 4.2;

export function initStory() {
  const section = document.querySelector<HTMLElement>('[data-story]');
  if (!section) return;
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
  const sts = [...section.querySelectorAll<HTMLElement>('.st')];
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
    if (isPhone()) {
      // window height = what is left under the day bar, minus the browser bar, the story note and the caption
      const h = innerH - barH - 36 - 86 - 30 - 6;
      frame.style.setProperty('--closeup-h', `${Math.round(Math.max(170, Math.min(h, 440)))}px`);
      sstage.style.setProperty('--bw', `${innerW}px`);
    } else {
      const avail = innerH - barH - (isNarrow() ? 92 : 34 + 56) - 8;
      sstage.style.setProperty('--bw', `${Math.min(innerW, Math.max(260, ((avail - 36) * 1440) / 900))}px`);
    }
  }
  fit();
  window.addEventListener('resize', fit);
  ScrollTrigger.addEventListener('refreshInit', fit);

  // ---- the live screen ------------------------------------------------------------------------
  let app: AlefInstance | null = null;
  let dayNow = -1;
  let coNow = -2;
  let token = 0;
  mountAlef(host, 'asset').then((a) => {
    app = a;
    pan(coNow, false);
    replace();
  });

  const targetEl = (k: number) => host.querySelector<HTMLElement>(TARGETS[cos[k].dataset.target ?? ''] ?? '');
  const flat = () => Math.abs(Number(gsap.getProperty(frame, 'rotationX'))) < 0.5;

  // position of an element inside the 1440x900 canvas, from layout offsets (unaffected by any transform)
  function canvasRect(el: HTMLElement) {
    const scale = host.querySelector<HTMLElement>('.alef-scale')!;
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== scale) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { l: x, t: y, w: el.offsetWidth, h: el.offsetHeight };
  }

  // Phone close-up: pan and zoom the canvas so the ringed element fills the window. Transform only.
  function pan(k: number, animate: boolean) {
    if (!isPhone()) {
      gsap.set(host, { clearProps: 'transform' });
      return;
    }
    if (!app) return;
    const vw = imgs.clientWidth;
    const vh = imgs.clientHeight;
    const W = host.offsetWidth;
    const base = W / 1440;
    const H = 900 * base;
    let z: number;
    let tx = 0;
    let ty = 0;
    const el = k >= 0 ? targetEl(k) : null;
    if (!el) {
      // overview: the top left of the screen, filling the window
      z = Math.max(1, vh / H);
    } else {
      const r = canvasRect(el);
      const fs = parseFloat(getComputedStyle(el).fontSize) || 12;
      const pad = 14;
      const zMin = MIN_TEXT_PX / (fs * base);
      const zFit = Math.min((vw - 2 * pad) / (r.w * base), (vh - 2 * pad) / (r.h * base));
      z = Math.max(zMin, Math.min(zFit, MAX_ZOOM));
      const tooWide = r.w * base * z > vw - 2 * pad;
      tx = tooWide ? pad - r.l * base * z : vw / 2 - (r.l + r.w / 2) * base * z;
      ty = vh / 2 - (r.t + r.h / 2) * base * z;
      tx = Math.min(0, Math.max(vw - W * z, tx));
      ty = Math.min(0, Math.max(vh - H * z, ty));
    }
    const to = { x: tx, y: ty, scale: z };
    if (animate) gsap.to(host, { ...to, duration: 0.9, ease: 'power3.inOut', overwrite: true });
    else {
      gsap.killTweensOf(host); // a pan still running from an earlier day must not overwrite this one
      gsap.set(host, to);
    }
  }

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
    let L = r.left - s.left - pad;
    let Tt = r.top - s.top - pad;
    let Wd = r.width + 2 * pad;
    let Ht = r.height + 2 * pad;
    if (isPhone()) {
      // keep the ring inside the window
      const l2 = Math.max(L, 2);
      const t2 = Math.max(Tt, 2);
      Wd = Math.min(L + Wd, s.width - 2) - l2;
      Ht = Math.min(Tt + Ht, s.height - 2) - t2;
      L = l2;
      Tt = t2;
    }
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
    if (k < 0) {
      pan(-1, true);
      return;
    }
    const need = cos[k].dataset.view ?? 'asset';
    const settle = isPhone() ? 980 : 260;
    if (app.getView() === need) {
      host.classList.remove('sw');
      pan(k, true);
      setTimeout(() => my === token && showCo(k), settle);
      return;
    }
    host.classList.add('sw');
    setTimeout(() => {
      if (my !== token || !app) return;
      app.setView(need);
      pan(k, false);
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
    if (coNow >= 0 && cos[coNow].classList.contains('on')) {
      pan(coNow, false);
      place(coNow);
    } else if (coNow < 0) pan(-1, false);
  }
  window.addEventListener('resize', () => requestAnimationFrame(replace));
  ScrollTrigger.addEventListener('refresh', replace);
  document.fonts?.ready.then(replace);
  setDay(0);

  // ---- the pinned timeline ----------------------------------------------------------------------
  const narrow = isNarrow();
  gsap.set(frame, { rotationX: narrow ? 14 : 22, transformPerspective: 1600, transformOrigin: '50% 0%' });
  gsap.set([daybar, caption], { autoAlpha: 0 });

  // where the frame sits at the start: below the hero text, never lower than the viewport allows
  function startY() {
    const vh = window.innerHeight;
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

  skip?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo(0, (tl.scrollTrigger?.end ?? 0) + 2);
  });
}
