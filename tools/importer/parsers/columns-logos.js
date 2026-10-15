/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-logos. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content.container__body__six-column:has(.image):not(.accordion *)
 *
 * Source structure (validated against block-context/columns-logos/source.html + source-human-rights.html):
 *   .container__body__six-column
 *     > .container__body__content__cols (x6)   <- iterated (block-level div); empty cols skipped
 *       .cmp-container > .image > .cmp-image[data-cmp-src] > img.cmp-image__image
 *       optional wrapping <a href> (kept as a linked logo)
 *       optional text (.cmp-text / caption) -> appended under the logo
 *
 * Block table (columns convention / blocks/columns-logos): one row, one logo per cell.
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
      if (!img) return;
      const link = imgEl.closest('a[href]');
      if (link && col.contains(link)) {
        const a = document.createElement('a');
        a.href = link.getAttribute('href');
        a.append(img);
        cell.push(a);
      } else {
        cell.push(img);
      }
    });
    col.querySelectorAll('.cmp-text p, .cmp-image__title').forEach((t) => {
      if (clean(t.textContent)) {
        const p = document.createElement('p');
        p.textContent = clean(t.textContent);
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
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-logos', cells });
  element.replaceWith(block);
}
