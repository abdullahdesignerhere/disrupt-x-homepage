// Reveal on scroll: fade plus 16px rise, once, 0.5s (the CSS lives in global.css). Also the statement
// word-by-word reading effect and the dashed line in "How it works".
import { gsap } from './motion';

export function initReveal() {
  document.documentElement.classList.add('reveal-ready');
  const items = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
  }

  // Statement: each word fades in as you scroll
  const read = document.querySelector<HTMLElement>('[data-read]');
  if (read) {
    const parts: Node[] = [];
    [...read.childNodes].forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        (n.textContent ?? '').split(/(\s+)/).forEach((t) => {
          if (!t) return;
          if (/^\s+$/.test(t)) return parts.push(document.createTextNode(t));
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = t;
          parts.push(span);
        });
      } else {
        // the highlighted phrase: split into words too, so it fades with the rest
        const el = n as HTMLElement;
        const words = (el.textContent ?? '').split(/(\s+)/).filter(Boolean);
        const wrap = el.cloneNode(false) as HTMLElement;
        words.forEach((t) => {
          if (/^\s+$/.test(t)) return wrap.appendChild(document.createTextNode(t));
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = t;
          wrap.appendChild(span);
        });
        parts.push(wrap);
      }
    });
    read.textContent = '';
    parts.forEach((p) => read.appendChild(p));
    // The dimmed state only starts once the block is about to scroll into view, so the text is never dim
    // when it is on screen at rest (and never dim for assistive checks or no-JS visitors).
    gsap.fromTo('[data-read] .w', { opacity: 1 }, {
      opacity: 0.2, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: read, start: 'top 140%', end: 'top 100%', scrub: true },
    });
    gsap.fromTo('[data-read] .w', { opacity: 0.2 }, {
      opacity: 1, stagger: 0.08, ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: read, start: 'top 80%', end: 'bottom 55%', scrub: true },
    });
  }

  const line = document.querySelector('[data-how-line]');
  if (line) {
    gsap.fromTo(line, { attr: { x2: 0 } }, { attr: { x2: 100 }, ease: 'none', scrollTrigger: { trigger: '#how', start: 'top 75%', end: 'top 25%', scrub: true } });
  }
}
