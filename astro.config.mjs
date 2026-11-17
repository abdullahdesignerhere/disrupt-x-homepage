import { defineConfig } from 'astro/config';

// TODO: replace with the real production origin before launch. It feeds the canonical URL and Open Graph URL.
const SITE_URL = 'https://example.com';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  build: { inlineStylesheets: 'auto' },
});
