/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: woolworthsgroup.com.au page metadata (Metadata block).
 *
 * Builds / augments the Metadata block with:
 *   Title, Description, Image, Template            (every page)
 *   Date (yyyy-mm-dd), Tags, Listing                (article pages only)
 * Article pages: path matches /(latest-news|news-archive|check-it-out|our-stories)/<yyyy>/
 * These fields feed query-index driven listing blocks.
 *
 * Sources (in priority order):
 *   Title       article: hero heading -> og:title -> <title>; other: <title> -> og:title -> h1
 *   Description meta description / og:description -> first non-empty body paragraph
 *               (dateline prefix stripped), trimmed to ~160 chars
 *   Image       hero image (img.cmp-image__image in the hero banner) -> lookup image -> og:image
 *   Template    payload.template.name -> params.template -> inferred from path
 *   Date        lookup date -> "D Month YYYY" in bold dateline -> dateline "D Month" + URL year
 *               -> "D Month YYYY" in body text
 *   Tags        lookup tags -> <meta name="keywords">
 *   Listing     derived from URL path segment
 *
 * Lookup: ./article-metadata-data.js (generated; keyed by source path without .html).
 *
 * Selectors (verified in migration-work/cleaned.html):
 *   herobannercarousel / section.hero-banner-carousel, img.cmp-image__image,
 *   .hero-banner-carousel__slider__items__banner__text h2, p.banner--category,
 *   .media-template-body .cmp-text > p (bold dateline in first <b>)
 *
 * Hooks:
 *   beforeTransform - extract values while source DOM (hero, body) is intact
 *   afterTransform  - write/merge the Metadata block at the end of the element.
 *     Because the standard import script later calls WebImporter.rules.createMetadata()
 *     (which always appends a new block), this transformer wraps that rule once so it
 *     merges any extra keys into the existing block and moves it to the end
 *     instead of creating a duplicate Metadata block.
 */
import ARTICLE_METADATA from './article-metadata-data.js';

const H = { before: 'beforeTransform', after: 'afterTransform' };

const ARTICLE_PATH_RE = /\/(latest-news|news-archive|check-it-out|our-stories)\/(\d{4})\//i;
const DESCRIPTION_MAX = 160;
// Read-time / media-duration labels shown under story titles; never a description.
const DURATION_LABEL_RE = /^[\d:.]+\s*(?:(?:min(?:ute)?s?|secs?|seconds?|hrs?|hours?)\.?\s*)?(?:read|video|watch|listen|view|podcast|audio)(?:ing)?(?:\s*time)?\.?$/i;

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
const MONTH_ALT = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const DATE_FULL_RE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\.?,?\\s+(\\d{4})\\b`, 'i');
const DATE_NO_YEAR_RE = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_ALT})\\b`, 'i');

// Per-page extraction cache (beforeTransform -> afterTransform).
const STASH = new WeakMap();

// Case-insensitive fallback index for the lookup (source paths have mixed case).
let LOOKUP_LC = null;
function lookupArticle(path) {
  if (!path) return null;
  if (ARTICLE_METADATA[path]) return ARTICLE_METADATA[path];
  if (!LOOKUP_LC) {
    LOOKUP_LC = {};
    Object.keys(ARTICLE_METADATA).forEach((k) => { LOOKUP_LC[k.toLowerCase()] = ARTICLE_METADATA[k]; });
  }
  return LOOKUP_LC[path.toLowerCase()] || null;
}

