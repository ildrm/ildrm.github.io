import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';

const output = resolve('artifacts/lighthouse');
const temporary = resolve('artifacts/tmp');
await mkdir(output, { recursive: true });
await mkdir(temporary, { recursive: true });
process.env.TEMP = temporary;
process.env.TMP = temporary;

const production = process.argv.includes('--production');
const requestedPage = process.argv.find(argument => argument.startsWith('--page='))?.slice(7);
const paths = requestedPage ? [requestedPage === 'home' ? '/' : `/${requestedPage}.html`] : ['/', '/projects.html', '/experience.html', '/contact.html'];
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
for (const path of paths) {
  const url = `${production ? 'https://ildrm.com' : 'http://127.0.0.1:4173'}${path}`;
  const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox'] });
  try {
    const result = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error' });
    const name = path === '/' ? 'home' : path.slice(1, -5);
    await writeFile(resolve(output, `${production ? 'production' : 'local'}-${name}.json`), JSON.stringify(result.lhr), 'utf8');
    const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)]));
    console.log(`${url}: ${JSON.stringify(scores)}; LCP ${result.lhr.audits['largest-contentful-paint'].displayValue}; CLS ${result.lhr.audits['cumulative-layout-shift'].displayValue}`);
  } finally {
    try { await chrome.kill(); }
    catch (error) { console.warn(`Chrome cleanup: ${error.message}`); }
  }
}
process.exit(0);
