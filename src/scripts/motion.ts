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
