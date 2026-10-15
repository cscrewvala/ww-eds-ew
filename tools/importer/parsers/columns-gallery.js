/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-gallery. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/careers/refrigeration-apprenticeship-program.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content.container__body__three-column:has(.image):not(:has(.button, .contenttile, .mastercard, .heading, .text)):not(.accordion *)
 *
 * Source structure (validated against block-context/columns-gallery/source.html):
 *   > .container__body__content__cols (x3)          <- iterated (block-level div); empty cols skipped
 *       .cmp-container > .image > .cmp-image[data-cmp-src] > img.cmp-image__image
 *       optional .cmp-image__title / caption text -> caption paragraph under the image
 *
 * Block table (columns convention / blocks/columns-gallery): one row, one image per cell.
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function makeImg(imgEl, document) {
  let src = imgEl.getAttribute('src') || '';
  if (!src || src.startsWith('data:')) {
    const dm = imgEl.closest('[data-cmp-src]');
    src = dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '';
  }
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = imgEl.getAttribute('alt') || '';
  return img;
}

export default function parse(element, { document }) {
  let cols = [...element.querySelectorAll(':scope > .container__body__content__cols')];
  if (!cols.length) cols = [...element.querySelectorAll('.image')];

  const row = [];
  cols.forEach((col) => {
    const cell = [];
    col.querySelectorAll('img').forEach((imgEl) => {
      const img = makeImg(imgEl, document);
      if (img) cell.push(img);
    });
    col.querySelectorAll('.cmp-image__title, figcaption').forEach((c) => {
      if (clean(c.textContent)) {
        const p = document.createElement('p');
        p.textContent = clean(c.textContent);
        cell.push(p);
      }
    });
    if (cell.length) row.push(cell);
  });

  // Empty-block guard.
  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-gallery', cells });
  element.replaceWith(block);
}
