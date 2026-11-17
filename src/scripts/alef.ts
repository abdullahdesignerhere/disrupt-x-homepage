// Loads the ALEF 360° screen recreation (src/lib/alef) on demand and mounts it into a host element.
// The static .webp inside the host stays as the placeholder until the mount replaces it.
let loading: Promise<Window['AlefApp']> | null = null;

function load() {
  loading ??= Promise.all([import('../lib/alef/alef.css'), import('../lib/alef/alef.js')]).then(() => window.AlefApp);
  return loading;
}

export async function mountAlef(host: HTMLElement, view: string): Promise<AlefInstance | null> {
  const app = await load();
  if (!app) return null;
  return app.mount(host, { view });
}
