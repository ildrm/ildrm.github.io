# Search intent and content map

| Canonical page | Primary intent | Supporting topics | Visible evidence |
| --- | --- | --- | --- |
| `/` | Shahin Ilderemi; senior software engineer and technical lead | Backend architecture, full-stack systems, data engineering, AI integration | Identity, concise professional summary, expertise, original featured work |
| `/projects.html` | Shahin Ilderemi software engineering projects | Open source, logistics, commerce, RAG, Apache Doris, WordPress, SEO tooling | Curated original work and complete owned-account archive with forks labeled |
| `/experience.html` | Shahin Ilderemi engineering experience | Technical leadership, PHP, WordPress, Laravel, data infrastructure, education, publications | Dated roles, responsibilities, tools, education, listed publication titles |
| `/contact.html` | Contact Shahin Ilderemi | Software engineering collaboration | Email, GitHub, and LinkedIn actions |

The homepage targets identity and positioning. Projects and Experience provide separate proof of work and career history. Contact provides an action path. Copy uses natural language rather than repeating a keyword list.

## Content provenance and maintenance

- Repository names, URLs, descriptions, languages, fork status, and archive totals come from the GitHub public user API. The daily workflow renders them into HTML.
- The archive filters by text, primary language, and original/fork status. Repository topics are inconsistent across the account, so no automated category labels are inferred from names.
- Featured order and summaries are editorial choices in `assets/data/featured-projects.json`. Every configured slug must resolve to a public, original repository in the snapshot.
- Career dates, employer names, education, and publication titles are preserved from the existing site. The available material did not provide public publication URLs, so titles remain unlinked.
- The public professional name is Shahin Ilderemi; the longer form appears in the visible dossier and as a structured-data alternate name.
- Search Console verification and real-user Core Web Vitals require owner access after deployment. Lab Lighthouse results are recorded separately and are not field INP measurements.
