// axe-core via Playwright at 1440 and 390 wide. Scrolls the page first so scroll-driven text is fully shown.
// Saves docs/checks/axe-summary.json. Exits non-zero on serious or critical violations.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://127.0.0.1:4321/';
mkdirSync('docs/checks', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const out = {};
let fail = false;
for (const [name, w, h] of [['desktop-1440', 1440, 900], ['mobile-390', 390, 844]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  // visit every pinned tab and story day so every state is checked
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 350) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  const results = [];
  const states = [['top', 0]];
  for (const [label, y] of states) {
    await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(800);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
    results.push(...r.violations.map((v) => ({ state: label, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.html.slice(0, 140) })));
    out[name] = { passes: r.passes.length, incomplete: r.incomplete.map((i) => i.id), violations: results };
  }
  if (results.some((v) => v.impact === 'serious' || v.impact === 'critical')) fail = true;
}
await browser.close();
writeFileSync('docs/checks/axe-summary.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));
process.exit(fail ? 1 : 0);
