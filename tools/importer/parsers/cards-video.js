/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-video. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/our-performance/results-and-presentations.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content:has(> .container__body__content__cols > .cmp-container > .mastercard .card__video):not(.accordion *)
 *
 * Source structure (validated against block-context/cards-video/source.html):
 *   .container__body__content.container__body__three-column
 *     > .container__body__content__cols > .cmp-container
 *       > .mastercard (x n)                                <- iterated (block-level div wrapper)
 *         card.master-card > .card.cta-card
 *           .card__video > button.card__video__link[data-href]   -> video URL (Scene7 viewer)
 *             .card__video__img .cmp-image img.cmp-image__image  -> poster (data-cmp-src fallback)
 *           .card__title span.h5--common                         -> title (link text)
 *           .card__date p                                        -> date
 *         .video_modal (empty player shell)                      -> ignored
 *   The button is not nested in another button/anchor; we still key on the .mastercard div.
 *
 * Block table (cards convention / blocks/cards-video): 2 columns, one row per card
 *   [poster image | <p><a href=video>title</a></p> <p>date</p>]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function poster(card, document) {
  const imgEl = card.querySelector('.card__video img, .cmp-image img, img');
  let src = imgEl ? (imgEl.getAttribute('src') || '') : '';
  if (!src || src.startsWith('data:')) {
    const dm = card.querySelector('[data-cmp-src]');
    src = dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '';
  }
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
  return img;
}

export default function parse(element, { document }) {
  let cards = [...element.querySelectorAll('.mastercard')]
    .filter((c) => c.querySelector('.card__video, .card__title'));
  if (!cards.length) cards = [...element.querySelectorAll('card, .master-card')];

  const cells = [];
  cards.forEach((card) => {
    const trigger = card.querySelector('.card__video [data-href], button[data-href]')
      || card.querySelector('.card__video a[href], .card__title a[href]');
    const href = trigger ? (trigger.getAttribute('data-href') || trigger.getAttribute('href') || '').trim() : '';
    const title = clean(card.querySelector('.card__title')?.textContent);
    const date = clean(card.querySelector('.card__date')?.textContent);
    const img = poster(card, document);

    const body = [];
    if (title || href) {
      const p = document.createElement('p');
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = title || href;
        p.append(a);
      } else {
        p.textContent = title;
      }
      body.push(p);
    }
    if (date) {
      const p = document.createElement('p');
      p.textContent = date;
      body.push(p);
    }
    if (!img && !body.length) return;
    cells.push([img || '', body.length ? body : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-video', cells });
  element.replaceWith(block);
}
