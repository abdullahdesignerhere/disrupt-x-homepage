# Disrupt-X concept homepage

A one-page concept homepage for Disrupt-X and its ALEF 360° platform. It is a static Astro site: no UI framework, GSAP for scroll motion, fonts and scripts bundled locally, no requests to other sites at runtime. It is not connected to any back end. The demo form sends nothing.

## Run it

```
npm install
npm run dev        # dev server on http://localhost:4321
npm run build      # static site into dist/
npm run preview    # serve dist/ on http://127.0.0.1:4321
npm run check      # astro check (types and templates)
```

Node 22 or newer. The site address and base path default to GitHub Pages in `astro.config.mjs` and can be overridden with `SITE_URL` and `BASE_PATH` (see Deploy).

## Where things are

```
src/
  pages/index.astro        builds the page from the content collections
  layouts/Base.astro       <head>: title, meta, Open Graph, JSON-LD, font preload, skip link
  components/              one .astro file per section or reusable piece
  content/                 all copy and data, one JSON file per entry
  content.config.ts        zod schemas for every collection
  styles/tokens.css        colours, type scale, spacing, radii, shadows, breakpoints
  styles/global.css        reset, focus ring, skip link, reveal helper
  scripts/                 story.ts, modules.ts, reveal.ts, form.ts, header.ts (+ motion.ts, alef.ts, main.ts)
  lib/alef/                the ALEF 360° screen recreation (alef.css, alef.js), unchanged
public/assets/             images, logos, awards
scripts/                   lighthouse.mjs, axe.mjs, checks/run_checks.py
docs/checks/               evidence from the last check run
```

Components hold no copy. Component styles are scoped; shared values come from `tokens.css`. The page order is in `src/pages/index.astro`: header, hero and story, logos and awards, statement, who it's for, platform, call-to-action band, how it works, customer story (sample), answer cards (sample), FAQ, demo form, footer.

The collections are `site` (nav, hero, labels, meta, footer), `modules`, `audiences`, `storyDays`, `faqs`, `results`, `answers`, `logos`, `awards` and `steps`. Each entry has an `order` number. Note: Astro 7 reads the schema file from `src/content.config.ts`; the older `src/content/config.ts` path is not supported.

## Deploy

The site is deployed with GitHub Pages, through a GitHub Actions workflow that runs `npm ci` and `npm run build` with `BASE_PATH` set. The defaults are `SITE_URL=https://abdullahdesignerhere.github.io` and `BASE_PATH=/disrupt-x-homepage`, so the live address is https://abdullahdesignerhere.github.io/disrupt-x-homepage/. For a root build use `BASE_PATH=/ SITE_URL=https://example.com npm run build`. Image and asset paths go through `src/lib/url.ts` (`asset()`), so both builds work. The workflow file is not in this repository.

## Add things

- **A module:** copy a file in `src/content/modules/`, change the fields, set a new `order`. It appears as a tab and a panel and the pinned scroll lengthens by itself. `view` picks a live ALEF screen (optional); `image` is the placeholder and the no-JS version.
- **An audience:** add a file in `src/content/audiences/`. `module` points at a module file, and the link label and URL come from it. Blocks alternate sides by order.
- **A FAQ:** add a file in `src/content/faqs/` with `question`, `answer`, `order`. The FAQ structured data is built from the same files.
- **A results figure or an answer card:** edit `src/content/results/` or add a file to `src/content/answers/`. Both sections are sample data and show a "Sample data" chip (label in `site.json`).
- **A story day, logo, award or step:** same pattern in its folder. A new story day needs a `target` from the list in `content.config.ts`; the selectors are in `src/scripts/story.ts`.

## Design tokens

All in `src/styles/tokens.css`. The button is `#19A993` with `#06110F` text. Breakpoint values are listed there as reference; CSS cannot use custom properties inside media queries, so the same numbers are repeated in the media queries and in `src/scripts/motion.ts`.

## Behaviour notes

- Hero and story are one pinned stage: 600px of scroll to lift the frame, then 600px for each of four days. At 760px and below the screen becomes a close-up window that pans and zooms to the highlighted element. For the work-order row the close-up frames the first three cells at a smaller zoom (text about 9px) because the row is wider than a phone.
- Platform section pins at 761px and up (one tab per 480px of scroll, stacked layout up to 1000px). Below that it is plain tabs.
- With `prefers-reduced-motion` or without JavaScript there are no pins and the page is a normal readable document.
- The ALEF screens are loaded in two steps: the hero screen mounts straight away, the module screens when the section nears the viewport. The `.webp` images are the placeholders.

## Checks

Results from the last run are in `docs/checks/`. To repeat them:

```
npm run build && npm run preview &
export CHROME_PATH=/path/to/chromium      # Playwright's Chromium works
npm run check:lh                          # Lighthouse mobile and desktop, saves HTML + JSON
npm run check:a11y                        # axe-core at 1440 and 390 wide
python3 scripts/checks/run_checks.py      # scroll smoothness, tab order, overflow, tap targets,
                                          # keyboard, reduced motion, screenshots (needs playwright for Python)
```

`results.json` holds the behaviour checks, `axe-summary.json` and `lighthouse-summary.json` the other two. Screenshots and the two contact sheets are in `docs/checks/shots/` and `docs/checks/sheet-*.png`. Axe lists colour contrast as "incomplete" for text over gradients; the muted text colour `#9DA4B0` on the page backgrounds was checked by hand (about 7:1).

## Not done

- The form is not connected.
- No favicon; the page links an empty icon so browsers do not request one.
- Product screens are recreations from images on disrupt-x.io, not live product.
