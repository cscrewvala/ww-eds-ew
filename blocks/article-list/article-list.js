import { readBlockConfig } from '../../scripts/aem.js';
import { createOptimizedPicture } from '../../scripts/scripts.js';

const DEFAULT_INDEX = '/au/en/article-index.json';
const CHUNK = 500;

const LABELS = {
  all: 'All',
  allStories: 'All Stories',
  allYears: 'All years',
  year: 'Filter by year',
  sort: 'Sort by',
  newest: 'Most recent',
  oldest: 'Oldest first',
  results: 'results available',
  noResults: 'We’re sorry, but we couldn’t find any results.',
  previous: 'Previous',
  next: 'Next',
  loadMore: 'Load More',
  learnMore: 'Learn more',
};

/**
 * Splits a config value or index cell into a trimmed, de-duplicated list.
 * Index cells may be JSON arrays ('["a","b"]') or comma-separated strings.
 * @param {string|string[]} value
 * @returns {string[]}
 */
function toList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return [...new Set(value.flatMap((v) => toList(v)))];
  const str = `${value}`.trim();
  if (str.startsWith('[')) {
    try {
      return toList(JSON.parse(str));
    } catch { /* fall through to comma split */ }
  }
  return [...new Set(str.split(',').map((v) => v.trim()).filter(Boolean))];
}

/**
 * Fetches every row of a query index, following offset/limit pagination.
 * @param {string} index Index URL
 * @returns {Promise<object[]>}
 */
async function fetchIndex(index) {
  const rows = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const url = new URL(index, window.location.origin);
    url.searchParams.set('offset', offset);
    url.searchParams.set('limit', CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    const data = json.data || [];
    rows.push(...data);
    total = Number.isFinite(json.total) ? json.total : rows.length;
    if (!data.length) break;
    offset += data.length;
  }
  return rows;
}

/**
 * Normalises an index row into the shape the list renders.
 * Sort key: published date, else the year folder in the path, then lastModified.
 */
function toArticle(row) {
  const yearInPath = (row.path.match(/\/(\d{4})\//) || [])[1];
  const date = /^\d{4}-\d{2}-\d{2}/.test(row.date || '') ? row.date.slice(0, 10) : '';
  const lastModified = Number(row.lastModified) || 0;
  return {
    path: row.path,
    title: row.title || '',
    // the SEO description is not a teaser; only a dedicated card description is shown
    cardDescription: row['card-description'] || '',
    description: row.description || '',
    image: row.image || '',
    tags: toList(row.tags),
    date,
    year: date ? date.slice(0, 4) : (yearInPath || ''),
    sortKey: `${date || (yearInPath ? `${yearInPath}-00-00` : '0000-00-00')}|${String(lastModified).padStart(13, '0')}`,
  };
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c) node.append(c);
  });
  return node;
}

function renderImage(article, breakpoints = [{ width: '750' }]) {
  if (!article.image) return null;
  const picture = createOptimizedPicture(article.image, article.title, false, breakpoints);
  return el('div', { class: 'article-list-image' }, picture);
}

function renderNewsCard(article) {
  const tag = article.tags[0];
  return el(
    'li',
    { class: 'article-list-card' },
    renderImage(article),
    el(
      'div',
      { class: 'article-list-body' },
      tag ? el('span', { class: 'article-list-tag' }, tag) : null,
      el('h3', {}, el('a', { href: article.path }, article.title)),
      article.date ? el('p', { class: 'article-list-date' }, el('time', { datetime: article.date }, formatDate(article.date))) : null,
      el('p', { class: 'article-list-more' }, el('a', { href: article.path, 'aria-hidden': 'true', tabindex: '-1' }, LABELS.learnMore)),
    ),
  );
}

function renderStoryCard(article) {
  return el(
    'li',
    { class: 'article-list-card' },
    renderImage(article),
    el(
      'div',
      { class: 'article-list-body' },
      article.tags.length ? el('ul', { class: 'article-list-tags' }, article.tags.map((t) => el('li', { class: 'article-list-tag' }, t))) : null,
      el('h3', {}, el('a', { href: article.path }, article.title)),
      article.cardDescription ? el('p', { class: 'article-list-description' }, article.cardDescription) : null,
      el('p', { class: 'article-list-more' }, el('a', { href: article.path, 'aria-hidden': 'true', tabindex: '-1' }, 'Learn More')),
    ),
  );
}

