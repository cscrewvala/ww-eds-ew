/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-documents. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/our-performance/reports.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .colscontainer:has(> .container__body > .container__body__content > .container__body__content__cols > .cmp-container > .linklist)
 *
 * Source structure (validated against block-context/cards-documents/source.html + source-data-and-metrics.html):
 *   .colscontainer > .container__body
 *     .top-cnt (heading / intro, usually empty)                  -> default content before block
 *     .container__body__divider-graphic (decorative imgs)        -> ignored
 *     .container__body__content.container__body__four-column
 *       > .container__body__content__cols > .linklist linklist
 *         .link-list__section__lists__item (x n)                 <- iterated, one group each
 *           .link--heading p.link--title                         -> cell 1 group title ("2026")
 *           ul.ul-items__list > li[data-type=pdf|content]
 *             button.link-button[data-href]                      -> document link (PDF / CSV)
 *             (or a[href] when the list renders anchors)
 *             span.tooltiptext                                   -> duplicate label, ignored
 *   Buttons are not nested in anchors here; each li holds exactly one button.
 *   DAM document hrefs are made absolute on the source origin (spaces URI-encoded) so
 *   the PDF links keep working after migration.
 *
 * Block table (cards convention / blocks/cards-documents): one row per group
 *   [title | ul of document links]
 */
const ORIGIN = 'https://www.woolworthsgroup.com.au';
// Authored hrefs are often already percent-encoded (%20, %3A): keep valid %XX escapes and
// encodeURI only the text between them, so they are not double-encoded (%2520 -> 404).
const encodeOnce = (s) => String(s).split(/(%[0-9a-f]{2})/i)
  .map((part, i) => (i % 2 ? part : encodeURI(part))).join('');
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function docHref(href) {
  const h = (href || '').trim();
  if (!h) return '';
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith('//')) return h;
  if (h.startsWith('/content/dam/')) return encodeOnce(`${ORIGIN}${h}`);
  return h;
}

export default function parse(element, { document }) {
  const leading = [];
  const top = element.querySelector('.top-cnt');
  if (top) {
    top.querySelectorAll('.heading-container__body__text__content, .cmp-title h1, .cmp-title h2').forEach((h) => {
      if (clean(h.textContent)) {
        const h2 = document.createElement('h2');
        h2.textContent = clean(h.textContent);
        leading.push(h2);
      }
    });
    top.querySelectorAll('.cmp-text p').forEach((p) => {
      if (clean(p.textContent)) {
        const np = document.createElement('p');
        np.textContent = clean(p.textContent);
        leading.push(np);
      }
    });
  }

  let groups = [...element.querySelectorAll('.link-list__section__lists__item')];
  if (!groups.length) groups = [...element.querySelectorAll('linklist, .linkList')];

  const cells = [];
  groups.forEach((group) => {
    const title = clean(group.querySelector('.link--title, .link--heading, .acc--title')?.textContent);
    const ul = document.createElement('ul');
    const lis = [...group.querySelectorAll('li')];
    const sources = lis.length ? lis : [group];
    sources.forEach((li) => {
      const triggers = [...li.querySelectorAll('button[data-href], a[href]')]
        .filter((t) => !(t.tagName === 'BUTTON' && t.closest('a[href]')));
      triggers.forEach((t) => {
        const href = docHref(t.getAttribute('data-href') || t.getAttribute('href'));
        const text = clean(t.textContent) || clean(li.querySelector('.tooltiptext')?.textContent);
        if (!href || !text) return;
        const item = document.createElement('li');
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        item.append(a);
        ul.append(item);
      });
    });
    if (!title && !ul.children.length) return;
    cells.push([title || '', ul.children.length ? ul : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-documents', cells });
  element.before(...leading);
  element.replaceWith(block);
}
