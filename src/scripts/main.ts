import { ScrollTrigger, root, prefersReducedMotion, canPinStory, coarse } from './motion';
import { initHeader } from './header';
import { initStory } from './story';
import { initModules } from './modules';
import { initReveal } from './reveal';
import { initForm } from './form';

initForm();
initHeader();

// With reduced motion there are no pins and no scroll effects: the page is a plain, readable document.
// The pinned story needs height. Short screens (landscape phones, 320x568) get the plain stacked layout instead,
// and the choice is re-made on rotation or a real window resize, never on an address-bar height change.
let storyOff: (() => void) | null = null;
const syncStory = () => {
  const want = !prefersReducedMotion() && canPinStory();
  if (want && !storyOff) storyOff = initStory();
  else if (!want && storyOff) {
    storyOff();
    storyOff = null;
    ScrollTrigger.refresh();
  }
};
syncStory();
let sw = window.innerWidth;
let st: number | undefined;
window.addEventListener('resize', () => {
  if (window.innerWidth === sw && coarse()) return;
  sw = window.innerWidth;
  clearTimeout(st);
  st = window.setTimeout(syncStory, 250);
});
initModules();
if (!prefersReducedMotion()) {
  initReveal();
  ScrollTrigger.sort();
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh);
}
root.classList.add('ready');
