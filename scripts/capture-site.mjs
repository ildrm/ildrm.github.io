import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const output = resolve('artifacts/screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const width of [320, 375, 768, 1440]) {
  const height = width <= 375 ? 812 : width === 768 ? 1024 : 900;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  for (const [name, path] of [['home', '/'], ['projects', '/projects.html'], ['experience', '/experience.html'], ['contact', '/contact.html'], ['not-found', '/404.html']]) {
    await page.goto(`http://127.0.0.1:4173${path}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(output, `${name}-${width}.png`) });
  }
  await page.close();
}
await browser.close();
console.log(`Saved screenshots in ${output}`);
