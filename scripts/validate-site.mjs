import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['index.html', 'projects.html', 'experience.html', 'contact.html'];
const canonical = new Set();
const titles = new Set();
const descriptions = new Set();
const read = name => readFile(resolve(root, name), 'utf8');
const attr = (html, expression) => html.match(expression)?.[1];

for (const name of names) {
  const html = await read(name);
  const url = `https://ildrm.com/${name === 'index.html' ? '' : name}`;
  const title = attr(html, /<title>([^<]+)<\/title>/);
  const description = attr(html, /<meta name="description" content="([^"]+)"/);
  assert(title && !titles.has(title), `${name}: unique title`);
  assert(description && !descriptions.has(description), `${name}: unique description`);
  titles.add(title); descriptions.add(description);
  assert.equal(attr(html, /<link rel="canonical" href="([^"]+)"/), url, `${name}: canonical`);
  assert(!canonical.has(url), `${name}: duplicate canonical`); canonical.add(url);
  assert.equal(attr(html, /<meta property="og:url" content="([^"]+)"/), url, `${name}: OG URL`);
  for (const property of ['og:title', 'og:description', 'og:image', 'og:image:alt']) {
    assert(html.includes(`property="${property}"`), `${name}: ${property}`);
  }
  assert(html.includes('name="twitter:card"'), `${name}: Twitter card`);
  assert(html.includes('name="robots" content="index,follow"'), `${name}: indexable`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${name}: one H1`);
  assert(html.includes('id="main-content"'), `${name}: skip target`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${name}: duplicate IDs`);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert(scripts.length, `${name}: JSON-LD`);
  for (const script of scripts) {
    const schema = JSON.parse(script[1]);
    assert.equal(schema.url, url, `${name}: schema URL`);
    assert.equal(schema['@context'], 'https://schema.org', `${name}: schema context`);
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const link = match[1].split('#')[0];
    if (!link || /^(https?:|mailto:|data:)/.test(link)) continue;
    const local = link.startsWith('/') ? link.slice(1) : link;
    const path = resolve(root, local || 'index.html');
    try { assert((await stat(path)).isFile(), `${name}: missing ${link}`); }
    catch { throw new Error(`${name}: missing local link ${link}`); }
  }
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert(ids.includes(match[1]), `${name}: broken hash ${match[1]}`);
  }
}

const notFound = await read('404.html');
assert(notFound.includes('noindex,follow'), '404 must be noindex');
assert.equal((notFound.match(/<h1\b/g) || []).length, 1, '404 must have one H1');
const sitemap = await read('sitemap.xml');
for (const url of canonical) assert(sitemap.includes(`<loc>${url}</loc>`), `sitemap: missing ${url}`);
assert.equal((sitemap.match(/<loc>/g) || []).length, canonical.size, 'sitemap canonical coverage');
assert((await read('robots.txt')).includes('Sitemap: https://ildrm.com/sitemap.xml'), 'robots sitemap');
assert.equal((await read('CNAME')).trim(), 'ildrm.com', 'CNAME');

const data = JSON.parse(await read('assets/data/repositories.json'));
const featured = JSON.parse(await read('assets/data/featured-projects.json'));
const projects = await read('projects.html');
const home = await read('index.html');
assert.equal(data.username, 'ildrm', 'repository owner');
assert.equal((projects.match(/class="repo-row"/g) || []).length, data.repositories.length, 'archive count');
assert.equal((projects.match(/class="fig-card featured-card"/g) || []).length, featured.length, 'featured count');
assert.equal((home.match(/class="fig-card featured-card"/g) || []).length, 3, 'homepage featured count');
for (const item of featured) {
  const repository = data.repositories.find(repository => repository.name === item.slug);
  assert(repository && !repository.fork, `${item.slug}: featured must be original owned work`);
  assert(projects.includes(repository.url), `${item.slug}: featured link`);
}
assert(!/starred repositories|seventy-one public|13 years|fourteen years/i.test(home + projects), 'stale portfolio copy');
const image = await readFile(resolve(root, 'assets/images/social-preview.png'));
assert.equal(image.readUInt32BE(16), 1200, 'social image width');
assert.equal(image.readUInt32BE(20), 630, 'social image height');
console.log(`Site validation passed: ${names.length} canonical pages, ${data.repositories.length} repositories, ${featured.length} featured projects.`);
