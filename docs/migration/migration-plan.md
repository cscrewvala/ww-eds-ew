# Migration Plan: Woolworths Group (woolworthsgroup.com.au)

**Mode:** URL List (site-wide, sampled)
**Source:** 747 URLs in sitemap → 210 URLs sampled (max 20 per article/profile type, all general pages)
**Generated:** 2026-10-14

## Scope rules (from user)
- Max 20 pages/articles per template type (newest first for dated article types).
- Dynamic listing components must become custom, query-index driven EDS blocks — never static cards.
- Preserve source information architecture: `/au/en/...` path hierarchy is kept (e.g.
  `/au/en/our-newsroom/media-releases/latest-news/2026/<slug>`).

## Dynamic listing components identified (source analysis)
| Source component | Page | Data source | Filters | EDS block |
|---|---|---|---|---|
| `newsArticlesDynamic` (`.news-articles-container`) | /au/en/our-newsroom/media-releases | AEM JSON `…/newsarticles_copy.media.json` (376 items, 12/page) | category tag (wwg:newsroom/*), year, sort asc/desc, pagination | `article-list` (query-index, path `/…/latest-news/`) |
| `latestNewsDynamic` | /au/en/our-newsroom/media-releases/news-archive | AEM JSON `…/latestnews.media.json` (112 items, 12/page) | year (2018/2019), sort, pagination (type filter disabled) | `article-list` (query-index, path `/…/news-archive/`) |
| `filterTag` + 69 `contentTile` teasers | /au/en/our-impact/sustainability/our-stories | tiles of story articles carrying `data-filter-value` tags | tag buttons (People, 100 Years, Sustainability, Reconciliation, Planet, Australian Community), 9 per page | `article-list` (query-index, path `/…/our-stories/`, tag filter) |

Static (curated) tiles — e.g. homepage/newsroom `contentTile` promos, ASX `linkList`s — remain authored content (cards etc.).

## URL groups (sitemap)
- latest-news articles: 375 → 20 | news-archive articles: 112 → 20 | our-stories: 91 → 20 | check-it-out: 14 → 14
- leadership profiles: 30 → 20 | general pages (who-we-are, investors, careers, privacy, our-impact, newsroom, contact, …): ~115

Also dynamic: `filterTag` + tiles on /au/en/who-we-are/100-years-of-wwg (tag "100 Years", 3 per page) → `article-list`.
Static (confirmed): leadership-profile cards on board/management pages, `ecosystem` brand/social logo grids, investor `linkList`s.

## Templates (logical; visual clustering kept at migration-work/page-templates.visual-clusters.json)
Visual clustering mixed article types with general pages, so templates were rebuilt from the source AEM
`<meta name="template">` + URL hierarchy:

| Template | Pages | Notes |
|---|---|---|
| news-article | 54 | 20 latest-news, 20 news-archive, 14 check-it-out (newest first) |
| story-article | 20 | newest 20 shown in the Our Stories listing |
| listing-page | 4 | media-releases, news-archive, our-stories, 100-years-of-wwg (dynamic `article-list`) |
| homepage | 1 | source /au/en.html 301 → / ; imported as /index |
| content-page | 20 | top-level + section landing pages |
| investor-page | 15 | all investor pages |
| legal-page | 16 | privacy / policy / statements |
| leadership-profile | 20 | board + management profiles |

28 sampled URLs are redirects (careers → external job sites etc.) → migration-work/redirects.tsv (for the EDS redirects sheet).
Article date/image/tags lookup (from source listing feeds + story tiles): migration-work/article-metadata.json.

## IA
Source paths are kept 1:1 minus `.html` (e.g. /au/en/our-newsroom/media-releases/latest-news/2026/<slug>); homepage → /.

## Steps
- [x] 1. Project Setup (type: da)
- [x] 2. Identify Page Templates (8 templates, 150 pages)
- [x] 3. Page Analysis (8 templates)
- [x] 3.5 Block Library Generation (incl. dynamic `article-list` block + query-index config)
- [x] 4. Block Mapping
- [x] 5. Import Infrastructure
- [x] 6. URL Classification and Content Import (150/150 pages)

## Artifacts
- migration-work/classify-urls.txt

## Progress log
- news-article: analysis ✓ (hero-article + default content) · block hero-article ✓ · mapping ✓ · infra ✓ (cleanup, sections, dm-images, article-metadata) · import 54/54 ✓
  - Scene7: DM auto-block + DM-aware `createOptimizedPicture` wrapper installed in scripts/scripts.js (aem.js is vendored — not patched); blocks import createOptimizedPicture from scripts.js
  - Low completeness scores (38–64%) are false positives (source duplicates body text inside data-cmp-data-layer JSON); content verified complete
  - news-archive items have no category tags at source (type filter disabled); check-it-out pages have no published date at source
- story-article: analysis ✓ · blocks hero-story, video-story, quote-story, cards-story ✓ (related tiles confirmed STATIC: hand-placed teasers) · mapping ✓ · import 20/20 ✓
  - stories carry no published date at source (2/20 have a date in hero subtitle); listing sort falls back to year-in-path + lastModified
- listing-page: analysis ✓ · DYNAMIC block `article-list` (hand-built; query-index driven; config: Source/Filters/Tags/Limit/Layout) on all 4 listing pages · new static blocks hero-banner, hero-brand, cards-featured · import 4/4 ✓
  - article-list verified in preview against a mock index built from the imported articles: category chips, year/sort selects, numbered pagination (news), Load More (stories), preset tag (100 Years), URL state
  - index config to apply at tools.aem.live: migration-work/query-index-config.yaml (target /au/en/article-index.json)
  - 100 Years logo (inline SVG at source) shipped as icons/wwg-100-years.svg, authored as :wwg-100-years:
- Site-wide: internal links rewritten to EDS paths (no .html, /au/en → /); DAM assets kept absolute on source host
- homepage: analysis ✓ (Latest news tiles verified STATIC: hand-authored teasers, no endpoint) · reused hero-banner, cards-featured · new cards-tile · import 1/1 ✓ (→ /index)
- content-page: analysis ✓ (all tile groups STATIC) · 12 new blocks (cards-stats, accordion-program, columns-logos/-spotlight/-contact/-text/-panel/-gallery, cards-logo/-timeline/-documents/-profile) · import 20/20 ✓ · DEFERRED: Salesforce Web-to-Lead form on partner-with-us (form block vs embed decision); our-brands brand descriptions (pop-up only) not captured
- investor-page: analysis ✓ (ASX/results/AGM lists STATIC authored PDFs; Euroland share widgets = third-party iframes → embed-iframe) · new cards-video, embed-iframe, table-data, modal-terms, cards-calendar · import 15/15 ✓ (415/415 ASX PDFs)
- legal-page: analysis ✓ (STATIC) · new cards-resource, columns-media · Inbenta privacy enquiry form = iframe → embed-iframe · import 16/16 ✓
- leadership-profile: analysis ✓ (default content only, no blocks) · resampled to 20 CURRENT leaders linked from the listings (7 former leaders in the first sample were orphan pages) · metadata Description from page body (source meta description is stale) · import 20/20 ✓
- Sections transformer: drops section breaks that would open an empty section

## Validation (final)
- 150/150 imported; scorer flags 56 (<90%), all explained after a chrome-aware word-coverage recheck (migration-work/importer/recheck.json):
  dynamic listings (results now rendered by article-list), Euroland iframes, deferred Salesforce form, hidden profile banner text,
  data-layer JSON duplication in source. Only residual gap: podcast pop-up description on one story (rural-aid).

## Open items / next steps
- Apply query index config (migration-work/query-index-config.yaml) at tools.aem.live so article-list has data after publish
- Redirects sheet: migration-work/redirects.tsv (28 rows); old *.html URLs need a CDN rule (strip .html) at go-live
- Partner-with-us Salesforce Web-to-Lead form (deferred; source says requests paused)
- Header/nav + footer not migrated yet (boilerplate nav/footer in place)
- Design migration (blocks are layout-only CSS)
- Register new blocks in the DA Library (block-library-creator)

## Design migration (2026-10-14)
- Phase 1: brand.css (Montserrat body; Plus Jakarta Sans substitutes licensed TomatoGrotesk headings; ocean #1971ED palette), buttons, section styles (ocean, snow, tint-sky-5/10/20, tint-ocean-10, centered)
- scripts.js: section-metadata fallback (no-op when pipeline already applied it); Scene7 renditions use fit=constrain
- Phase 2: 29 blocks styled from source computed styles, visual match ~88–99% each
- Phase 3: full-page main-content similarity — home ~87%, media releases ~85%, recycle-and-save ~78%, privacy ~73%, climate-and-nature ~62% (before final global button/heading/intro fixes)
- Import refinements: CTA components → EDS buttons, heading levels follow source visual classes, one h1 per page
- Not yet migrated: header/nav (incl. investor/sustainability side navs), footer, wave/leaf section dividers

## Header, footer, side navigation (2026-10-15)
- Header: 6 hover megamenus (intro + up to 4 link columns), search (→ /au/en/search, not yet migrated), utility strip (Share price link, Investor info); mobile hamburger with split-link + slide-in sub-panels. Panel layout/text/screenshot parity checks could not locate the source's panel containers (tooling limitation; content verified separately).
- Footer: brand/about, addresses, link columns, Acknowledgement of Country (verbatim); desktop + mobile heights match source. Final gate blocked only by hidden-icon image count (5 vs 1 visible).
- Side nav: blocks/side-nav (vertical for /au/en/investors/*, horizontal sticky for /au/en/our-impact/sustainability/*), auto-blocked from scripts.js, content imported as fragments /au/en/investors/nav-section and /au/en/our-impact/sustainability/nav-section. Investor side nav hidden below 1200px (source hides it on small screens).
