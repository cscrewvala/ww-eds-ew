/*
 * json-object-display block
 * -------------------------------------------------------------
 * Fetches an EDS-published JSON object (a da.live spreadsheet published
 * to .json) and renders selected key/value pairs with a configurable style.
 *
 * Authoring (table rows in the document):
 *   | json-object-display              |
 *   | source      | /stock-price.json  |   <- optional, JSON endpoint (default: /stock-price.json)
 *   | style       | nav                |   <- optional, visual style (default: nav)
 *   | Share price | price | AUD        |   <- display label | json key | optional suffix/unit
 *   | High        | high               |
 *   | Low         | low                |
 *   | Change      | change | %         |
 *
 * Reserved first-cell keys: `source`, `style`. Every other row is a
 * display mapping: cell 1 = label shown to the user, cell 2 = the key to
 * read from the JSON, cell 3 = optional suffix/unit appended to the value.
 * The style can also be authored as a block variant: `json-object-display (nav)`.
 */

import { toClassName } from '../../scripts/aem.js';

const RESERVED = ['source', 'style'];
const DEFAULT_SOURCE = '/stock-price.json';
const DEFAULT_STYLE = 'nav';
const EDS_HOSTS = /\.(aem|hlx)\.(page|live)$/;

/**
 * Flatten an EDS/da.live JSON response into a flat { key: value } map.
 * Handles:
 *  - sheet with a single data row whose columns are the keys
 *    e.g. { data: [{ price: '41.94', high: '42.47' }] }
 *  - sheet with explicit key/value columns
 *    e.g. { data: [{ key: 'price', value: '41.94' }, ...] }
 *  - a plain object or array of objects
 * @param {*} json parsed JSON response
 * @returns {Object} flat key/value map
 */
function normalize(json) {
  const out = {};
  let rows = [];
  if (Array.isArray(json)) rows = json;
  else if (Array.isArray(json?.data)) rows = json.data;
  else if (json && typeof json === 'object') rows = [json];

  if (!rows.length) return out;

  const looksKeyValue = rows.every(
    (r) => r && typeof r === 'object' && 'key' in r && 'value' in r,
  );

  if (looksKeyValue) {
    rows.forEach((r) => { out[String(r.key)] = r.value; });
  } else {
    // Merge every row's own columns; later rows override earlier ones.
    rows.forEach((r) => {
      if (r && typeof r === 'object') Object.assign(out, r);
    });
  }
  return out;
}

/**
 * Read a config/mapping cell. Authors may paste a URL that the editor turns
 * into a link, so prefer the link target over its text.
 * @param {Element} cell table cell
 * @returns {string} trimmed cell value
 */
function readCell(cell) {
  if (!cell) return '';
  const link = cell.querySelector('a[href]');
  return (link ? link.getAttribute('href') : cell.textContent).trim();
}

/**
 * Resolve the JSON source. URLs on this site or any EDS preview/live host
 * are made relative, so the same content works on local, branch, preview,
 * live and production hosts without cross-origin requests.
 * @param {string} value authored source
 * @returns {string} URL to fetch
 */
function resolveSource(value) {
  try {
    const url = new URL(value, window.location.href);
    if (url.origin === window.location.origin || EDS_HOSTS.test(url.hostname)) {
      return `${url.pathname}${url.search}`;
    }
    return url.href;
  } catch (e) {
    return value;
  }
}

/**
 * loads and decorates the json-object-display block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = {};
  const mappings = [];

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = cells[0]?.textContent.trim();
    if (!label) return;
    const name = label.toLowerCase();

    if (RESERVED.includes(name)) {
      config[name] = readCell(cells[1]);
    } else {
      const key = cells[1]?.textContent.trim();
      if (key) mappings.push({ label, key, suffix: cells[2]?.textContent.trim() || '' });
    }
  });

  // a style row wins; otherwise keep an authored variant, else use the default style
  const hasVariant = [...block.classList].some((c) => !['block', 'json-object-display'].includes(c));
  const style = toClassName(config.style || '') || (hasVariant ? '' : DEFAULT_STYLE);
  if (style) block.classList.add(style);

  block.textContent = '';

  let data = {};
  const source = resolveSource(config.source || DEFAULT_SOURCE);
  try {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = normalize(await resp.json());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('json-object-display: failed to load', source, e);
  }

  mappings.forEach(({ label, key, suffix }) => {
    const raw = data[key];
    // skip values that are missing so the bar never shows a label without a value
    if (raw === undefined || raw === null || String(raw).trim() === '') return;

    const item = document.createElement('div');
    item.className = 'jod-item';

    const labelEl = document.createElement('span');
    labelEl.className = 'jod-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'jod-value';
    // "%" sits directly against the number; any other unit gets a space
    valueEl.textContent = `${raw}${suffix && suffix !== '%' ? ' ' : ''}${suffix}`;

    item.append(labelEl, ' ', valueEl);
    block.append(item);
  });

  // nothing to show (bad source or no matching keys): hide rather than render an empty bar
  if (!block.children.length) block.hidden = true;
}
