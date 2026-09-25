import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://ildrm.com';
const check = process.argv.includes('--check');
const image = `${origin}/assets/images/social-preview.png`;
const imageAlt = 'Shahin Ilderemi — Senior Software Engineer and Technical Lead';
const person = `${origin}/#shahin`;
const website = `${origin}/#website`;
const featured = JSON.parse(await readFile(resolve(root, 'assets/data/featured-projects.json'), 'utf8'));
const pages = [
  {
    file: 'index.html', path: '/', title: 'Shahin Ilderemi | Senior Software Engineer & Technical Lead',
    description: 'Shahin Ilderemi is a senior software engineer and technical lead working across backend architecture, full-stack systems, data engineering, and AI integration. Explore his work and experience.',
    socialDescription: 'Backend architecture, full-stack systems, data engineering, and AI integration. Explore selected projects and professional experience.',
    schema: { '@type': 'ProfilePage', '@id': `${origin}/#profile`, mainEntity: {
      '@type': 'Person', '@id': person, name: 'Shahin Ilderemi', alternateName: 'Shahin Ilderemi Lotfabad',
      jobTitle: 'Senior Software Engineer',
      description: 'Senior software engineer and technical lead working in backend architecture, full-stack systems, data engineering and AI integration.',
      url: `${origin}/`, image: `${origin}/assets/images/shahin-ilderemi.jpg`,
      sameAs: ['https://github.com/ildrm', 'https://www.linkedin.com/in/ildrm']
    } }
  },
  {
    file: 'projects.html', path: '/projects.html', title: 'Software Engineering Projects | Shahin Ilderemi',
    description: "Explore Shahin Ilderemi's original open-source projects in logistics, commerce, AI, data engineering, SEO, and WordPress, plus his public GitHub repository archive.",
    socialDescription: 'Selected original projects and a searchable archive of public GitHub repositories.',
    schema: { '@type': 'CollectionPage', about: { '@id': person } }
  },
  {
    file: 'experience.html', path: '/experience.html', title: 'Engineering Experience | Shahin Ilderemi',
    description: "Review Shahin Ilderemi's engineering experience, technical leadership, data platform work, education, and publications, from PHP and WordPress to modern full-stack systems.",
    socialDescription: 'Engineering roles, technical leadership, education, and publications.',
    schema: { '@type': 'AboutPage', about: { '@id': person } }
  },
  {
    file: 'contact.html', path: '/contact.html', title: 'Contact Shahin Ilderemi | Software Engineering',
    description: 'Contact Shahin Ilderemi about software engineering, architecture, full-stack development, data systems, AI integration, or open-source collaboration.',
    socialDescription: 'Get in touch about engineering work and open-source collaboration.',
    schema: { '@type': 'ContactPage', about: { '@id': person } }
  }
];

function escape(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function head(page) {
  const url = `${origin}${page.path}`;
  const schema = {
    '@context': 'https://schema.org', ...page.schema, '@id': page.path === '/' ? `${url}#profile` : `${url}#page`, url, name: page.title,
    isPartOf: page.path === '/' ? { '@type': 'WebSite', '@id': website, url: `${origin}/`, name: 'Shahin Ilderemi' } : { '@id': website }
  };
  if (page.path !== '/') {
    const label = page.path.slice(1).replace('.html', '');
    schema.breadcrumb = { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: label[0].toUpperCase() + label.slice(1), item: url }
    ] };
  }
  if (page.path === '/projects.html') {
    schema.mainEntity = { '@type': 'ItemList', itemListElement: featured.map((project, index) => ({
      '@type': 'ListItem', position: index + 1, name: project.label,
      url: `https://github.com/ildrm/${project.slug}`
    })) };
  }
  return `<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escape(page.title)}</title>
  <meta name="description" content="${escape(page.description)}" />
  <meta name="robots" content="index,follow" />
  <meta name="theme-color" content="#030609" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="${page.path === '/' ? 'profile' : 'website'}" />
  <meta property="og:site_name" content="Shahin Ilderemi" />
  <meta property="og:title" content="${escape(page.title)}" />
  <meta property="og:description" content="${escape(page.socialDescription)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escape(imageAlt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escape(page.title)}" />
  <meta name="twitter:description" content="${escape(page.socialDescription)}" />
  <meta name="twitter:image" content="${image}" />
  <meta name="twitter:image:alt" content="${escape(imageAlt)}" />
  <link rel="icon" type="image/svg+xml" href="assets/images/favicon.svg" />
  <link rel="apple-touch-icon" href="assets/images/apple-touch-icon.png" />
  <link rel="manifest" href="site.webmanifest" />
  <link rel="preload" href="assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="assets/css/base.css" />
  <link rel="stylesheet" href="assets/css/components.css" />
  <link rel="stylesheet" href="assets/css/pages.css" />
  <script defer src="assets/js/site.js"></script>
  <script defer src="assets/js/visual-loader.js"></script>
  ${page.path === '/projects.html' ? '<script defer src="assets/js/projects.js"></script>\n  ' : ''}<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>`.replace(/ \/>/g, '>');
}

function mobileNavigation(page) {
  const links = [
    ['Home', '/'], ['Projects', 'projects.html'],
    ['Experience', 'experience.html'], ['Contact', 'contact.html']
  ];
  return `<details class="mobile-nav"><summary>Menu</summary><div class="mobile-nav-links">${links.map(([label, href]) =>
    `<a href="${href}"${(href === '/' ? page.file === 'index.html' : page.file === href) ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('')}</div></details>`;
}

for (const page of pages) {
  const path = resolve(root, page.file);
  const html = await readFile(path, 'utf8');
  let output = html.replace(/<head>[\s\S]*?<\/head>/, head(page));
  output = output.replace(/<label class="sr-only" for="page-select">[\s\S]*?<\/select>/, mobileNavigation(page));
  output = output.replace('SIL / ORBITAL</a>', 'SI / SHAHIN ILDEREMI</a>');
  output = output.replaceAll('href="index.html"', 'href="/"');
  output = output.replace(/class="hud-telemetry" id="telemetry"(?! aria-hidden=)/g, 'class="hud-telemetry" id="telemetry" aria-hidden="true"');
  output = output.replaceAll('END OF TRANSMISSION · SIL / SPATIAL SYSTEMS OBSERVATORY · 2026', 'END OF TRANSMISSION · SHAHIN ILDEREMI / SPATIAL SYSTEMS OBSERVATORY');
  if (page.file === 'projects.html') output = output.replace(/\s*<script defer src="assets\/js\/projects\.js"><\/script>\s*<\/body>/, '\n</body>');
  if (output === html && !html.includes(`<title>${escape(page.title)}</title>`)) throw new Error(`Head replacement failed: ${page.file}`);
  if (output !== html) {
    if (check) throw new Error(`${page.file} metadata is out of date.`);
    await writeFile(path, output, 'utf8');
  }
}
console.log('Page metadata is current.');
