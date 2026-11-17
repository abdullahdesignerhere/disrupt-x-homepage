// Runs Lighthouse (mobile and desktop) against a running preview server and saves HTML + JSON to docs/checks/.
// Usage: npm run build && npm run preview &  then  npm run check:lh   (set CHROME_PATH to a Chromium binary)
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync, mkdirSync } from 'node:fs';

const url = process.env.URL ?? 'http://127.0.0.1:4321/';
const runs = process.env.RUNS ? Number(process.env.RUNS) : 1;
mkdirSync('docs/checks', { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'], chromePath: process.env.CHROME_PATH });
const summary = {};
for (const form of ['mobile', 'desktop']) {
  const flags = { port: chrome.port, output: ['html', 'json'], logLevel: 'error' };
  const config = form === 'desktop'
    ? { extends: 'lighthouse:default', settings: { formFactor: 'desktop', screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } }
    : undefined;
  const r = await lighthouse(url, flags, config);
  const [html, json] = r.report;
  writeFileSync(`docs/checks/lighthouse-${form}.html`, html);
  writeFileSync(`docs/checks/lighthouse-${form}.json`, json);
  const c = r.lhr.categories;
  summary[form] = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]));
  summary[form].metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'].map((k) => [k, r.lhr.audits[k].displayValue]));
}
await chrome.kill();
writeFileSync('docs/checks/lighthouse-summary.json', JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
