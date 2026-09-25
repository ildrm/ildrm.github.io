import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const pages = ['/', '/projects.html', '/experience.html', '/contact.html', '/404.html'];
const repositories = JSON.parse(readFileSync(new URL('../assets/data/repositories.json', import.meta.url), 'utf8')).repositories;

for (const path of pages) {
  test(`${path} renders and passes axe`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('mobile navigation and contact paths work', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('.hero-name')).toContainText('Shahin');
  await page.locator('.mobile-nav summary').click();
  await page.locator('.mobile-nav-links a[href="projects.html"]').click();
  await expect(page).toHaveURL(/projects\.html$/);
  await expect(page.locator('h1')).toContainText('Engineering projects');
});

test('expertise cards align without overlapping and local fonts load', async ({ page }) => {
  for (const [width, expectedRows] of [[1440, [3, 2]], [768, [2, 2, 1]], [375, [1, 1, 1, 1, 1]]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => ({
      fonts: [...document.fonts].filter(font => ['Space Grotesk', 'IBM Plex Mono'].includes(font.family)).map(font => font.status),
      cards: [...document.querySelectorAll('.classification-grid .class-item')].map(card => {
        const rect = card.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
      })
    }));
    expect(layout.fonts.length, `font declarations at ${width}px`).toBe(4);
    expect(layout.fonts.every(status => status === 'loaded'), `fonts at ${width}px`).toBe(true);
    let index = 0;
    for (const count of expectedRows) {
      const row = layout.cards.slice(index, index + count);
      expect(Math.max(...row.map(card => card.y)) - Math.min(...row.map(card => card.y)), `row alignment at ${width}px`).toBeLessThanOrEqual(1);
      for (let cardIndex = 1; cardIndex < row.length; cardIndex++) {
        expect(row[cardIndex].x - row[cardIndex - 1].right, `card gap at ${width}px`).toBeGreaterThanOrEqual(10);
      }
      if (index) expect(row[0].y - layout.cards[index - 1].bottom, `row gap at ${width}px`).toBeGreaterThanOrEqual(10);
      index += count;
    }
  }
});

test('navigation stays usable at small, tablet, and error-page widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/');
  await page.addStyleTag({ content: '.no-webgl .motion-toggle{display:block!important}' });
  const header = await page.evaluate(() => ['.hud-brand', '.mobile-nav', '.hud-actions'].map(selector => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return { x: rect.x, right: rect.right };
  }));
  expect(header[0].right).toBeLessThan(header[1].x);
  expect(header[1].right).toBeLessThan(header[2].x);
  expect(header[2].right).toBeLessThanOrEqual(320);
  await page.locator('.mobile-nav summary').click();
  await expect(page.locator('.mobile-nav-links a')).toHaveCount(4);
  await expect(page.locator('.mobile-nav-links a').last()).toBeVisible();

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/');
  await expect(page.locator('.mobile-nav')).toBeHidden();
  await expect(page.locator('.hud-nav > a')).toHaveCount(4);
  for (const link of await page.locator('.hud-nav > a').all()) await expect(link).toBeVisible();

  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/404.html');
  await page.locator('.mobile-nav summary').click();
  await page.locator('.mobile-nav-links a[href="/contact.html"]').click();
  await expect(page).toHaveURL(/contact\.html$/);
});

test('repository filters, sort, and empty state work', async ({ page }) => {
  await page.goto('/projects.html');
  const rows = page.locator('.repo-row');
  await expect(rows).toHaveCount(repositories.length);
  await page.locator('#repo-search').fill('doris-jalali-date');
  await expect(rows.filter({ visible: true })).toHaveCount(1);
  await page.locator('#repo-search').fill('a-query-with-no-results');
  await expect(page.locator('#repo-empty')).toBeVisible();
  await page.locator('#repo-search').fill('');
  await page.locator('#repo-status').selectOption('fork');
  await expect(rows.filter({ visible: true })).toHaveCount(repositories.filter(item => item.fork).length);
  await page.locator('#repo-status').selectOption('');
  await page.locator('#repo-sort').selectOption('name-desc');
  await expect(rows.first().locator('.repo-name')).toContainText('wp-workflow-pipeline');
});

