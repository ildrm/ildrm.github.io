import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const username = 'ildrm';
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(repositoryRoot, 'assets/data/starred-repositories.json');
const inputPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : null;

function selectPublicFields(repository) {
  return {
    name: repository.name,
    full_name: repository.full_name,
    html_url: repository.html_url,
    description: repository.description,
    fork: Boolean(repository.fork),
    owner: {
      login: repository.owner && repository.owner.login ? repository.owner.login : ''
    },
    language: repository.language,
    stargazers_count: repository.stargazers_count
  };
}

function validateRepositories(repositories) {
  if (!Array.isArray(repositories)) {
    throw new Error('GitHub returned an unexpected response.');
  }
  return repositories.map(selectPublicFields);
}

async function fetchStarredRepositories() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ildrm.github.io-starred-repository-snapshot',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repositories = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=100&page=${page}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch)) {
      throw new Error('GitHub API returned an unexpected response.');
    }

    repositories.push(...batch);
    if (batch.length < 100) break;
  }

  return validateRepositories(repositories);
}

async function readInputSnapshot() {
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  return validateRepositories(Array.isArray(input) ? input : input.repositories);
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await readFile(outputPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

const repositories = inputPath
  ? await readInputSnapshot()
  : await fetchStarredRepositories();
const existing = await readExistingSnapshot();

if (existing && JSON.stringify(existing.repositories) === JSON.stringify(repositories)) {
  console.log(`Snapshot is current (${repositories.length} repositories).`);
  process.exit(0);
}

const snapshot = {
  username,
  generated_at: new Date().toISOString(),
  repositories
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`Updated snapshot with ${repositories.length} repositories.`);
