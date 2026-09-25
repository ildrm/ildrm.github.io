import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = resolve(root, 'assets/data/repositories.json');
const featuredPath = resolve(root, 'assets/data/featured-projects.json');
const user = 'ildrm';
const offline = process.argv.includes('--offline');
const check = process.argv.includes('--check');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalize(repository) {
  if (!repository || repository.private || repository.owner?.login?.toLowerCase() !== user) {
    throw new Error('The GitHub response contains a repository outside the public owned account.');
  }
  if (!/^[\w.-]+$/.test(repository.name) || repository.html_url !== `https://github.com/${user}/${repository.name}`) {
    throw new Error(`Invalid GitHub repository identity: ${repository.name}`);
  }
  return {
    name: repository.name,
    url: repository.html_url,
    description: typeof repository.description === 'string' ? repository.description.trim() : '',
    language: typeof repository.language === 'string' ? repository.language : null,
    fork: Boolean(repository.fork),
    archived: Boolean(repository.archived)
  };
}

async function fetchRepositories() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ildrm.github.io-repository-build',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const repositories = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.github.com/users/${user}/repos?type=owner&per_page=100&page=${page}`;
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status} for page ${page}.`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('GitHub API returned a malformed repository list.');
    repositories.push(...batch.map(normalize));
    if (batch.length < 100) break;
    if (page === 20) throw new Error('Repository pagination limit reached.');
  }
  return repositories.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

async function writeIfChanged(path, content) {
  let previous = '';
  try { previous = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (previous.replace(/\r\n/g, '\n') === content.replace(/\r\n/g, '\n')) return false;
  if (check) throw new Error(`${path} is out of date. Run node scripts/update-repositories.mjs --offline.`);
  await writeFile(path, previous.includes('\r\n') ? content.replace(/\r?\n/g, '\r\n') : content, 'utf8');
  return true;
}

function replaceSection(html, id, section) {
  const expression = new RegExp(`^[ \\t]*<section class="[^"]*" id="${id}"[^>]*>[\\s\\S]*?<\\/section>`, 'm');
  if (!expression.test(html)) throw new Error(`Cannot locate section ${id}.`);
  return html.replace(expression, section);
}

function card(repository, selection, index) {
  return `      <article class="fig-card featured-card">
        <div class="fig-head"><span class="fig-label">FIG. ${String(index + 1).padStart(2, '0')}</span><span class="repo-origin" data-origin="mine">Original work</span></div>
        <h3>${escapeHtml(selection.label || repository.name)}</h3>
        <p>${escapeHtml(selection.summary || repository.description)}</p>
        <div class="tags">${selection.focus.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <a class="fig-link" href="${escapeHtml(repository.url)}" target="_blank" rel="noopener noreferrer">View ${escapeHtml(selection.label || repository.name)} repository</a>
      </article>`;
}

