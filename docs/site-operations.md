# Site operations

The canonical site is `https://ildrm.com`. GitHub Pages deploys the static files in the repository root; `CNAME` must stay intact.

## Repository content

`assets/data/repositories.json` is the normalized public GitHub repository snapshot. `assets/data/featured-projects.json` sets the order and portfolio-specific summaries of original featured work. Edit the latter to curate projects, then run:

```sh
node scripts/update-repositories.mjs --offline
```

Run without `--offline` to fetch all public repositories from `https://api.github.com/users/ildrm/repos`. The script rewrites the homepage featured section and the projects page from the same dataset. It excludes volatile star counts and timestamps so the daily workflow commits only content changes. The workflow is also available through manual dispatch.

The local font files in `assets/fonts` are distributed under their accompanying SIL Open Font License texts. Their source is Google Fonts. The social preview SVG is the editable source for its PNG counterpart.

## Checks

```sh
node scripts/update-repositories.mjs --offline --check
node scripts/build-heads.mjs --check
node scripts/validate-site.mjs
node scripts/serve.mjs
npm run test:html
npm run test:browser
npm run audit:mobile
```

`build-heads.mjs` maintains shared page metadata. It updates the four primary pages in place. Use a local HTTP address for browser testing.

## Search Console

Add a Domain property for `ildrm.com`, verify ownership using Google's provided DNS record, then submit `https://ildrm.com/sitemap.xml`. After deployment, inspect the homepage and all three subpage URLs for canonical selection and indexing. Monitor Search Console Core Web Vitals with field data; local Lighthouse metrics are lab estimates. No verification token is included until one is supplied by the site owner.
