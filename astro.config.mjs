import { defineConfig } from 'astro/config';

// Defaults are for GitHub Pages. Override with SITE_URL and BASE_PATH (for example BASE_PATH=/ for a root build).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://abdullahdesignerhere.github.io',
  base: process.env.BASE_PATH ?? '/disrupt-x-homepage',
  output: 'static',
  build: { inlineStylesheets: 'auto' },
});
