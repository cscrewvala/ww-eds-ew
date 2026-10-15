/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-resource. Base: cards.
 * Sources:
 *   https://www.woolworthsgroup.com.au/au/en/privacy.html (smallmediacard)
 *   https://www.woolworthsgroup.com.au/au/en/privacy/policy-documents.html (policydocument)
 * Generated: 2026-10-14
 *
 * Instances (page-templates.json, legal-page):
 *   .container__body__content.container__body__three-column:has(> .container__body__content__cols > .cmp-container > smallmediacard.small-media-card)
 *   .container__body__content__cols:has(> .cmp-container > .policydocument)
 *
 * Source shapes (validated against block-context/cards-resource/source.html + source-legal-policy-documents.html):
 *   A) smallmediacard.small-media-card (one per column)
 *        .small-media-card__body__header__img img             -> icon
 *        .small-media-card__body__header__cta__heading        -> title (plain text div)
 *        .small-media-card__body__content__note               -> description (text with <br>)
 *        .button-container a[href] > button > .cmp-button__text -> CTA
 *   B) .policydocument (several stacked in one column)
 *        .pd-container__body__icon svg                        -> decorative inline SVG, not importable -> empty icon cell
 *        .pd-container__body__frame__title .heading-container__body__text__content -> title
 *        .pd-container__body__frame__summary .cmp-text p      -> description
 *        .pd-container__body__frame__cta a[href]              -> CTA
 *   Iteration is keyed on the card wrappers (never on the a > button pair, which the
 *   structure digest flags as nested interactive content).
 *
 * Block table (blocks/cards-resource): one row per card
 *   [icon image | title (h3), description (p), CTA link (p > a)]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function descriptionNodes(container, document) {
  if (!container) return [];
  const ps = [...container.querySelectorAll('p')].filter((p) => clean(p.textContent));
  if (ps.length) {
    return ps.map((p) => {
      const np = document.createElement('p');
      np.innerHTML = p.innerHTML;
      // drop leading/trailing line breaks that only create spacing in the source
      while (np.firstChild && (np.firstChild.nodeName === 'BR' || (np.firstChild.nodeType === 3 && !clean(np.firstChild.textContent)))) np.firstChild.remove();
      while (np.lastChild && (np.lastChild.nodeName === 'BR' || (np.lastChild.nodeType === 3 && !clean(np.lastChild.textContent)))) np.lastChild.remove();
      return np;
    });
  }
  const text = clean(container.textContent);
  if (!text) return [];
  const p = document.createElement('p');
  p.textContent = text;
  return [p];
}

function ctaNode(container, document) {
  if (!container) return null;
  const src = container.querySelector('a[href]');
  if (!src) return null;
  const label = clean(src.querySelector('.cmp-button__text')?.textContent) || clean(src.textContent) || clean(src.getAttribute('title'));
  if (!label) return null;
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = src.getAttribute('href');
  a.textContent = label;
  p.append(a);
  return p;
}

function buildRow(card, document) {
  const isPolicy = card.matches('.policydocument');
  const titleEl = isPolicy
    ? card.querySelector('.pd-container__body__frame__title .heading-container__body__text__content, .pd-container__body__frame__title h1, .pd-container__body__frame__title h2')
    : card.querySelector('.small-media-card__body__header__cta__heading, [class*="__heading"]');
  const descEl = isPolicy
    ? card.querySelector('.pd-container__body__frame__summary')
    : card.querySelector('.small-media-card__body__content__note');
  const ctaEl = isPolicy
    ? card.querySelector('.pd-container__body__frame__cta')
    : card.querySelector('.small-media-card__body__content .button-container, .small-media-card__body__content');

  const img = card.querySelector('.small-media-card__body__header__img img, .pd-container__body__icon img');

  const body = [];
  const title = clean(titleEl?.textContent);
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    body.push(h3);
  }
  body.push(...descriptionNodes(descEl, document));
  const cta = ctaNode(ctaEl, document);
  if (cta) body.push(cta);

  if (!body.length && !img) return null;
  let icon = '';
  if (img) {
    const nimg = document.createElement('img');
    nimg.src = img.getAttribute('src');
    nimg.alt = img.getAttribute('alt') || title || '';
    icon = nimg;
  }
  return [icon, body.length ? body : ''];
}

export default function parse(element, { document }) {
  let cards = [...element.querySelectorAll('smallmediacard, .small-media-card:not(smallmediacard), .policydocument')];
  // de-duplicate (a .small-media-card class on the smallmediacard tag itself is matched once by the tag)
  cards = cards.filter((c, i) => cards.indexOf(c) === i && !cards.some((o) => o !== c && o.contains(c)));

  const cells = [];
  cards.forEach((card) => {
    const row = buildRow(card, document);
    if (row) cells.push(row);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-resource', cells });
  element.replaceWith(block);
}
