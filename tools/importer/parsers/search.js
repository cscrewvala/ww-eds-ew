/* eslint-disable */
/* global WebImporter */
/**
 * Parser for search (dynamic block, Block Collection "search" convention + WWG extensions).
 *
 * Source: .wwgsearch > .cmp-search (search.html). Results are rendered client-side from an AEM
 * JSON servlet, so they are NOT content: the component is replaced by a search config table and
 * EDS renders results from the site query index at runtime.
 *
 * Block table (first row after the block name follows the Block Collection convention):
 *   /query-index.json            single cell: the query index to search
 *   <label> | <path prefix>      one row per `.tag-filters button` (source order; first = default),
 *                                value attribute with the /content/wwg prefix stripped
 *   Page size | <data-max-item>  (source: 10)
 */
const INDEX = '/query-index.json';
const clean = (t) => (t || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function toPath(value) {
  if (!value) return '';
  let path;
  try {
    path = new URL(value, 'https://www.woolworthsgroup.com.au').pathname;
  } catch (e) {
    return '';
  }
  path = path.replace(/^\/content\/wwg(?=\/)/, '').replace(/\.html?$/i, '').replace(/(.)\/$/, '$1');
  return path.startsWith('/') ? path : '';
}

export default function parse(element, { document }) {
  const cells = [[INDEX]];
  const seen = new Set();
  [...element.querySelectorAll('.tag-filters button')].forEach((button) => {
    const label = clean(button.textContent);
    const path = toPath(button.getAttribute('value'));
    if (!label || !path || seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    cells.push([label, path]);
  });

  const container = element.querySelector('[data-max-item]');
  const max = container && container.getAttribute('data-max-item');
  cells.push(['Page size', max && /^\d+$/.test(max) ? max : '10']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'search', cells });
  element.replaceWith(block);
}
