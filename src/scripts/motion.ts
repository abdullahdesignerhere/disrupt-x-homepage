// Shared motion setup: one GSAP, one ScrollTrigger, and the media queries every script agrees on.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
export const root = document.documentElement;

// Keep these numbers in step with the breakpoints in src/styles/tokens.css.
export const BP_PHONE = 760;
export const BP_STACK = 1000;
export const BP_NARROW = 900;

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isPhone = () => window.matchMedia(`(max-width: ${BP_PHONE}px)`).matches;
export const isNarrow = () => window.matchMedia(`(max-width: ${BP_NARROW}px)`).matches;

export const coarse = () => window.matchMedia('(pointer: coarse)').matches;

// Height that does not wobble with the mobile address bar: on touch screens use the largest height the
// screen can give this orientation, never less than the current inner height. Desktop uses the window.
export function stableHeight() {
  if (!coarse()) return window.innerHeight;
  const s = window.screen;
  const portrait = window.innerWidth <= window.innerHeight;
  const sh = portrait ? Math.max(s.width, s.height) : Math.min(s.width, s.height);
  return Math.max(window.innerHeight, sh || 0);
}

// The pinned story is used from 761px up and at least 521px tall. Everything else gets the stacked story.
// Keep this query in step with the one in src/components/StoryStage.astro.
export const STACK_MQ = `(max-width: ${BP_PHONE}px), (max-height: 520px)`;
export const canPinStory = () => !window.matchMedia(STACK_MQ).matches;
// The pinned platform needs room: below this height the plain tabs are used.
export const canPinModules = () => window.innerWidth > BP_PHONE && stableHeight() >= 560;