/**
 * Featured layout card: the lead (newest) card is large with a teaser; the others are
 * horizontal tiles. Source: newsroom "Latest news" .two-50-50 content tiles.
 */
function renderFeaturedCard(article, lead) {
  const tag = article.tags[0];
  const teaser = lead ? (article.cardDescription || article.description) : '';
  const breakpoints = lead
    ? [{ media: '(min-width: 900px)', width: '1200' }, { width: '750' }]
    : [{ width: '400' }];
  return el(
    'li',
    { class: lead ? 'article-list-card article-list-lead' : 'article-list-card' },
    renderImage(article, breakpoints),
    el(
      'div',
      { class: 'article-list-body' },
      tag ? el('span', { class: 'article-list-tag' }, tag) : null,
      el('h3', {}, el('a', { href: article.path }, article.title)),
      teaser ? el('p', { class: 'article-list-description' }, teaser) : null,
      el('p', { class: 'article-list-more' }, el('a', { href: article.path, 'aria-hidden': 'true', tabindex: '-1' }, LABELS.learnMore)),
    ),
  );
}

function buildSelect(name, label, options, value) {
  const id = `article-list-${name}-${Math.random().toString(36).slice(2, 8)}`;
  const select = el('select', { id, name });
  options.forEach(([v, text]) => {
    const option = el('option', { value: v }, text);
    if (v === value) option.selected = true;
    select.append(option);
  });
  return el('div', { class: `article-list-field article-list-${name}` }, el('label', { for: id }, label), select);
}

/**
 * Normalises a path or URL to a site path without extension or trailing slash.
 * @param {string} value
 * @returns {string}
 */