function clean(text) {
  return (text || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

// ---- Image alt sanitising ----
// Source authors sometimes reuse an image whose alt names a different story (e.g. the
// fighting-food-insecurity banner alt "Meet the team: Johnson Chen", the ozharvest hero alt
// "Woolworths Group 25 year club"), and story tiles carry the placeholder alt "WWG".
// Such alts are wrong, so the image becomes decorative (empty alt) - unless the image sits in a
// tile / card / link that points to the story its alt names (a related-story tile).
// Runs in beforeTransform on the source DOM, so parsers copy the corrected alt (by
// afterTransform the DM images transformer has already turned images into links).
const PLACEHOLDER_ALT_RE = /^wwg$/i;
const TILE_SCOPE = '.contenttile, contenttile, .cmp-teaser, .mastercard, .card, .wwgvideo, .cmp-video, a[href], tr';
let ARTICLE_SLUGS = null;
function slugify(text) {
  return clean(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function articleSlugs() {
  if (!ARTICLE_SLUGS) {
    ARTICLE_SLUGS = new Set(Object.keys(ARTICLE_METADATA).map((k) => k.split('/').pop().toLowerCase()));
  }
  return ARTICLE_SLUGS;
}
// true when the scope (tile / card / link) points to `slug`, or to a page whose slug contains
// the alt's own slug `altSlug` (podcast tile alt "clontarf foundation" linking to the
// podcast page "the-clontarf-foundation")
function linksToSlug(scope, slug, altSlug) {
  if (!scope) return false;
  const links = [...scope.querySelectorAll('a[href], [data-href]')];
  if (scope.matches('a[href], [data-href]')) links.unshift(scope);
  return links.some((el) => {
    const href = el.getAttribute('href') || el.getAttribute('data-href') || '';
    const last = href.split(/[?#]/)[0].replace(/\.html?$/i, '').replace(/\/$/, '').split('/').pop().toLowerCase();
    return last === slug || (!!altSlug && last.includes(altSlug));
  });
}
function sanitizeAlt(alt, img, pagePath) {
  const a = clean(alt);
  if (!a) return alt || '';
  if (PLACEHOLDER_ALT_RE.test(a)) return '';
  const s = slugify(a);
  const own = (pagePath || '').split('/').pop().toLowerCase();
  if (!s || s === own || own.startsWith(`${s}-`)) return alt;
  // the alt is another story's slug, or (2+ words) the leading words of exactly one other
  // story's slug (fighting-food-waste hero alt "ardrossan orchards")
  let target = articleSlugs().has(s) ? s : '';
  if (!target && s.includes('-')) {
    const hits = [...articleSlugs()].filter((k) => k.startsWith(`${s}-`));
    if (hits.length === 1) [target] = hits;
  }
  if (!target || target === own) return alt;
  // keep it inside a tile that links to that story or whose own title is the alt
  // (video tile "Celebrating the dedication..." linking to an mp4)
  const tile = img ? img.closest(TILE_SCOPE) : null;
  if (tile && (linksToSlug(tile, target, s) || slugify(tile.textContent).includes(s))) return alt;
  return '';
}
function sanitizeImageAlts(root, pagePath) {
  root.querySelectorAll('img[alt]').forEach((img) => {
    const alt = img.getAttribute('alt');
    const next = sanitizeAlt(alt, img, pagePath);
    if (next !== alt) img.setAttribute('alt', next);
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toIso(day, monthName, year) {
  const m = MONTHS[String(monthName).toLowerCase().replace(/\.$/, '')];
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (!m || !d || d > 31 || !y) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseFullDate(text) {
  const m = clean(text).match(DATE_FULL_RE);
  return m ? toIso(m[1], m[2], m[3]) : '';
}

function getSourcePath(payload, doc) {
  const params = (payload && payload.params) || {};
  const canonical = doc && doc.querySelector('link[rel="canonical"]');
  const ogUrl = doc && doc.querySelector('meta[property="og:url"]');
  const loc = doc && doc.location && /^https?:/i.test(doc.location.href) ? doc.location.href : '';
  const candidates = [
    params.originalURL,
    payload && payload.url,
    canonical && canonical.getAttribute('href'),
    ogUrl && ogUrl.getAttribute('content'),
    loc,
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      let p = new URL(c, 'https://www.woolworthsgroup.com.au').pathname;
      try { p = decodeURIComponent(p); } catch (e) { /* keep raw */ }
      p = p.replace(/\/$/, '').replace(/\.html?$/i, '');
      if (p) return p;
    } catch (e) { /* try next */ }
  }
  return '';
}

function inferTemplate(path) {
  if (/\/our-stories\/\d{4}\//i.test(path)) return 'story-article';
  if (/\/media-releases\/(latest-news|news-archive|check-it-out)\/\d{4}\//i.test(path)) return 'news-article';
  return '';
}

function getHeadMeta(doc, name) {
  const el = doc.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return el ? clean(el.getAttribute('content')) : '';
}

// Body text containers, excluding global chrome (ticker, header, footer, side nav).
function getBodyTextBlocks(root) {
  const scoped = root.querySelectorAll('.media-template-body .cmp-text');
  const list = scoped.length ? [...scoped] : [...root.querySelectorAll('.cmp-text')];
  return list.filter((el) => !el.closest('header, footer, .cmp-experiencefragment, sidenavigation, sharepriceticker, .stockprice'));
}

function getBodyParagraphs(root) {
  const paras = [];
  getBodyTextBlocks(root).forEach((block) => {
    block.querySelectorAll('p').forEach((p) => {
      if (clean(p.textContent)) paras.push(p);
    });
  });
  return paras;
}

function getHero(root) {
  return root.querySelector('herobannercarousel, section.hero-banner-carousel, .heroBanner');
}

// Bold dateline, e.g. <p><b>Tuesday, 13 October: </b>Over 35,000...</p>
function getDateline(paras) {
  const first = paras[0];
  if (!first) return '';
  const bold = first.querySelector('b, strong');
  if (!bold) return '';
  const txt = clean(bold.textContent);
  return DATE_NO_YEAR_RE.test(txt) ? txt : '';
}

function stripDateline(text, dateline) {
  let t = clean(text);
  if (dateline && t.startsWith(dateline)) t = t.slice(dateline.length).trim();
  return t.replace(/^[:\-–—\s]+/, '');
}

function trimDescription(text) {
  const t = clean(text);
  if (t.length <= DESCRIPTION_MAX) return t;
  const cut = t.slice(0, DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

// Encode a URL exactly once: lookup / DOM values are a mix of raw ("Soft Plastics_x") and
// already-encoded ("OZ%20HARVEST", "Dan%20Hake%3AAspect-Ratio") paths. Collapse earlier double
// encoding (%2520 -> %20), keep existing valid %XX escapes as they are, and encodeURI only the
// text between them (a decodeURI/encodeURI round trip would turn %3A into %253A).
function collapseDoubleEncoding(src) {
  let s = String(src || '');
  while (/%25[0-9a-f]{2}/i.test(s)) s = s.replace(/%25([0-9a-f]{2})/gi, '%$1');
  return s;
}

function encodeOnce(src) {
  return collapseDoubleEncoding(src).split(/(%[0-9a-f]{2})/i).map((part, i) => {
    if (i % 2) return part;
    try { return encodeURI(part); } catch (e) { return part; }
  }).join('');
}

// new URL() percent-encodes raw characters (spaces) and leaves valid %XX escapes untouched.
function absoluteUrl(src, base) {
  if (!src) return '';
  try {
    return new URL(collapseDoubleEncoding(src), base || 'https://www.woolworthsgroup.com.au').href;
  } catch (e) {
    return encodeOnce(src);
  }
}

function extract(root, payload) {
  const doc = root.ownerDocument;
  const path = getSourcePath(payload, doc);
  const articleMatch = path.match(ARTICLE_PATH_RE) || `${path}/`.match(ARTICLE_PATH_RE);
  const isArticle = !!articleMatch;
  const lookup = isArticle ? lookupArticle(path) : null;
  const params = (payload && payload.params) || {};
  const baseUrl = params.originalURL || (payload && payload.url) || 'https://www.woolworthsgroup.com.au/';

  const hero = getHero(root);
  const heroHeading = hero ? hero.querySelector('h1, h2') : null;
  const titleEl = doc.querySelector('title');
  const docTitle = titleEl ? clean(titleEl.textContent) : '';
  const ogTitle = getHeadMeta(doc, 'og:title');
  const h1 = root.querySelector('h1');
  const titleCandidates = isArticle
    ? [heroHeading && heroHeading.textContent, ogTitle, docTitle, h1 && h1.textContent]
    : [docTitle, ogTitle, h1 && h1.textContent, heroHeading && heroHeading.textContent];
  const title = clean(titleCandidates.find((t) => clean(t)) || '');

  const paras = getBodyParagraphs(root);
  const dateline = getDateline(paras);

  let description = getHeadMeta(doc, 'description') || getHeadMeta(doc, 'og:description');
  if (!description) {
    const texts = paras.map((p, i) => (i === 0 ? stripDateline(p.textContent, dateline) : clean(p.textContent)));
    // skip story duration labels ("3 min read", "2:31 min read", "1:30 min video",
    // "17:16 view time", "5 min watch", "12 mins listen")
    let firstText = texts.find((t) => t.length > 0 && !DURATION_LABEL_RE.test(t));
    if (texts.some((t) => DURATION_LABEL_RE.test(t))) {
      // Story pages with a duration label: the copy is often only in the video component
      // (Woolworths 100 video stories), and the remaining text paragraph is a CTA link
      // ("See all Woolworths 100 stories") - skip link-only paragraphs, then use the video
      // description.
      const linkOnly = (p) => {
        const links = [...p.querySelectorAll('a')].map((a) => clean(a.textContent)).join(' ');
        return !!links && links === clean(p.textContent);
      };
      firstText = paras.map((p, i) => (linkOnly(p) ? '' : texts[i]))
        .find((t) => t.length > 0 && !DURATION_LABEL_RE.test(t));
      if (!firstText) {
        const videoDesc = [...root.querySelectorAll('.cmp-video__body__content__description')]
          .filter((el) => !el.closest('header, footer, .cmp-experiencefragment, .contenttile, .mastercard'))
          .map((el) => clean(el.textContent))
          .find(Boolean);
        firstText = videoDesc || '';
      }
    }
    description = firstText || '';
  }
  description = trimDescription(description);

  // Hero image: prefer the actual hero <img>, then lookup, then og:image.
  const heroImg = hero ? hero.querySelector('img.cmp-image__image, img[src]') : null;
  let imageSrc = heroImg ? heroImg.getAttribute('src') : '';
  if (imageSrc && /^data:/i.test(imageSrc)) imageSrc = '';
  const imageAlt = heroImg ? sanitizeAlt(heroImg.getAttribute('alt') || '', null, path) : '';
  if (!imageSrc && lookup && lookup.image) imageSrc = lookup.image; // encoded once by absoluteUrl
  if (!imageSrc) imageSrc = getHeadMeta(doc, 'og:image');
  imageSrc = absoluteUrl(imageSrc, baseUrl);

  const template = clean(
    (payload && payload.template && payload.template.name)
    || params.template
    || inferTemplate(path),
  );

  // Leadership profiles: the source meta description is stale (old appointment dates) and there
  // is no hero/og:image, so describe from the page body and use the portrait photo.
  if (template === 'leadership-profile') {
    const appointed = paras.map((p) => clean(p.textContent)).find((t) => /^appointed/i.test(t));
    const firstText = paras.map((p) => clean(p.textContent)).find((t) => t.length > 0);
    description = trimDescription(appointed || firstText || description);
    // The hidden profile hero banner is still in the DOM at this point; never use its image.
    const portrait = root.querySelector('.media-template-body img[src]:not([src^="data:"])');
    imageSrc = portrait ? absoluteUrl(portrait.getAttribute('src'), baseUrl) : '';
  }

  // Template-level overrides (page-templates.json "metadata"), for pages whose source head has
  // no usable title/description (e.g. search-page: empty <title>, no meta description).
  const overrides = (payload && payload.template && payload.template.metadata) || {};
  const result = {
    isArticle,
    path,
    title: clean(overrides.title) || title,
    description: clean(overrides.description) || description,
    imageSrc,
    imageAlt,
    template,
  };

  if (isArticle) {
    const urlYear = articleMatch[2];
    let date = lookup && /^\d{4}-\d{2}-\d{2}$/.test(lookup.date || '') ? lookup.date : '';
    if (!date && dateline) date = parseFullDate(dateline);
    if (!date && dateline) {
      const m = dateline.match(DATE_NO_YEAR_RE);
      if (m) date = toIso(m[1], m[2], urlYear);
    }
    if (!date) {
      const bodyText = paras.map((p) => p.textContent).join(' ');
      date = parseFullDate(bodyText);
    }

    let tags = lookup && Array.isArray(lookup.tags) ? lookup.tags.map(clean).filter(Boolean) : [];
    if (!tags.length) {
      tags = getHeadMeta(doc, 'keywords').split(',').map(clean).filter(Boolean);
    }

    result.date = date;
    result.tags = [...new Set(tags)].join(', ');
    // "<slug>2" pages are copies of an existing story; the source listing omits them
    const copyOf = path.match(/\/([^/]+)2$/);
    result.listing = copyOf && /our-stories/i.test(articleMatch[1]) ? 'none' : articleMatch[1].toLowerCase();

    ['date', 'tags'].forEach((k) => {
      if (!result[k]) {
        // eslint-disable-next-line no-console
        console.warn(`[article-metadata] missing ${k} for article ${path}`);
      }
    });
  }

  return result;
}

// ---- Metadata block helpers ----

function isMetadataTable(table) {
  const firstCell = table.querySelector('tr > th, tr > td');
  return !!firstCell && clean(firstCell.textContent).toLowerCase() === 'metadata';
}

function findMetadataBlock(root) {
  return [...root.querySelectorAll('table')].find(isMetadataTable) || null;
}

function getRowKey(tr) {
  const cell = tr.querySelector('td, th');
  return cell ? clean(cell.textContent).toLowerCase() : '';
}

function setRow(doc, table, key, value, overwrite) {
  const rows = [...table.querySelectorAll('tr')].slice(1);
  let row = rows.find((tr) => getRowKey(tr) === key.toLowerCase());
  if (row && !overwrite) return;
  if (!row) {
    row = doc.createElement('tr');
    row.append(doc.createElement('td'), doc.createElement('td'));
    (table.querySelector('tbody') || table).append(row);
  }
  const cells = row.querySelectorAll('td, th');
  cells[0].textContent = key;
  const valueCell = cells[1] || row.appendChild(doc.createElement('td'));
  valueCell.innerHTML = '';
  if (value && typeof value === 'object' && value.nodeType) valueCell.append(value);
  else valueCell.textContent = String(value);
}

// Keys are lowercase so local preview (getMetadata is case-sensitive on meta[name]) matches
// the published pipeline, e.g. body.<template>.
function buildEntries(doc, data) {
  const entries = [];
  if (data.title) entries.push(['title', data.title]);
  if (data.description) entries.push(['description', data.description]);
  if (data.imageSrc) {
    const img = doc.createElement('img');
    img.setAttribute('src', data.imageSrc);
    if (data.imageAlt) img.setAttribute('alt', data.imageAlt);
    entries.push(['image', img]);
  }
  if (data.template) entries.push(['template', data.template]);
  if (data.isArticle) {
    if (data.date) entries.push(['date', data.date]);
    if (data.tags) entries.push(['tags', data.tags]);
    if (data.listing) entries.push(['listing', data.listing]);
  }
  return entries;
}

// Make the later WebImporter.rules.createMetadata() call merge into our block
// (only adding keys we did not set) instead of appending a duplicate block.
function guardCreateMetadata() {
  if (typeof WebImporter === 'undefined' || !WebImporter.rules) return;
  const original = WebImporter.rules.createMetadata;
  if (typeof original !== 'function' || original.__articleMetadataGuard) return;
  const guarded = function createMetadataMerged(main, document, ...rest) {
    const existing = main ? findMetadataBlock(main) : null;
    if (!existing) return original.call(this, main, document, ...rest);
    const scratch = document.createElement('div');
    const meta = original.call(this, scratch, document, ...rest);
    const generated = findMetadataBlock(scratch);
    if (generated) {
      [...generated.querySelectorAll('tr')].slice(1).forEach((tr) => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length < 2) return;
        const value = cells[1].firstElementChild && cells[1].childNodes.length === 1
          ? cells[1].firstElementChild
          : clean(cells[1].textContent);
        if (value) setRow(document, existing, clean(cells[0].textContent), value, false);
      });
    }
    main.append(existing); // keep Metadata as the last element (after the import script's <hr>)
    return meta;
  };
  guarded.__articleMetadataGuard = true;
  WebImporter.rules.createMetadata = guarded;
}

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    const data = extract(element, payload);
    STASH.set(element, data);
    sanitizeImageAlts(element, data.path);
  }

  if (hookName === H.after) {
    const doc = element.ownerDocument;
    const data = STASH.get(element) || extract(element, payload);
    STASH.delete(element);

    const entries = buildEntries(doc, data);
    if (!entries.length) return;

    let block = findMetadataBlock(element);
    if (block) {
      entries.forEach(([k, v]) => setRow(doc, block, k, v, true));
    } else {
      const meta = {};
      entries.forEach(([k, v]) => { meta[k] = v; });
      block = WebImporter.Blocks.getMetadataBlock
        ? WebImporter.Blocks.getMetadataBlock(doc, meta)
        : WebImporter.Blocks.createBlock(doc, { name: 'Metadata', cells: meta });
      element.append(block);
    }

    guardCreateMetadata();
  }
}
