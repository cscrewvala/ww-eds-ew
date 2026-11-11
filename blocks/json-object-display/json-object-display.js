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
 *
 * Universal Editor: rows and cells hand their instrumentation to the elements
 * that replace them; config rows and empty rows stay visible in the editor so
 * they remain selectable.
 */

import { toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

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
 * Read a config cell. Authors may paste a URL that the editor turns
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
 * @param {Element} el element
 * @returns {boolean} whether the Universal Editor instrumented the element
 */
const isInstrumented = (el) => [...el.attributes].some((a) => a.name.startsWith('data-aue-'));

/**
 * Create a span that takes over the instrumentation of an authored cell.
 * @param {string} className class name
 * @param {string} text text content
 * @param {Element} [cell] authored cell
 * @returns {HTMLSpanElement}
 */
function span(className, text, cell) {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  moveInstrumentation(cell, el);
  return el;
}

/**
 * loads and decorates the json-object-display block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const editing = document.documentElement.dataset.ue === 'true' || isInstrumented(block);
  const config = {};
  const rows = [...block.children].map((row) => {
    const cells = [...row.children];
    const label = cells[0]?.textContent.trim() || '';
    const reserved = RESERVED.includes(label.toLowerCase());
    if (reserved) config[label.toLowerCase()] = readCell(cells[1]);
    return {
      row,
      cells,
      label,
      reserved,
      key: cells[1]?.textContent.trim() || '',
      suffix: cells[2]?.textContent.trim() || '',
    };
  });

  // a style row wins; otherwise keep an authored variant, else use the default style
  const hasVariant = [...block.classList].some((c) => !['block', 'json-object-display'].includes(c));
  const style = toClassName(config.style || '') || (hasVariant ? '' : DEFAULT_STYLE);
  if (style) block.classList.add(style);

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

  const items = [];
  rows.forEach(({
    row, cells, label, reserved, key, suffix,
  }) => {
    const raw = data[key];
    const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== '';
    const mapping = Boolean(label && key && !reserved);
    // on the site only mappings with a value are shown; in the editor every row stays
    // selectable (config rows, empty rows and missing values included)
    if (!editing && !(mapping && hasValue)) return;

    const item = document.createElement('div');
    item.className = mapping ? 'jod-item' : 'jod-config';
    moveInstrumentation(row, item);
    item.append(span('jod-label', label, cells[0]));

    if (mapping) {
      item.append(' ', span('jod-value', hasValue ? String(raw).trim() : '', cells[1]));
      // "%" sits directly against the number; any other unit gets a space
      if (cells[2]) item.append(suffix && suffix !== '%' ? ' ' : '', span('jod-suffix', suffix, cells[2]));
    } else {
      cells.slice(1).forEach((cell) => item.append(' ', span('jod-config-value', readCell(cell), cell)));
    }
    items.push(item);
  });

  block.replaceChildren(...items);

  // nothing to show (bad source or no matching keys): hide rather than render an empty bar
  if (!editing && !items.length) block.hidden = true;
}
