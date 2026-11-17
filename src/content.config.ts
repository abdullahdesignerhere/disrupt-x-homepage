// Content collections. One file per entry in src/content/<collection>/.
// Astro 7 reads this file from src/content.config.ts (the older src/content/config.ts path is no longer supported).
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const json = (dir: string, pattern = '**/*.json') => glob({ pattern, base: `./src/content/${dir}` });

const image = z.object({
  src: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().min(1),
});

const link = z.object({ label: z.string(), href: z.string() });

const site = defineCollection({
  loader: json('site'),
  schema: z.object({
    title: z.string(),
    description: z.string().min(80).max(170),
    themeColor: z.string(),
    ogImage: z.string(),
    ogImageAlt: z.string(),
    brand: z.object({ name: z.string(), homeLabel: z.string(), url: z.url() }),
    nav: z.array(link),
    navLabel: z.string(),
    menuOpenLabel: z.string(),
    menuCloseLabel: z.string(),
    skipToContent: z.string(),
    cta: link,
    hero: z.object({
      eyebrow: z.string(),
      titleStart: z.string(),
      titleMark: z.string(),
      titleEnd: z.string(),
      lead: z.string(),
      proof: z.string(),
    }),
    story: z.object({
      eyebrow: z.string(),
      without: z.string(),
      with: z.string(),
      dayWord: z.string(),
      skipLabel: z.string(),
      skipHref: z.string(),
      ctaNote: z.string(),
      ctaLabel: z.string(),
      frameLabel: z.string(),
      frameAlt: z.string(),
      caption: z.string(),
      cardLabel: z.string(),
    }),
    trust: z.object({ caption: z.string(), label: z.string() }),
    statement: z.object({ eyebrow: z.string(), before: z.string(), em: z.string(), after: z.string() }),
    who: z.object({ eyebrow: z.string(), heading: z.string(), caption: z.string() }),
    platform: z.object({ eyebrow: z.string(), heading: z.string(), sub: z.string(), tabsLabel: z.string() }),
    band: z.object({ text: z.string(), label: z.string() }),
    how: z.object({ eyebrow: z.string(), heading: z.string(), intro: z.string() }),
    faq: z.object({ eyebrow: z.string(), heading: z.string() }),
    demo: z.object({
      eyebrow: z.string(),
      headingStart: z.string(),
      headingMark: z.string(),
      points: z.array(z.string()).min(1).max(3),
      submit: z.string(),
      fields: z.object({ name: z.string(), email: z.string(), company: z.string(), role: z.string() }),
      errors: z.object({ name: z.string(), email: z.string(), company: z.string(), role: z.string() }),
      summary: z.string(),
      success: z.string(),
    }),
    footer: z.object({ links: z.array(link), note: z.string() }),
  }),
});

// A platform module: one tab plus one panel. Add a file here to add a module.
const modules = defineCollection({
  loader: json('modules'),
  schema: z.object({
    order: z.number(),
    tag: z.string(),
    tabLabel: z.string(),
    headline: z.string(),
    description: z.string(),
    bullets: z.array(z.string()).min(1).max(6),
    linkLabel: z.string(),
    linkHref: z.url(),
    // Name of a live ALEF screen (see src/lib/alef). Leave out to show only the image.
    view: z.enum(['asset', 'workorders', 'cafm-dashboard', 'incidents', 'hseq-dashboard', 'permits', 'energy', 'iot']).optional(),
    image: image,
  }),
});

const audiences = defineCollection({
  loader: json('audiences'),
  schema: z.object({
    order: z.number(),
    team: z.string(),
    headline: z.string(),
    text: z.string(),
    bullets: z.array(z.string()).length(3),
    // The link label and URL come from this module, so they cannot drift apart.
    module: reference('modules'),
    image: image,
  }),
});

const storyDays = defineCollection({
  loader: json('storyDays'),
  schema: z.object({
    order: z.number(),
    day: z.string(),
    without: z.string(),
    withoutIsBad: z.boolean().default(false),
    with: z.string(),
    view: z.enum(['asset', 'workorders']),
    // Which element of the screen gets the ring. The selectors live in src/scripts/story.ts.
    target: z.enum(['alarms-tab', 'raise-wo', 'first-row', 'download-report']),
    note: z.string(),
  }),
});

const faqs = defineCollection({
  loader: json('faqs'),
  schema: z.object({ order: z.number(), question: z.string(), answer: z.string() }),
});

const logos = defineCollection({
  loader: json('logos'),
  schema: z.object({
    order: z.number(),
    name: z.string(),
    src: z.string(),
    width: z.number(),
    height: z.number(),
  }),
});

const awards = defineCollection({
  loader: json('awards'),
  schema: z.object({
    order: z.number(),
    // The two text lines are the accessible name; the badge image itself is decorative.
    line1: z.string(),
    line2: z.string(),
    src: z.string(),
    width: z.number(),
    height: z.number(),
  }),
});

const steps = defineCollection({
  loader: json('steps'),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    text: z.string(),
    chips: z.array(z.string()).default([]),
  }),
});

export const collections = { site, modules, audiences, storyDays, faqs, logos, awards, steps };
