/* eslint-disable */
/* global WebImporter */
/**
 * Parser for article-list (custom dynamic block).
 *
 * The source listings are rendered client-side from AEM JSON servlets / tag-filtered tiles, so
 * the rendered results are NOT content: the whole listing container is replaced by an
 * article-list config table and EDS renders the results from the query index at runtime.
 *
 * Source components:
 *   .newsarticles.list   <newsArticlesDynamic>  (media-releases: latest-news, category/year/sort, 12/page)
 *   .latestnews.list     <latestNewsDynamic>    (news-archive: year/sort, 12/page; type filter disabled)
 *   .cmp-container:has(> .filtertag)           (our-stories: tag chips, 9; 100 Years: preset "100 Years", 3)
 *
 * structure.json flags invalid <a><button> nesting inside the result cards. This parser never
 * iterates result cards or buttons (they are discarded), so row pairing is not affected. The only
 * per-item read is data-filter-value on tiles, used to detect a preset tag shared by every tile.
 *
 * Block table (key/value): Source | Filters | Tags | Limit | Layout | Categories | Featured
 *   Categories: source chip labels in authored order (excluding "All"), comma separated.
 *   Featured:   stories listing only (no preset tag) - the source's curated first-page tile
 *               order as migrated paths (first `Limit` tiles), comma separated.
 */
const NEWS_ROOT = '/au/en/our-newsroom/media-releases/';
const STORIES_ROOT = '/au/en/our-impact/sustainability/our-stories/';

function isNewsListing(element) {
  return element.matches('.newsarticles, .newsarticles *')
    || !!element.querySelector('newsarticlesdynamic, .news-articles-container');
}

function isArchiveListing(element) {
  return element.matches('.latestnews, .latestnews *')
    || !!element.querySelector('latestnewsdynamic, [data-component="latestNewsDynamic"], .latest-news-container');
}

const clean = (t) => (t || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

// Source chip labels in authored order, excluding the "All" chip.
function chipOrder(element, allLabel) {
  const chips = [...element.querySelectorAll('button.news-articles-tag, button.filter-by-tag, .cmp-filtertag button')];
  const labels = chips
    .filter((b) => !/^all$/i.test(b.getAttribute('data-filter-value') || ''))
    .map((b) => clean(b.textContent))
    .filter((t) => t && !/^all( stories)?$/i.test(t) && t !== allLabel);
  return [...new Set(labels)].join(', ');
}

// Source page path -> migrated EDS path (no .html, sanitised like the import document paths).
function edsPath(href) {
  if (!href) return '';
  let path;
  try {
    path = new URL(href, 'https://www.woolworthsgroup.com.au').pathname;
  } catch (e) {
    return '';
  }
  path = path.replace(/^\/content\/wwg(?=\/au\/)/, '').replace(/\.html?$/i, '');
  if (!path.startsWith('/au/en/')) return '';
  return WebImporter.FileUtils.sanitizePath(path);
}

// Curated story tiles (first page, in source order) -> Featured paths.
function featuredPaths(element, limit) {
  const tiles = [...element.querySelectorAll('.contenttile.teaser')];
  const paths = [];
  tiles.forEach((tile) => {
    const a = tile.querySelector('a.cmp-teaser__content__link--card[href], a[href]');
    let href = a ? a.getAttribute('href') : '';
    if (!href) {
      const layer = tile.querySelector('[data-cmp-data-layer]');
      const m = layer && (layer.getAttribute('data-cmp-data-layer') || '').match(/"xdm:linkURL"\s*:\s*"([^"]+)"/);
      href = m ? m[1] : '';
    }
    const path = edsPath(href);
    if (path && !paths.includes(path)) paths.push(path);
  });
  return paths.slice(0, limit).join(', ');
}

function storyConfig(element) {
  const filter = element.querySelector('[data-component="filterTag"], filtertag');
  const count = filter && (filter.getAttribute('data-numberOfCards') || filter.getAttribute('data-numberofcards'));
  const allLabel = (filter && filter.getAttribute('data-allTextLabel')) || 'All Stories';
  // A preset tag applies when every tile shares exactly one tag (e.g. 100 Years of WWG)
  const tileTags = [...element.querySelectorAll('.contenttile [data-filter-value], .contenttile[data-filter-value]')]
    .map((n) => n.getAttribute('data-filter-value'))
    .filter((v) => v && v !== allLabel)
    .map((v) => v.split(',').map((t) => t.trim()).filter(Boolean));
  let preset = '';
  if (tileTags.length) {
    const common = tileTags.reduce((acc, tags) => acc.filter((t) => tags.includes(t)));
    if (common.length === 1) [preset] = common;
  }
  const limit = count && /^\d+$/.test(count) ? count : '9';
  return {
    Source: STORIES_ROOT,
    Filters: 'tags',
    Tags: preset,
    Limit: limit,
    Layout: 'stories',
    Categories: chipOrder(element, allLabel),
    // Stories listing (no preset tag): keep the source's curated first-page tile order.
    Featured: preset ? '' : featuredPaths(element, Number(limit)),
  };
}

function configFor(element) {
  if (isNewsListing(element)) {
    return {
      Source: `${NEWS_ROOT}latest-news/`,
      Filters: 'category, year, sort',
      Limit: '12',
      Layout: 'news',
      Categories: chipOrder(element, 'All'),
    };
  }
  if (isArchiveListing(element)) {
    return {
      Source: `${NEWS_ROOT}news-archive/`, Filters: 'year, sort', Limit: '12', Layout: 'news',
    };
  }
  return storyConfig(element);
}

export default function parse(element, { document }) {
  const config = configFor(element);

  // Headings authored inside the listing container (e.g. "News and stories" on 100 Years of WWG)
  // are real content: keep them as default content before the block.
  const leading = [...element.querySelectorAll('.heading h1, .heading h2, .heading h3, .cmp-title h2, .cmp-title h3')]
    .filter((h) => !h.closest('.contenttile, .news-articles-container, .latest-news-container'))
    .map((h) => {
      const out = document.createElement(h.tagName.toLowerCase());
      out.textContent = h.textContent.trim();
      return out;
    })
    .filter((h) => h.textContent);

  const cells = Object.entries(config)
    .filter(([, v]) => v)
    .map(([k, v]) => [k, v]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'article-list', cells });
  element.replaceWith(...leading, block);
}