function toPath(value) {
  try {
    return new URL(value, window.location.origin).pathname
      .replace(/^\/content(?=\/)/, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * Reads the Featured row directly so linked and plain-text paths can be mixed.
 * @param {Element} block
 * @returns {string[]} Normalised paths in authored order
 */
function readFeatured(block) {
  const row = [...block.querySelectorAll(':scope > div')]
    .find((r) => r.children[1] && r.children[0].textContent.trim().toLowerCase() === 'featured');
  if (!row) return [];
  const cell = row.children[1].cloneNode(true);
  cell.querySelectorAll('a').forEach((a) => a.replaceWith(` ${a.getAttribute('href')} `));
  cell.querySelectorAll('p, br, li').forEach((n) => n.after(' '));
  const paths = cell.textContent.split(/[\s,]+/).filter(Boolean).map(toPath).filter(Boolean);
  return [...new Set(paths)];
}

/**
 * Orders tags by the authored Categories list; unlisted tags follow alphabetically.
 * @param {string[]} tags
 * @param {string[]} order
 * @returns {string[]}
 */
function orderTags(tags, order) {
  const rank = (t) => {
    const i = order.findIndex((o) => o.toLowerCase() === t.toLowerCase());
    return i < 0 ? order.length : i;
  };
  return [...tags].sort((a, b) => (rank(a) - rank(b)) || a.localeCompare(b));
}

/**
 * Reads filter state from the URL so filtered views are linkable and survive reloads.
 */
function readState(defaults) {
  const params = new URLSearchParams(window.location.search);
  return {
    tag: params.get('tag') || defaults.tag,
    year: params.get('year') || '',
    sort: params.get('sort') === 'asc' ? 'asc' : 'desc',
    page: Math.max(1, parseInt(params.get('page'), 10) || 1),
  };
}

function writeState(state, defaults) {
  const url = new URL(window.location.href);
  const set = (k, v, d) => (v && v !== d ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('tag', state.tag, defaults.tag);
  set('year', state.year, '');
  set('sort', state.sort, 'desc');
  set('page', state.page > 1 ? `${state.page}` : '', '');
  window.history.replaceState(null, '', url);
}

/**
 * Dynamic article listing driven by the query index.
 * Config rows: Source, Filters (tags|category, year, sort), Tags, Categories, Featured,
 * Limit, Layout (news|stories|featured), Index.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const sources = toList(config.source);
  const filters = toList(config.filters).map((f) => f.toLowerCase());
  const presetTags = toList(config.tags);
  const categories = toList(config.categories);
  const featured = readFeatured(block);
  const layoutName = (config.layout || 'news').toLowerCase();
  const layout = ['stories', 'featured'].includes(layoutName) ? layoutName : 'news';
  // featured: a fixed newest-first set (lead + tiles); no filters, paging or URL state
  const isFeatured = layout === 'featured';
  const limit = Math.max(1, parseInt(config.limit, 10) || (isFeatured ? 5 : 12));
  const index = config.index || DEFAULT_INDEX;
  const showTags = !isFeatured && (filters.includes('tags') || filters.includes('category'));

  block.textContent = '';
  block.classList.add(`article-list-${layout}`);
  block.setAttribute('aria-busy', 'true');

  let rows = [];
  try {
    rows = await fetchIndex(index);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('article-list: failed to load index', index, e);
  }

  const ownPath = window.location.pathname.replace(/\/$/, '');
  const articles = rows
    .filter((r) => r.path && r.path !== ownPath && r.listing !== 'none')
    .filter((r) => !sources.length || sources.some((s) => r.path.startsWith(s)))
    .filter((r) => /\/\d{4}\/[^/]+$/.test(r.path))
    .map(toArticle)
    .filter((a) => presetTags.every((t) => a.tags.includes(t)));

  // preset tags stay as chips (the source shows them); they only restrict the pool
  // unlisted preset tags lead the unlisted chips (source: "All Stories, 100 Years, ...")
  const allTags = [...new Set(articles.flatMap((a) => a.tags))];
  const tagOptions = orderTags(allTags, [...categories, ...presetTags]);
  const featuredRank = new Map(featured.map((p, i) => [p, i]));
  const yearOptions = [...new Set(articles.map((a) => a.year).filter(Boolean))].sort().reverse();
  const allLabel = layout === 'stories' ? LABELS.allStories : LABELS.all;
  const defaults = { tag: '' };
  const state = isFeatured ? {
    tag: '', year: '', sort: 'desc', page: 1,
  } : readState(defaults);
  if (state.tag && !tagOptions.includes(state.tag)) state.tag = '';
  if (state.year && !yearOptions.includes(state.year)) state.year = '';

  const controls = el('div', { class: 'article-list-controls' });
  const status = el('p', { class: 'article-list-status', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', { class: 'article-list-items' });
  const pager = el('nav', { class: 'article-list-pager', 'aria-label': 'Pagination' });
  block.append(controls, status, list, pager);

  // eslint-disable-next-line no-use-before-define
  const update = (patch) => { Object.assign(state, patch); render(); };

  if (showTags && tagOptions.length) {
    const chips = el('div', { class: 'article-list-chips', role: 'group', 'aria-label': 'Filter by category' });
    [['', allLabel], ...tagOptions.map((t) => [t, t])].forEach(([value, text]) => {
      const chip = el('button', { type: 'button', class: 'article-list-chip', 'data-tag': value }, text);
      chip.addEventListener('click', () => update({ tag: value, page: 1 }));
      chips.append(chip);
    });
    controls.append(chips);
  }
  const selects = el('div', { class: 'article-list-selects' });
  if (!isFeatured && filters.includes('year') && yearOptions.length) {
    const year = buildSelect('year', LABELS.year, [['', LABELS.allYears], ...yearOptions.map((y) => [y, y])], state.year);
    year.querySelector('select').addEventListener('change', (e) => update({ year: e.target.value, page: 1 }));
    selects.append(year);
  }
  if (!isFeatured && filters.includes('sort')) {
    const sort = buildSelect('sort', LABELS.sort, [['desc', LABELS.newest], ['asc', LABELS.oldest]], state.sort);
    sort.querySelector('select').addEventListener('change', (e) => update({ sort: e.target.value, page: 1 }));
    selects.append(sort);
  }
  if (selects.children.length) controls.append(selects);
  if (!controls.children.length) controls.remove();

  function renderPager(totalPages) {
    pager.textContent = '';
    if (totalPages <= 1) return;
    if (layout === 'stories') {
      if (state.page < totalPages) {
        const more = el('button', { type: 'button', class: 'button article-list-load-more' }, LABELS.loadMore);
        more.addEventListener('click', () => update({ page: state.page + 1 }));
        pager.append(more);
      }
      return;
    }
    // the source keeps the scroll position on page change; keep focus on the pager too
    const button = (label, page, attrs = {}) => {
      const b = el('button', { type: 'button', ...attrs }, label);
      b.addEventListener('click', () => {
        const key = b.classList.contains('article-list-prev') || b.classList.contains('article-list-next')
          ? `.${b.className}` : '[aria-current="page"]';
        update({ page });
        const target = [key, '.article-list-prev', '.article-list-next', '[aria-current="page"]']
          .map((s) => pager.querySelector(`${s}:not(:disabled)`))
          .find((n) => n && n.getClientRects().length);
        if (target) target.focus({ preventScroll: true });
      });
      return b;
    };
    const pageItem = (p) => el('li', {}, button(`${p}`, p, { 'aria-current': p === state.page ? 'page' : false, 'aria-label': `Page ${p}` }));
    const ellipsis = () => el('li', { 'aria-hidden': 'true' }, el('span', { class: 'article-list-ellipsis' }, '...'));
    pager.append(button(LABELS.previous, state.page - 1, { class: 'article-list-prev', disabled: state.page === 1 }));
    const pages = el('ol', { class: 'article-list-pages' });
    const windowStart = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    const windowEnd = Math.min(totalPages, windowStart + 4);
    if (windowStart > 1) pages.append(pageItem(1));
    if (windowStart > 2) pages.append(ellipsis());
    for (let p = windowStart; p <= windowEnd; p += 1) pages.append(pageItem(p));
    if (windowEnd < totalPages - 1) pages.append(ellipsis());
    if (windowEnd < totalPages) pages.append(pageItem(totalPages));
    pager.append(pages);
    // compact mobile pager: "previous 2/32 next"
    pager.append(el('span', { class: 'article-list-page-compact' }, `${state.page}/${totalPages}`));
    pager.append(button(LABELS.next, state.page + 1, { class: 'article-list-next', disabled: state.page === totalPages }));
    pager.append(el('p', { class: 'article-list-page-of' }, `page ${state.page} of ${totalPages}`));
  }

  // Featured paths lead in authored order (newest-first view only), the rest follow by date
  const compare = (a, b) => {
    if (state.sort === 'asc') return a.sortKey.localeCompare(b.sortKey);
    const fa = featuredRank.has(a.path) ? featuredRank.get(a.path) : Infinity;
    const fb = featuredRank.has(b.path) ? featuredRank.get(b.path) : Infinity;
    if (fa !== fb) return fa < fb ? -1 : 1;
    return b.sortKey.localeCompare(a.sortKey);
  };

  function renderFeatured() {
    const visible = articles.sort(compare).slice(0, limit);
    status.remove();
    pager.remove();
    // the lead card spans the rows of the tiles beside it
    list.style.setProperty('--article-list-rest', Math.max(1, visible.length - 1));
    list.replaceChildren(...visible.map((a, i) => renderFeaturedCard(a, i === 0)));
  }

  function render() {
    if (isFeatured) {
      renderFeatured();
      return;
    }
    const matches = articles
      .filter((a) => !state.tag || a.tags.includes(state.tag))
      .filter((a) => !state.year || a.year === state.year)
      .sort(compare);
    const totalPages = Math.max(1, Math.ceil(matches.length / limit));
    state.page = Math.min(state.page, totalPages);
    // stories accumulate with "Load More"; news shows one numbered page at a time
    const start = layout === 'stories' ? 0 : (state.page - 1) * limit;
    const visible = matches.slice(start, state.page * limit);

    controls.querySelectorAll('.article-list-chip').forEach((chip) => {
      chip.setAttribute('aria-pressed', chip.dataset.tag === state.tag ? 'true' : 'false');
    });
    status.textContent = matches.length ? `${matches.length} ${LABELS.results}` : LABELS.noResults;
    list.replaceChildren(...visible.map(layout === 'stories' ? renderStoryCard : renderNewsCard));
    renderPager(totalPages);
    writeState(state, defaults);
  }

  render();
  block.removeAttribute('aria-busy');
}
