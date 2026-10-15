/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-program. Base: accordion.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/human-rights.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .accordion.panelcontainer:not(.accordion .accordion)
 *
 * Source structure (validated against block-context/accordion-program/source*.html and the
 * live climate-and-nature / human-rights panels):
 *   .accordion.panelcontainer > .cmp-accordion
 *     > .cmp-accordion__item (x n)                         <- iterated (block-level div)
 *         .cmp-accordion__header .cmp-accordion__title     -> cell 1 label
 *         .cmp-accordion__panel                            -> cell 2 rich body, walked in order:
 *           .cmp-text children (p, ul/ol, h5, table, links) -> kept as-is (attributes stripped)
 *           .heading / .cmp-title (h1 + svg icon)          -> h4
 *           .cmp-image img (or data-cmp-src)               -> img
 *           .mastercard card (video/image card rows)        -> img + linked title + date
 *           .contenttile .cmp-teaser (--md copy only)      -> img + linked title + description
 *           nested .cmp-accordion__item                    -> h4 title + its body
 *           standalone a.button / .button a                -> p > a
 *           skipped: .container__body__divider-graphic, .video_modal, scripts, svg, --sm tiles
 *
 * Investor accordions (instance .accordion.accordion-core:not(.accordion .accordion); validated
 * against block-context/accordion-program/source-asx.html and the live AGM / archive /
 * five-year-summary / debt-investors / dividends / shareholder-faqs pages):
 *   panel > .cmp-container > .linklist (x n) > ... .link-list__section__lists__item
 *     p.link--title (month, e.g. "September"; may be empty)  -> h4
 *     li > button.link-button[data-href]                       -> ul > li > a[href]
 *       /content/dam/ hrefs made absolute on https://www.woolworthsgroup.com.au
 *   .cmp-text tables (debt-investors) are kept as nested tables by richText().
 *   Standalone button[data-href] outside link lists -> p > a.
 *
 * Block table (accordion convention / blocks/accordion-program): 2 columns,
 *   one row per item: [label | rich body]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const SKIP = '.container__body__divider-graphic, .video_modal, script, style, noscript, svg, .contenttile--sm, .cmp-accordion__icon';

function makeImg(node, document) {
  const imgEl = node.tagName === 'IMG' ? node : node.querySelector('img');
  let src = imgEl ? imgEl.getAttribute('src') || '' : '';
  if (!src || src.startsWith('data:')) {
    const dm = node.closest('[data-cmp-src]') || node.querySelector('[data-cmp-src]');
    src = dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '';
  }
  if (!src || src.startsWith('data:')) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = imgEl ? imgEl.getAttribute('alt') || '' : '';
  return img;
}

function linkP(href, text, document, strong) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (strong) {
    const s = document.createElement('strong');
    s.append(a);
    p.append(s);
  } else {
    p.append(a);
  }
  return p;
}

function textP(text, document, tag = 'p') {
  const p = document.createElement(tag);
  p.textContent = text;
  return p;
}

function stripAttrs(root) {
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (!['href', 'src', 'alt', 'colspan', 'rowspan', 'title'].includes(attr.name)) el.removeAttribute(attr.name);
    });
  });
}

function richText(cmpText, document) {
  const out = [];
  [...cmpText.children].forEach((child) => {
    if (child.matches(SKIP)) return;
    const hasMedia = child.querySelector('img, table');
    if (!clean(child.textContent) && !hasMedia && child.tagName !== 'TABLE') return;
    // <p><span class="h5">Sub heading</span></p> -> <h5>
    const only = child.tagName === 'P' && child.children.length === 1 ? child.firstElementChild : null;
    const hClass = only && only.tagName === 'SPAN' && clean(only.textContent) === clean(child.textContent)
      ? (only.className.match(/\bh([2-6])\b/) || [])[1] : null;
    if (hClass) {
      out.push(textP(clean(child.textContent), document, `h${Math.max(4, Number(hClass))}`));
      return;
    }
    const copy = child.cloneNode(true);
    copy.querySelectorAll(SKIP).forEach((n) => n.remove());
    stripAttrs(copy);
    out.push(copy);
  });
  return out;
}

function cardContent(card, document) {
  const out = [];
  const img = card.querySelector('.cmp-image, img') ? makeImg(card.querySelector('.cmp-image') || card.querySelector('img'), document) : null;
  if (img) out.push(img);
  const titleEl = card.querySelector('.card__title, .cmp-teaser__content__title, .cmp-teaser__title, h2, h3, h4, h5');
  const title = clean(titleEl && titleEl.textContent);
  const anchor = card.querySelector('a[href]');
  const videoBtn = card.querySelector('button[data-href]');
  const href = anchor ? anchor.getAttribute('href') : (videoBtn ? videoBtn.getAttribute('data-href') : '');
  if (title && href) out.push(linkP(href, title, document, true));
  else if (title) {
    const p = document.createElement('p');
    const s = document.createElement('strong');
    s.textContent = title;
    p.append(s);
    out.push(p);
  } else if (href) out.push(linkP(href, href, document));
  card.querySelectorAll('.card__date, .card__description, .cmp-teaser__content__description').forEach((d) => {
    if (clean(d.textContent)) out.push(textP(clean(d.textContent), document));
  });
  return out;
}

