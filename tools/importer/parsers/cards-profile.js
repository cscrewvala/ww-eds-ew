/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-profile. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/who-we-are/our-leadership-team/board-of-directors.html
 * Generated: 2026-10-14
 *
 * Instances (page-templates.json):
 *   .colscontainer:has(.leadershipprofile):not(:has(.text))                         (whole container)
 *   .colscontainer:has(.leadershipprofile):has(.text) .container__body__content:has(.leadershipprofile)
 *
 * Source structure (validated against block-context/cards-profile/source.html,
 * source-board-neds.html, source-management-board.html):
 *   ... .leadershipprofile > .leadership-profile
 *     > .leadership-profile__item (one per person)    <- iterated (block-level div)
 *         img.leadership-profile__image               -> cell 1 photo (generic "Leader 1" alt -> name)
 *         h3.leadership-profile__name                 -> h3 name
 *         p.leadership-profile__role                  -> role paragraph
 *         p.leadership-profile__brand                 -> appointment note paragraph
 *         a.leadership-profile__link                  -> link-only "Learn more" paragraph
 *   container__body__divider-graphic imgs             -> ignored (outside the items)
 *
 * Block table (cards convention / blocks/cards-profile): one row per person
 *   [photo | h3 name, role p, appointed p, link p]
 */
const ORIGIN = 'https://www.woolworthsgroup.com.au';
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function abs(src) {
  if (!src) return '';
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  return src.startsWith('/') ? `${ORIGIN}${src}` : src;
}

function para(text, document, tag = 'p') {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('.leadership-profile__item')];
  if (!items.length) items = [...element.querySelectorAll('.leadership-profile')];

  const cells = [];
  items.forEach((item) => {
    const name = clean(item.querySelector('.leadership-profile__name, h2, h3, h4')?.textContent);
    const imgEl = item.querySelector('img.leadership-profile__image') || item.querySelector('img');
    let img = '';
    const src = imgEl ? abs(imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : '';
    if (src && !src.startsWith('data:')) {
      img = document.createElement('img');
      img.src = src;
      const alt = imgEl.getAttribute('alt') || '';
      img.alt = /^leader\s*\d*$/i.test(alt) ? name : alt;
    }

    const body = [];
    if (name) body.push(para(name, document, 'h3'));
    const role = clean(item.querySelector('.leadership-profile__role')?.textContent);
    if (role) body.push(para(role, document));
    const note = clean(item.querySelector('.leadership-profile__brand')?.textContent);
    if (note) body.push(para(note, document));
    const a = item.querySelector('a.leadership-profile__link[href]') || item.querySelector('a[href]');
    if (a) {
      const p = document.createElement('p');
      const link = document.createElement('a');
      link.href = a.getAttribute('href');
      link.textContent = clean(a.textContent) || 'Learn more';
      p.append(link);
      body.push(p);
    }

    if (!img && !body.length) return;
    cells.push([img, body.length ? body : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-profile', cells });
  element.replaceWith(block);
}
