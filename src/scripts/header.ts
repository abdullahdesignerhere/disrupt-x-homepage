// Header: mobile menu (button with aria-expanded) and the thin page progress bar.
import { gsap, root, prefersReducedMotion } from './motion';

export function initHeader() {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (btn && nav) {
    root.classList.add('js-nav');
    const openLabel = btn.dataset.openLabel ?? 'Open menu';
    const closeLabel = btn.dataset.closeLabel ?? 'Close menu';
    const set = (open: boolean) => {
      nav.classList.toggle('open', open);
      root.classList.toggle('menu-open', open); // locks page scroll behind the menu
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? closeLabel : openLabel);
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('a')) set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        set(false);
        btn.focus();
      }
    });
    window.matchMedia('(min-width: 921px)').addEventListener('change', (m) => m.matches && set(false));
  }

  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (bar && !prefersReducedMotion()) {
    gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
  }
}
