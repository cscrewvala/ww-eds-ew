/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-panel. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/contact-us.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .container__body__content.two-33-66:has(.mastercard):has(.image)
 *
 * Source structure (validated against block-context/columns-panel/source.html):
 *   > .container__body__content__cols (x2)          <- the two columns (block-level divs)
 *     text column: .mastercard card .card (x n)      <- iterated, one panel each
 *        .card__title span     -> h3 (starts a panel)
 *        .card__description    -> p / ul (empty p dropped, links kept)
 *        .separator            -> dropped
 *     media column: .image .cmp-image img            -> image (camera-filename alt text dropped)
 *
 * Block table (columns convention / blocks/columns-panel): one row, two cells, source order
 *   [h3 + text, h3 + text, ... | img]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function stripAttrs(root) {
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => { if (!['href', 'src', 'alt'].includes(attr.name)) el.removeAttribute(attr.name); });
  });
}

function makeImg(imgEl, document) {
  if (!imgEl) return null;
  let src = imgEl.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) {
    const dm = imgEl.closest('[data-cmp-src]');
    src = dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '';
  }
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  const alt = imgEl.getAttribute('alt') || '';
  img.alt = /\.(jpe?g|png|gif|webp)$/i.test(alt) || /^untitled design/i.test(alt) ? '' : alt;
  return img;
}

function panels(col, document) {
  const out = [];
  col.querySelectorAll('.card').forEach((card) => {
    const title = clean(card.querySelector('.card__title')?.textContent);
    if (title) {
      const h3 = document.createElement('h3');
      h3.textContent = title;
      out.push(h3);
    }
    const desc = card.querySelector('.card__description');
    if (!desc) return;
    [...desc.children].forEach((child) => {
      if (!clean(child.textContent)) return;
      const copy = child.cloneNode(true);
      copy.querySelectorAll('script, style, svg').forEach((n) => n.remove());
      stripAttrs(copy);
      out.push(copy);
    });
  });
  // plain text components in the text column (defensive)
  col.querySelectorAll('.cmp-text').forEach((t) => {
    [...t.children].forEach((child) => {
      if (!clean(child.textContent)) return;
      const copy = child.cloneNode(true);
      stripAttrs(copy);
      out.push(copy);
    });
  });
  return out;
}

export default function parse(element, { document }) {
  const cols = [...element.querySelectorAll(':scope > .container__body__content__cols')];
  const row = [];
  cols.forEach((col) => {
    const cell = [];
    if (col.querySelector('.mastercard, .cmp-text')) cell.push(...panels(col, document));
    col.querySelectorAll('.image img').forEach((imgEl) => {
      const img = makeImg(imgEl, document);
      if (img) cell.push(img);
    });
    if (cell.length) row.push(cell);
  });

  // Empty-block guard.
  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-panel', cells });
  element.replaceWith(block);
}
