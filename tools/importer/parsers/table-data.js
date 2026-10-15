/* eslint-disable */
/* global WebImporter */
/**
 * Parser for table-data. Base: table.
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/our-performance/webcasts.html
 * Generated: 2026-10-14
 *
 * Instances (page-templates.json):
 *   tablecomp.tableComp table.table-comp__section     (webcasts: th header row + td rows)
 *   .text .cmp-text > table:not(.accordion *)          (dividends: plain RTE table, first td row = header)
 *
 * Source structure (validated against block-context/table-data/source.html + source-dividends.html):
 *   table > (thead|tbody) > tr (x n)                   <- iterated (table.rows)
 *     th.table-comp__section__col-title | td           -> one cell each (text, inline links kept)
 *     td[data-th] (responsive label)                   -> ignored (duplicates header)
 *   Links keep href (relative /content/dam/ made absolute on the source origin); target/class
 *   attributes dropped. Rows shorter than the widest row are padded with ''.
 *
 * Block table (table convention / blocks/table-data): first row = column headers, then data rows
 *   [h1 | h2 | h3 ...]
 *   [v1 | v2 | v3 ...]
 */
const ORIGIN = 'https://www.woolworthsgroup.com.au';
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function absHref(href) {
  const h = (href || '').trim();
  if (h.startsWith('/content/dam/')) return encodeURI(`${ORIGIN}${h}`);
  if (h.startsWith('/')) return `${ORIGIN}${h}`;
  return h;
}

function cellContent(cell, document) {
  const links = [...cell.querySelectorAll('a[href]')];
  const hasBlock = cell.querySelector('p, ul, ol, br');
  if (!links.length && !hasBlock) return clean(cell.textContent);

  // Rich cell: keep inline structure, strip presentational attributes.
  const copy = cell.cloneNode(true);
  copy.querySelectorAll('script, style, svg').forEach((n) => n.remove());
  [...copy.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (!['href', 'src', 'alt'].includes(attr.name)) el.removeAttribute(attr.name);
    });
    if (el.tagName === 'A') el.setAttribute('href', absHref(el.getAttribute('href')));
  });
  const frag = document.createElement('div');
  frag.innerHTML = copy.innerHTML.replace(/ /g, ' ').trim();
  return [...frag.childNodes];
}

export default function parse(element, { document }) {
  const table = element.tagName === 'TABLE' ? element : element.querySelector('table');
  if (!table) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Direct rows only (ignore any nested table's rows).
  const rows = [...table.querySelectorAll('tr')].filter((tr) => tr.closest('table') === table);
  const cells = [];
  rows.forEach((tr) => {
    const row = [...tr.children]
      .filter((c) => c.tagName === 'TD' || c.tagName === 'TH')
      .map((c) => cellContent(c, document));
    if (!row.length || row.every((c) => (typeof c === 'string' ? !c : !c.length))) return;
    cells.push(row);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const width = Math.max(...cells.map((r) => r.length));
  cells.forEach((r) => { while (r.length < width) r.push(''); });

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-data', cells });
  element.replaceWith(block);
}
