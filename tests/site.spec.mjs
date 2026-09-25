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
});

test('representative widths have no horizontal overflow', async ({ page }) => {
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of pages) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});