const ORIGIN = 'https://www.woolworthsgroup.com.au';

// Link-list document hrefs: /content/dam/ paths made absolute on the source origin
// (spaces URI-encoded) so the PDFs keep resolving after migration.
function docHref(href) {
  const h = (href || '').trim();
  if (!h) return '';
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith('//')) return h;
  if (h.startsWith('/content/dam/')) {
    let raw = h;
    try { raw = decodeURI(h); } catch (e) { /* keep as authored */ }
    return encodeURI(`${ORIGIN}${raw}`);
  }
  return h;
}

/**
 * Investor link lists (ASX announcements, AGM, archives, five-year summary):
 *   .linklist > linklist.linkList ... .link-list__section__lists__item (x n)
 *     .link--heading p.link--title     -> h4 month / group sub-heading (often empty)
 *     ul.ul-items__list > li
 *       button.link-button[data-href]  -> li > a[href] (the li is the unit, never the button)
 *       (or a[href] when rendered as anchors); span.tooltiptext duplicate label ignored
 */
function linkList(list, document, out) {
  let groups = [...list.querySelectorAll('.link-list__section__lists__item')];
  if (!groups.length) groups = [list];
  groups.forEach((group) => {
    const title = clean(group.querySelector('.link--title, .link--heading')?.textContent);
    const ul = document.createElement('ul');
    const lis = [...group.querySelectorAll('li')];
    (lis.length ? lis : [group]).forEach((li) => {
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
    if (title) out.push(textP(title, document, 'h4'));
    if (ul.children.length) out.push(ul);
  });
}

function walk(node, document, out) {
  [...node.children].forEach((child) => {
    if (child.matches(SKIP)) return;
    if (child.matches('.linklist, linklist, .linkList')) {
      linkList(child, document, out);
    } else if (child.tagName === 'BUTTON' && child.hasAttribute('data-href') && !child.closest('a[href]')) {
      // standalone document button outside a link list
      const text = clean(child.textContent);
      const href = docHref(child.getAttribute('data-href'));
      if (text && href) out.push(linkP(href, text, document));
    } else if (child.classList.contains('cmp-text')) {
      out.push(...richText(child, document));
    } else if (child.classList.contains('cmp-title') || child.classList.contains('heading-container__body')) {
      const t = clean((child.querySelector('.heading-container__body__text__content') || child).textContent);
      if (t) out.push(textP(t, document, 'h4'));
    } else if (child.matches('card, .master-card') || child.classList.contains('cmp-teaser')) {
      out.push(...cardContent(child, document));
    } else if (child.classList.contains('cmp-image') || child.tagName === 'IMG') {
      const img = makeImg(child, document);
      if (img) out.push(img);
    } else if (child.classList.contains('cmp-accordion__item')) {
      const t = clean(child.querySelector('.cmp-accordion__title')?.textContent);
      if (t) out.push(textP(t, document, 'h4'));
      const panel = child.querySelector('.cmp-accordion__panel');
      if (panel) walk(panel, document, out);
    } else if (child.tagName === 'A' && child.getAttribute('href')) {
      const text = clean(child.textContent) || clean(child.nextElementSibling?.textContent);
      if (text) out.push(linkP(child.getAttribute('href'), text, document));
    } else if (child.tagName === 'TABLE') {
      const copy = child.cloneNode(true);
      stripAttrs(copy);
      out.push(copy);
    } else if (child.tagName === 'BUTTON' && child.previousElementSibling?.tagName === 'A') {
      // flattened a>button pair: text already taken with the anchor
    } else {
      walk(child, document, out);
    }
  });
}

export default function parse(element, { document }) {
  const acc = element.querySelector('.cmp-accordion') || element;
  let items = [...acc.querySelectorAll(':scope > .cmp-accordion__item')];
  if (!items.length) {
    items = [...element.querySelectorAll('.cmp-accordion__item')]
      .filter((it) => !it.parentElement.closest('.cmp-accordion__item'));
  }

  const cells = [];
  items.forEach((item) => {
    const titleEl = item.querySelector('.cmp-accordion__title') || item.querySelector('.cmp-accordion__header');
    const label = clean(titleEl && titleEl.textContent);
    const panel = item.querySelector(':scope > .cmp-accordion__panel') || item.querySelector('.cmp-accordion__panel');
    const body = [];
    if (panel) walk(panel, document, body);
    if (!label && !body.length) return;
    cells.push([label ? textP(label, document) : '', body.length ? body : '']);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-program', cells });
  element.replaceWith(block);
}