test('essential content and mobile navigation work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('.hero-intro')).toBeVisible();
  await expect(page.locator('.featured-card')).toHaveCount(3);
  await page.goto('http://127.0.0.1:4173/projects.html');
  await expect(page.locator('.repo-row')).toHaveCount(repositories.length);
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('.mobile-nav summary').click();
  await page.locator('.mobile-nav-links a[href="contact.html"]').click();
  await expect(page).toHaveURL(/contact\.html$/);
  await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  await context.close();
});

test('reduced motion keeps content visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.hero-intro')).toBeVisible();
  await expect(page.locator('.motion-toggle')).toHaveText('Motion reduced');
  await expect(page.locator('body')).toHaveClass(/no-webgl/);
});

test('portrait painting is visible and changes before it completes', async ({ page }) => {
  await page.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.waitForFunction(() => {
      const caption = document.getElementById('portrait-caption')?.textContent || '';
      const count = Number((caption.match(/GEOMETRIZE \/ (\d+) OF/) || [])[1]);
      return count >= 30 && count < 3000;
    }, null, { timeout: 90000 });
    await expect.poll(() => page.locator('.portrait-canvas').evaluate(canvas => Number(getComputedStyle(canvas).opacity))).toBe(1);
    await expect.poll(() => page.locator('.portrait-source').evaluate(source => Number(getComputedStyle(source).opacity))).toBe(0);
    const first = await page.evaluate(() => {
      const canvas = document.getElementById('portrait-canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let checksum = 0;
      for (let index = 0; index < pixels.length; index += 31) checksum = (checksum * 31 + pixels[index]) >>> 0;
      return { count: Number((document.getElementById('portrait-caption').textContent.match(/GEOMETRIZE \/ (\d+) OF/) || [])[1]), checksum };
    });
    await page.waitForFunction(previous => {
      const count = Number((document.getElementById('portrait-caption')?.textContent.match(/GEOMETRIZE \/ (\d+) OF/) || [])[1]);
      return count >= previous + 30;
    }, first.count, { timeout: 90000 });
    const secondChecksum = await page.evaluate(() => {
      const canvas = document.getElementById('portrait-canvas');
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let checksum = 0;
      for (let index = 0; index < pixels.length; index += 31) checksum = (checksum * 31 + pixels[index]) >>> 0;
      return checksum;
    });
    expect(secondChecksum, `painted pixels at ${width}px`).not.toBe(first.checksum);
    if (width === 375) await expect(page.locator('.motion-toggle')).toBeVisible();
  }
});

test('motion control persists and WebGL failure leaves content readable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route('https://cdnjs.cloudflare.com/**', route => route.abort());
  await page.goto('/');
  await page.locator('.motion-toggle').click();
  await expect(page.locator('.motion-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveClass(/motion-paused/);
  await page.reload();
  await expect(page.locator('.motion-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.hero-intro')).toBeVisible();
  await expect(page.locator('.portrait-source')).toBeVisible();
  await page.waitForFunction(() => document.body.classList.contains('no-webgl'));
  await page.waitForFunction(() => document.body.classList.contains('portrait-geometrizing'));
  await expect(page.locator('.portrait-source')).toHaveCSS('opacity', '1');
  await expect(page.locator('.portrait-canvas')).toHaveCSS('opacity', '0');
  await page.locator('.motion-toggle').click();
  await page.waitForFunction(() => document.body.classList.contains('portrait-ready'));
  await expect(page.locator('.portrait-canvas')).toHaveCSS('opacity', '1');
});

test('representative widths have no horizontal overflow', async ({ page }) => {
  for (const width of [320, 360, 375, 390, 430, 760, 761, 768, 900, 901, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});
