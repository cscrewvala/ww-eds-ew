/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-calendar. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/shareholding-information/shareholder-calendar.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .cmp-container:has(> .mastercardlist > mastercardlist.calendar-list)
 *
 * Source structure (validated against block-context/cards-calendar/source.html):
 *   .cmp-container
 *     .separator (spacers)                                           -> ignored
 *     .mastercardlist (x n)                                          <- iterated (block-level div wrapper)
 *       mastercardlist.calendar-list > .master-card-list-container__body
 *         .__content__title span (title attr / text)                 -> event title
 *         .__content__description                                    -> details (usually empty)
 *         .__content__info__date                                     -> date (dd/mm/yyyy)
 *         .__content__info__tag .tag-container__body__text           -> details (usually empty)
 *         .__content__cta / .__calendar__cta  a > button "Add"       -> ignored (block builds .ics)
 *         .__calendar__content__item__{date,title}                   -> fallback for date/title
 *   structure.json warns: button.button / __calendar__cta__button are nested in <a> (invalid,
 *   flattened on re-parse). Iteration is keyed on the .mastercardlist div; the Add buttons
 *   are never read, so the flattening cannot change the item count or content.
 *
 * Block table (blocks/cards-calendar): one row per event
 *   [date | <p>title</p> <p>details</p>...]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function para(text, document) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

export default function parse(element, { document }) {
  let items = [...element.querySelectorAll('.mastercardlist')];
  if (!items.length) items = [...element.querySelectorAll('.master-card-list-container__body')];

  const cells = [];
  items.forEach((item) => {
    const titleEl = item.querySelector('.master-card-list-container__body__content__title')
      || item.querySelector('.master-card-list-container__body__calendar__content__item__title');
    const titleSpan = titleEl && titleEl.querySelector('[title]');
    const title = clean(titleEl && titleEl.textContent) || clean(titleSpan && titleSpan.getAttribute('title'));
    const date = clean(item.querySelector('.master-card-list-container__body__content__info__date')?.textContent)
      || clean(item.querySelector('.master-card-list-container__body__calendar__content__item__date')?.textContent);

    const details = [];
    const desc = item.querySelector('.master-card-list-container__body__content__description');
    if (desc && clean(desc.textContent)) {
      const ps = [...desc.querySelectorAll('p')].filter((p) => clean(p.textContent));
      if (ps.length) ps.forEach((p) => details.push(para(clean(p.textContent), document)));
      else details.push(para(clean(desc.textContent), document));
    }
    const tag = clean(item.querySelector('.tag-container__body__text')?.textContent);
    if (tag) details.push(para(tag, document));

    if (!title && !date) return;
    const body = [];
    if (title) body.push(para(title, document));
    body.push(...details);
    cells.push([date || '', body.length ? body : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-calendar', cells });
  element.replaceWith(block);
}