function featuredSection(repositories, selections, home) {
  const byName = new Map(repositories.map(repository => [repository.name.toLowerCase(), repository]));
  const picks = selections.map(selection => {
    const repository = byName.get(selection.slug.toLowerCase());
    if (!repository || repository.fork) throw new Error(`Featured repository is missing or is a fork: ${selection.slug}`);
    if (!Array.isArray(selection.focus) || !selection.focus.length) throw new Error(`Featured focus is missing: ${selection.slug}`);
    return { repository, selection };
  });
  const chosen = home ? picks.slice(0, 3) : picks;
  if (home) return `    <section class="sheet home-preview" id="selected-work" data-sheet="03" aria-labelledby="selected-work-title">
      <span class="clause">[0003]</span>
      <h2 id="selected-work-title">Featured software projects</h2>
      <p class="lede">A curated selection of my original open-source work, from logistics and local commerce to AI knowledge services.</p>
      <div class="fig-grid featured-grid">\n${chosen.map(({ repository, selection }, index) => card(repository, selection, index)).join('\n')}\n      </div>
      <a class="page-link" href="projects.html">Explore all projects and repositories</a>
    </section>`;

  const originalCount = repositories.filter(repository => !repository.fork).length;
  const languages = [...new Set(repositories.map(repository => repository.language || 'Not specified'))].sort((a, b) => a.localeCompare(b));
  const rows = repositories.map((repository, index) => {
    const kind = repository.fork ? 'fork' : 'original';
    const description = repository.description || 'No description provided on GitHub.';
    return `        <li class="repo-row" data-name="${escapeHtml(repository.name.toLowerCase())}" data-search="${escapeHtml(`${repository.name} ${description}`.toLowerCase())}" data-language="${escapeHtml((repository.language || 'Not specified').toLowerCase())}" data-status="${kind}">
          <span class="repo-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
          <div class="repo-text"><a class="repo-name" href="${escapeHtml(repository.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repository.name)}</a><span class="repo-summary">${escapeHtml(description)}</span></div>
          <span class="repo-language">${escapeHtml(repository.language || 'Not specified')}</span>
          <span class="repo-status" data-kind="${kind}">${repository.fork ? 'Fork' : 'Original'}${repository.archived ? ' · Archived' : ''}</span>
        </li>`;
  });
  return `    <section class="sheet" id="sheet-03" data-sheet="03" aria-labelledby="featured-title">
      <span class="clause">[0003]</span>
      <h2 id="featured-title">Featured work</h2>
      <p class="lede">Original repositories selected for their engineering scope. Each card links to source code and documentation.</p>
      <div class="fig-grid featured-grid">\n${picks.map(({ repository, selection }, index) => card(repository, selection, index)).join('\n')}\n      </div>
      <div class="repo-register">
        <div class="repo-register-head"><div><h2 id="repo-register-title">Public repository archive</h2><p class="repo-register-meta">All public repositories under my GitHub account, including forks. Data refreshes from the GitHub API.</p></div>
          <p class="repo-count-stamp">${repositories.length} public repositories<br>${originalCount} original · ${repositories.length - originalCount} forks</p></div>
        <form class="repo-controls" id="repo-controls" role="search" aria-label="Filter repositories">
          <div class="repo-control"><label for="repo-search">Search repositories</label><input id="repo-search" type="search" autocomplete="off" placeholder="Search names and descriptions"></div>
          <div class="repo-control"><label for="repo-language">Primary language</label><select id="repo-language"><option value="">All languages</option>${languages.map(language => `<option value="${escapeHtml(language.toLowerCase())}">${escapeHtml(language)}</option>`).join('')}</select></div>
          <div class="repo-control"><label for="repo-status">Repository type</label><select id="repo-status"><option value="">Originals and forks</option><option value="original">Original only</option><option value="fork">Forks only</option></select></div>
          <div class="repo-control"><label for="repo-sort">Sort by</label><select id="repo-sort"><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="language">Language</option></select></div>
          <button class="sr-only" type="submit">Apply filters</button>
        </form>
        <p class="repo-result" id="repo-result" role="status" aria-live="polite">Showing all ${repositories.length} repositories.</p>
        <p class="repo-empty" id="repo-empty" hidden>No repositories match these filters. Try a different search or reset the filters.</p>
        <div class="repo-columns" aria-hidden="true"><span>No.</span><span>Repository</span><span>Language</span><span>Type</span></div>
        <ol class="repo-list" id="repo-list">\n${rows.join('\n')}\n        </ol>
      </div>
      <p class="archive-note">Forks are copies under my account and are labeled separately from original work. <a href="contact.html">Discuss an engineering project</a>.</p>
    </section>`;
}

const repositories = offline
  ? JSON.parse(await readFile(dataPath, 'utf8')).repositories
  : await fetchRepositories();
if (!Array.isArray(repositories) || !repositories.length) throw new Error('No repositories are available to render.');
const selections = JSON.parse(await readFile(featuredPath, 'utf8'));
if (!Array.isArray(selections) || new Set(selections.map(item => item.slug)).size !== selections.length) throw new Error('Featured repository selection is invalid.');
const data = `${JSON.stringify({ username: user, repositories }, null, 2)}\n`;
await writeIfChanged(dataPath, data);
for (const [filename, home] of [['index.html', true], ['projects.html', false]]) {
  const path = resolve(root, filename);
  const html = await readFile(path, 'utf8');
  const section = featuredSection(repositories, selections, home);
  const output = replaceSection(html, home ? 'selected-work' : 'sheet-03', section);
  await writeIfChanged(path, output);
}
console.log(`Repository pages are current: ${repositories.length} public, ${repositories.filter(item => !item.fork).length} original.`);
