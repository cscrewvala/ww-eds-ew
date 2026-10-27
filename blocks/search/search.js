import { readBlockConfig } from '../../scripts/aem.js';

const DEFAULT_INDEX = '/query-index.json';
const CHUNK = 1000;
const DEFAULT_PAGE_SIZE = 10;
const CONFIG_KEYS = ['index', 'page-size', 'pagesize', 'limit'];
// fragments and chrome documents are never results
const EXCLUDED_PATH = /\/(nav|footer|nav-section|fragments)(\/|$)/;
const DEV_HOSTS = ['localhost', '127.0.0.1'];

const LABELS = {
  input: 'Search the site',
  placeholder: 'What are you looking for?',
  clear: 'Clear search',
  submit: 'Search',
  categories: 'Filter results by section',
  year: 'Filter By Year',
  allYears: 'All years',
  sort: 'Sort By',
  newest: 'Most recent',
  oldest: 'Oldest first',
  relevance: 'Most relevant',
  resultsHeading: 'Search results',
  results: 'Results available',
  noResults: 'No result found, please try again.',
  noQuery: 'Enter a search term to see results.',
  previous: 'Previous',
  next: 'Next',
  loading: 'Loading results…',
};

// "desc" (Most recent, the source default) is the implicit sort and never written to the URL
const SORTS = ['desc', 'asc', 'relevance'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ICON_CLEAR = '<svg viewBox="0 0 32 32" width="20" height="20" fill="none" aria-hidden="true" focusable="false"><path d="M8 8L24 24M8 24L24 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true" focusable="false"><path d="M28 28L20 20M22.6667 13.3333C22.6667 18.488 18.488 22.6667 13.3333 22.6667C8.17868 22.6667 4 18.488 4 13.3333C4 8.17868 8.17868 4 13.3333 4C18.488 4 22.6667 8.17868 22.6667 13.3333Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  });
  children.flat().forEach((c) => {
    if (c !== null && c !== undefined && c !== false) node.append(c);
  });
  return node;
}

/**
 * Splits an index cell into a trimmed, de-duplicated list.
 * Cells may be JSON arrays ('["a","b"]') or comma-separated strings.
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
 * Normalises a path or URL to a site path without /content prefix, extension or trailing slash.
 * @param {string} value
 * @returns {string}
 */
