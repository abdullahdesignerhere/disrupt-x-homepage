import { ScrollTrigger, root, prefersReducedMotion } from './motion';
import { initHeader } from './header';
import { initStory } from './story';
import { initModules } from './modules';
import { initReveal } from './reveal';
import { initForm } from './form';

initForm();
initHeader();

// With reduced motion there are no pins and no scroll effects: the page is a plain, readable document.
if (!prefersReducedMotion()) initStory();
initModules();
if (!prefersReducedMotion()) {
  initReveal();
  ScrollTrigger.sort();
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh);
}
root.classList.add('ready');
