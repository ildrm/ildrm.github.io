# Optimized implementation brief

Audit and improve the static GitHub Pages portfolio at `https://ildrm.com` in this repository. Prioritize technical SEO and a clear, accessible experience for hiring managers, engineering leaders, collaborators, and mobile visitors. Preserve the orbital visual identity where it helps comprehension. Keep the production site as static HTML, CSS, and vanilla JavaScript.

## Work sequence

1. Inspect every page, stylesheet, script, data file, workflow, image, `CNAME`, and the deployed site. Establish the current content, data, SEO, accessibility, and performance baseline before editing.
2. Correct factual inconsistencies without inventing claims. Use the professional name **Shahin Ilderemi**, retaining the longer name where useful. Describe experience as professional work since 2012 rather than a manually maintained year count.
3. Replace the starred-repository portfolio model with a single normalized snapshot of Shahin's public GitHub repositories. Curate and order original featured work in a small configuration file. Generate featured cards, the complete archive, and repository totals into HTML so they remain useful without JavaScript. Label forks accurately. Refresh at most daily and commit only meaningful changes.
4. Give each indexable page a unique purpose, title, description, canonical URL, social metadata, one clear H1, semantic structure, and valid JSON-LD based on visible facts. Add a crawlable sitemap, robots file, social image, icons, and an accessible `noindex` 404 page. Keep existing `.html` URLs and the `CNAME`.
5. Improve first-viewport identity and actions, navigation without JavaScript, readable typography, project explanations, experience dates, contact actions, responsive layouts, and reduced-motion behavior. Keep motion decorative and delay expensive visuals until after essential content.
6. Verify generated data, page metadata, structured data, links, HTML, keyboard paths, no-JavaScript content, responsive layouts, browser errors, and performance on a local HTTP server. Fix reproducible failures and review the final diff.

## Completion criteria

- All four canonical pages contain their main content in HTML; featured work consists only of owned, non-fork repositories.
- Repository archive and counts derive from one dataset and can be regenerated deterministically.
- Metadata, robots, sitemap, structured data, 404, social image, and icons validate.
- Navigation and contact paths work at 320px and without JavaScript; project filters work with JavaScript.
- Motion respects reduced-motion and user pause; WebGL failure leaves a usable static site.
- No critical accessibility violations, broken internal links, unexplained console errors, or accidental `CNAME` changes remain.
- Report exact tests and measured outcomes; distinguish field Core Web Vitals from lab estimates. List only truly external follow-up actions, such as Search Console ownership verification.