function toPath(value) {
  try {
    return new URL(value.trim(), window.location.origin).pathname
      .replace(/^\/content(\/wwg)?(?=\/)/, '')
      .replace(/\.html$/, '')
      .replace(/(.)\/$/, '$1');
  } catch {
    return '';
  }
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Reads the authored rows. A single-cell row is the query index URL (Block Collection search
 * convention); "Index" and "Page size" two-cell rows are settings; every other two-cell row is
 * a category pill (label | path prefix), in authored order.
 * @param {Element} block
 */
function readConfig(block) {
  const config = readBlockConfig(block);
  const categories = [];
  let authoredIndex = '';
  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const [labelCell, cell2] = row.children;
    if (!labelCell) return;
    // an empty second cell counts as absent (a Universal Editor save adds empty cells)
    const valueCell = cell2 && (cell2.textContent.trim() || cell2.querySelector('a')) ? cell2 : null;
    if (!valueCell) {
      const link = labelCell.querySelector('a');
      const value = (link ? link.getAttribute('href') : labelCell.textContent).trim();
      if (value && !authoredIndex) authoredIndex = value;
      return;
    }
    const label = labelCell.textContent.trim();
    if (!label || CONFIG_KEYS.includes(slug(label))) return;
    const link = valueCell.querySelector('a');
    const prefix = toPath(link ? link.getAttribute('href') : valueCell.textContent);
    if (!prefix) return;
    let id = slug(label) || `category-${categories.length + 1}`;
    if (categories.some((c) => c.id === id)) id = `${id}-${categories.length + 1}`;
    categories.push({ id, label, prefix });
  });

  // an "Index" row (the Universal Editor property) wins over the single-cell index row
  let index = config.index || authoredIndex || DEFAULT_INDEX;
  // local development only: point the block at a fixture,
  // e.g. ?index=/migration-work/query-index.json
  const override = new URLSearchParams(window.location.search).get('index');
  if (override && DEV_HOSTS.includes(window.location.hostname)) index = override;

  const pageSize = parseInt(config['page-size'] || config.pagesize || config.limit, 10);
  return {
    index,
    categories,
    pageSize: pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/**
 * Fetches every row of a sheet-style index, following offset/limit/total paging.
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
    if (!resp.ok) throw new Error(`${resp.status} ${url}`);
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    const data = Array.isArray(json.data) ? json.data : [];
    rows.push(...data);
    total = Number.isFinite(json.total) ? json.total : rows.length;
    if (!data.length) break;
    offset += data.length;
  }
  return rows;
}

const lower = (v) => `${v || ''}`.toLowerCase();

/**
 * Normalises an index row into a searchable document, or null when it must not be listed.
 */
function toDoc(row, ownPath) {
  const path = `${row.path || ''}`;
  // only same-site paths become links (never "//host" or "javascript:" values)
  if (!/^\/(?!\/)/.test(path)) return null;
  if (path === ownPath || EXCLUDED_PATH.test(path)) return null;
  if (lower(row.robots).includes('noindex')) return null;
  const date = /^\d{4}-\d{2}-\d{2}/.test(row.date || '') ? row.date.slice(0, 10) : '';
  const tags = toList(row.tags);
  const title = `${row.title || ''}`.trim();
  const description = `${row.description || ''}`.trim();
  // undated articles still carry their year folder (/our-stories/2024/...)
  const folderYear = (path.match(/\/((?:19|20)\d{2})\//) || [])[1] || '';
  return {
    path,
    title: title || path,
    description,
    date,
    year: date.slice(0, 4) || folderYear,
    tags,
    // display uses the published date only; pages without a date or year sort last
    sortKey: date || (folderYear ? `${folderYear}-00-00` : ''),
    hay: {
      title: lower(title),
      description: lower(description),
      tags: lower(tags.join(' ')),
      content: lower(row.content),
    },
  };
}

const WEIGHTS = {
  title: 10, tags: 5, description: 4, content: 1,
};

/**
 * Relevance score: every term must match a field (else 0); title > tags > description > content.
 * @param {object} doc
 * @param {string[]} terms Lowercased query terms
 * @param {string} phrase Lowercased full query
 */
function score(doc, terms, phrase) {
  let total = 0;
  const fields = Object.keys(WEIGHTS);
  for (let i = 0; i < terms.length; i += 1) {
    const term = terms[i];
    const hits = fields.filter((f) => doc.hay[f].includes(term));
    if (!hits.length) return 0;
    total += hits.reduce((sum, f) => sum + WEIGHTS[f], 0);
  }
  if (terms.length > 1 && doc.hay.title.includes(phrase)) total += 10;
  if (doc.hay.title.startsWith(phrase)) total += 5;
  return total;
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}-${MONTHS[Number(m) - 1] || m}-${y}`;
}

function readState(categories) {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category') || '';
  return {
    q: (params.get('q') || '').trim(),
    category: categories.slice(1).some((c) => c.id === category) ? category : '',
    year: /^\d{4}$/.test(params.get('year') || '') ? params.get('year') : '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : 'desc',
    page: Math.max(1, parseInt(params.get('page'), 10) || 1),
  };
}

function writeState(state, push) {
  const url = new URL(window.location.href);
  const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
  set('q', state.q);
  set('category', state.category);
  set('year', state.year);
  set('sort', state.sort !== 'desc' ? state.sort : '');
  set('page', state.page > 1 ? `${state.page}` : '');
  if (url.href === window.location.href) return;
  if (push) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

function buildSelect(name, label, options) {
  const id = `search-${name}-${Math.random().toString(36).slice(2, 8)}`;
  const select = el('select', { id, name });
  options.forEach(([v, text]) => select.append(el('option', { value: v }, text)));
  const field = el('div', { class: `search-field search-${name}` }, el('label', { for: id }, label), select);
  return { field, select };
}

function setOptions(select, options, value) {
  select.replaceChildren(...options.map(([v, text]) => el('option', { value: v }, text)));
  select.value = value;
}

function renderResult(doc) {
  const tag = doc.tags[0];
  return el(
    'li',
    { class: 'search-result' },
    el('h3', { class: 'search-result-title' }, el('a', { href: doc.path }, doc.title)),
    doc.description ? el('p', { class: 'search-result-description' }, doc.description) : null,
    (doc.date || tag) ? el(
      'div',
      { class: 'search-result-info' },
      doc.date ? el('time', { class: 'search-result-date', datetime: doc.date }, formatDate(doc.date)) : el('span'),
      tag ? el('span', { class: 'search-result-tag' }, tag) : null,
    ) : null,
  );
}

/**
 * Site search over the query index.
 * Rows: <index url> (single cell), <label> | <path prefix> (category pills, first = default),
 * Page size | <n>. "Index | <url>" is accepted as an alternative to the single-cell row.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const { categories, pageSize } = config;
  block.textContent = '';

  // ---------- search bar ----------
  const inputId = `search-input-${Math.random().toString(36).slice(2, 8)}`;
  const input = el('input', {
    id: inputId,
    class: 'search-input',
    type: 'search',
    name: 'q',
    placeholder: LABELS.placeholder,
    autocomplete: 'off',
    enterkeyhint: 'search',
  });
  const clear = el('button', { type: 'button', class: 'search-clear', 'aria-label': LABELS.clear });
  clear.innerHTML = ICON_CLEAR;
  const submit = el('button', { type: 'submit', class: 'search-submit' }, el('span', { class: 'search-submit-text' }, LABELS.submit));
  submit.insertAdjacentHTML('beforeend', ICON_SEARCH);
  const form = el(
    'form',
    { class: 'search-bar', role: 'search', action: window.location.pathname },
    el('label', { for: inputId, class: 'search-sr-only' }, LABELS.input),
    input,
    clear,
    submit,
  );

  // ---------- category pills ----------
  const pills = categories.length > 1
    ? el('div', { class: 'search-categories', role: 'group', 'aria-label': LABELS.categories })
    : null;
  if (pills) {
    categories.forEach((c, i) => {
      pills.append(el('button', {
        type: 'button', class: 'search-category', 'data-category': i === 0 ? '' : c.id, 'aria-pressed': 'false',
      }, c.label));
    });
  }

  // ---------- options, results, pager ----------
  const status = el('p', { class: 'search-status', role: 'status', 'aria-live': 'polite' }, LABELS.loading);
  const year = buildSelect('year', LABELS.year, [['', LABELS.allYears]]);
  const sort = buildSelect('sort', LABELS.sort, [
    ['desc', LABELS.newest], ['asc', LABELS.oldest], ['relevance', LABELS.relevance],
  ]);
  const selects = el('div', { class: 'search-selects' }, year.field, sort.field);
  const options = el('div', { class: 'search-options' }, status, selects);
  const listHeadingId = `search-results-heading-${Math.random().toString(36).slice(2, 8)}`;
  const listHeading = el('h2', { id: listHeadingId, class: 'search-sr-only' }, LABELS.resultsHeading);
  const list = el('ol', { class: 'search-results', 'aria-labelledby': listHeadingId });
  const empty = el('p', { class: 'search-empty', hidden: true });
  const pager = el('nav', { class: 'search-pager', 'aria-label': 'Search results pages' });
  block.append(form, pills || '', options, listHeading, list, empty, pager);
  block.setAttribute('aria-busy', 'true');

  let state = readState(categories);
  input.value = state.q;
  clear.hidden = !state.q;

  let docs = [];
  let loadFailed = false;
  try {
    const ownPath = toPath(window.location.pathname);
    docs = (await fetchIndex(config.index)).map((r) => toDoc(r, ownPath)).filter(Boolean);
  } catch (e) {
    loadFailed = true;
    // eslint-disable-next-line no-console
    console.error('search: failed to load index', config.index, e);
  }

  function matchesFor(s) {
    const q = s.q.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!q) return [];
    const terms = [...new Set(q.split(' '))];
    const active = categories.find((c) => c.id === s.category) || categories[0];
    const prefix = active ? active.prefix : '';
    const inCategory = (p) => !prefix || prefix === '/' || p === prefix || p.startsWith(`${prefix}/`);
    return docs
      .filter((d) => inCategory(d.path))
      .map((d) => ({ doc: d, score: score(d, terms, q) }))
      .filter((m) => m.score > 0)
      // relevance first, so a stable date sort keeps relevance order within equal dates
      .sort((a, b) => b.score - a.score)
      .map((m) => m.doc);
  }

  function renderPager(totalPages, onPage) {
    pager.textContent = '';
    if (totalPages <= 1) return;
    const button = (label, page, attrs = {}) => {
      const b = el('button', { type: 'button', ...attrs }, label);
      b.addEventListener('click', () => {
        onPage({ page });
        block.querySelector('.search-options').scrollIntoView({ block: 'start', behavior: 'smooth' });
        const target = pager.querySelector('[aria-current="page"]') || pager.querySelector('button:not(:disabled)');
        if (target) target.focus({ preventScroll: true });
      });
      return b;
    };
    const pageItem = (p) => el('li', {}, button(`${p}`, p, {
      'aria-current': p === state.page ? 'page' : false, 'aria-label': `Page ${p}`,
    }));
    const ellipsis = () => el('li', { 'aria-hidden': 'true' }, el('span', { class: 'search-ellipsis' }, '...'));
    pager.append(button(LABELS.previous, state.page - 1, { class: 'search-prev', disabled: state.page === 1 }));
    const pages = el('ol', { class: 'search-pages' });
    const windowStart = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    const windowEnd = Math.min(totalPages, windowStart + 4);
    if (windowStart > 1) pages.append(pageItem(1));
    if (windowStart > 2) pages.append(ellipsis());
    for (let p = windowStart; p <= windowEnd; p += 1) pages.append(pageItem(p));
    if (windowEnd < totalPages - 1) pages.append(ellipsis());
    if (windowEnd < totalPages) pages.append(pageItem(totalPages));
    pager.append(pages);
    pager.append(el('span', { class: 'search-page-compact' }, `${state.page}/${totalPages}`));
    pager.append(button(LABELS.next, state.page + 1, { class: 'search-next', disabled: state.page === totalPages }));
    pager.append(el('p', { class: 'search-page-of' }, `page ${state.page} of ${totalPages}`));
  }

  function render(push = false) {
    const matches = matchesFor(state);
    const years = [...new Set(matches.map((d) => d.year).filter(Boolean))].sort().reverse();
    if (state.year && !years.includes(state.year)) state.year = '';
    const filtered = matches
      .filter((d) => !state.year || d.year === state.year)
      .sort((a, b) => {
        // "Most relevant" keeps the score order from matchesFor
        if (state.sort === 'relevance') return 0;
        if (!a.sortKey || !b.sortKey) return (a.sortKey ? -1 : 0) + (b.sortKey ? 1 : 0);
        return state.sort === 'asc'
          ? a.sortKey.localeCompare(b.sortKey)
          : b.sortKey.localeCompare(a.sortKey);
      });
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.page = Math.min(state.page, totalPages);

    if (pills) {
      pills.querySelectorAll('.search-category').forEach((pill) => {
        pill.setAttribute('aria-pressed', pill.dataset.category === state.category ? 'true' : 'false');
      });
    }
    setOptions(year.select, [['', LABELS.allYears], ...years.map((y) => [y, y])], state.year);
    sort.select.value = state.sort;

    if (!state.q) {
      status.textContent = LABELS.noQuery;
    } else {
      status.textContent = `${filtered.length} ${LABELS.results}`;
    }
    options.classList.toggle('search-options-idle', !state.q || loadFailed);
    empty.textContent = LABELS.noResults;
    empty.hidden = !state.q || filtered.length > 0;

    const start = (state.page - 1) * pageSize;
    list.replaceChildren(...filtered.slice(start, start + pageSize).map(renderResult));
    // eslint-disable-next-line no-use-before-define
    renderPager(totalPages, update);
    writeState(state, push);
  }

  function update(patch, push = false) {
    state = { ...state, ...patch };
    render(push);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    clear.hidden = !q;
    // a new query is a new history entry (Back returns to the previous query); filters replace it
    update({ q, page: 1, year: '' }, q !== state.q);
  });
  input.addEventListener('input', () => { clear.hidden = !input.value; });
  clear.addEventListener('click', () => {
    input.value = '';
    clear.hidden = true;
    input.focus();
  });
  if (pills) {
    pills.addEventListener('click', (e) => {
      const pill = e.target.closest('.search-category');
      if (pill) update({ category: pill.dataset.category, page: 1, year: '' });
    });
  }
  year.select.addEventListener('change', () => update({ year: year.select.value, page: 1 }));
  sort.select.addEventListener('change', () => update({ sort: sort.select.value, page: 1 }));
  window.addEventListener('popstate', () => {
    state = readState(categories);
    input.value = state.q;
    clear.hidden = !state.q;
    render();
  });

  render();
  block.removeAttribute('aria-busy');
}
