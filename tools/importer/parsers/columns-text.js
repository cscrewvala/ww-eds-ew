/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-text. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/contact-us.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content.two-50-50:has(.mastercard):not(:has(.card__primary-img img, .image, .h3-secondary, .contactpanel, .wwgvideo))
 *
 * Source structure (validated against block-context/columns-text/source.html + source-row-2.html):
 *   > .container__body__content__cols (x2)            <- iterated (block-level div), one cell each
 *       .mastercard card .card
 *         .card__title span                            -> h3
 *         .card__description > p / ul / ol            -> rich text (empty + nbsp-only <p> dropped,
 *                                                         inline links kept, attributes stripped)
 *         .card__date, .card__cta a (optional)         -> paragraph / link
 *       .video_modal                                   -> dropped
 *
 * Legal pages (block-context/columns-text/source-legal-usage.html, e.g. /privacy/usage.html):
 *   .container__body__content.container__body__three-column with 3 text-only mastercards
 *   (.card__title span.h5--common + .card__description) -> same extraction, 3 cells.
 *
 * Block table (columns convention / blocks/columns-text): one row, one cell per text card
 *   [h3, rich text | h3, rich text]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const KEEP_ATTRS = ['href', 'src', 'alt'];

function stripAttrs(root) {
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => { if (!KEEP_ATTRS.includes(attr.name)) el.removeAttribute(attr.name); });
  });
}

function cardCell(card, document) {
  const out = [];
  const title = clean(card.querySelector('.card__title')?.textContent);
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    out.push(h3);
  }
  const desc = card.querySelector('.card__description');
  if (desc) {
    [...desc.children].forEach((child) => {
      if (!clean(child.textContent) && !child.querySelector('img')) return;
      const copy = child.cloneNode(true);
      copy.querySelectorAll('script, style, svg').forEach((n) => n.remove());
      stripAttrs(copy);
      out.push(copy);
    });
    if (!desc.children.length && clean(desc.textContent)) {
      const p = document.createElement('p');
      p.textContent = clean(desc.textContent);
      out.push(p);
    }
  }
  const date = clean(card.querySelector('.card__date')?.textContent);
  if (date) {
    const p = document.createElement('p');
    p.textContent = date;
    out.push(p);
  }
  card.querySelectorAll('.card__cta a[href], .card__link a[href]').forEach((a) => {
    const text = clean(a.textContent) || clean(a.getAttribute('title'));
    if (!text) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    p.append(link);
    out.push(p);
  });
  return out;
}

export default function parse(element, { document }) {
  let cols = [...element.querySelectorAll(':scope > .container__body__content__cols')];
  if (!cols.length) cols = [...element.querySelectorAll('.mastercard')];

  const row = [];
  cols.forEach((col) => {
    const cell = [];
    col.querySelectorAll('.card').forEach((card) => cell.push(...cardCell(card, document)));
    if (cell.length) row.push(cell);
  });

  // Empty-block guard.
  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-text', cells });
  element.replaceWith(block);
}
