/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-media. Base: columns.
 * Sources:
 *   https://www.woolworthsgroup.com.au/au/en/privacy/collection.html
 *   https://www.woolworthsgroup.com.au/au/en/privacy/usage.html
 *   https://www.woolworthsgroup.com.au/au/en/our-impact/reconciliation/our-artwork.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json, legal-page):
 *   .container__body__content.container__body__two-column.two-50-50:has(.image):has(.text)
 *
 * Source structure (validated against block-context/columns-media/source.html,
 * source-legal-usage.html, source-legal-artwork.html):
 *   > .container__body__content__cols (x2)              <- iterated (block-level div), one cell each, authored order
 *       text column (possibly nested in .container.responsivegrid > .cmp-container):
 *         .heading.title.<hN...> .heading-container__body__text__content -> hN (level from wrapper class, default h2)
 *         .text .cmp-text > p / ul / ol                  -> rich text (empty/nbsp-only dropped, inline links kept)
 *         .button-container a[href] (optional)           -> p > a
 *         .separator                                     -> dropped
 *       image column: .image .cmp-image img              -> image
 *
 * Block table (blocks/columns-media): one row per two-column container
 *   [text | image]  (or [image | text] when the image column is authored first)
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const KEEP_ATTRS = ['href', 'src', 'alt'];

function stripAttrs(root) {
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => { if (!KEEP_ATTRS.includes(attr.name)) el.removeAttribute(attr.name); });
  });
}

function trimBreaks(el) {
  const blank = (n) => n && (n.nodeName === 'BR' || (n.nodeType === 3 && !clean(n.textContent)));
  while (blank(el.firstChild)) el.firstChild.remove();
  while (blank(el.lastChild)) el.lastChild.remove();
}

function headingLevel(node) {
  const wrapper = node.closest('.heading, .title');
  const token = wrapper && [...wrapper.classList].find((c) => /^h[1-6](--|$)/.test(c));
  const level = token ? Number(token[1]) : 2;
  return Math.min(Math.max(level, 2), 6);
}

function imageNode(img, document) {
  const n = document.createElement('img');
  n.src = img.getAttribute('src') || img.getAttribute('data-src') || '';
  n.alt = img.getAttribute('alt') || '';
  return n;
}

function columnCell(col, document) {
  const out = [];
  const nodes = col.querySelectorAll('.heading-container__body__text__content, .cmp-text > *, .button-container a[href], .image img, .cmp-image img');
  const seen = new Set();
  nodes.forEach((node) => {
    if (seen.has(node)) return;
    seen.add(node);
    if (node.matches('.heading-container__body__text__content')) {
      const text = clean(node.textContent);
      if (!text) return;
      const h = document.createElement(`h${headingLevel(node)}`);
      h.textContent = text;
      out.push(h);
      return;
    }
    if (node.tagName === 'IMG') {
      if (node.getAttribute('src') || node.getAttribute('data-src')) out.push(imageNode(node, document));
      return;
    }
    if (node.tagName === 'A') {
      const text = clean(node.querySelector('.cmp-button__text')?.textContent) || clean(node.textContent);
      if (!text) return;
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = node.getAttribute('href');
      a.textContent = text;
      p.append(a);
      out.push(p);
      return;
    }
    // rich text child of .cmp-text
    if (!clean(node.textContent) && !node.querySelector('img')) return;
    const copy = node.cloneNode(true);
    copy.querySelectorAll('script, style, svg').forEach((n) => n.remove());
    stripAttrs(copy);
    if (copy.tagName === 'P') trimBreaks(copy);
    out.push(copy);
  });
  return out;
}

export default function parse(element, { document }) {
  let cols = [...element.querySelectorAll(':scope > .container__body__content__cols')];
  if (!cols.length) cols = [...element.querySelectorAll(':scope > div')];

  const row = [];
  cols.forEach((col) => {
    const cell = columnCell(col, document);
    if (cell.length) row.push(cell);
  });

  // Empty-block guard.
  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-media', cells });
  element.replaceWith(block);
}
