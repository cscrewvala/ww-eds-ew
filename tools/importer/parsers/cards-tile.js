/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-tile. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/ (homepage: "ASX announcements", "Find out more")
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .container__body__three-column:has(.contenttile)
 *
 * Source structure (validated against block-context/cards-tile/source.html + instances/01.html):
 *   .container__body__three-column > .container__body__content__cols x3 > .cmp-container
 *     .contenttile.teaser                                   <- iterated (one per tile)
 *       > div > contenttile.cmp-teaser.contenttile--md      <- the copy that is read
 *         a.cmp-teaser__content__link--card[href]           -> link href (PDF or page)
 *           .cmp-teaser__image img                          -> image cell
 *           .cmp-teaser__content
 *             p.cmp-teaser__content__title                  -> h3
 *             .cmp-teaser__content__description / plain p   -> description (optional)
 *             span.cmp-teaser__content__link                -> link text ("Click here"/"Learn more")
 *       > div > contenttile.contenttile--sm                 -> mobile duplicate, ignored
 *
 * Iteration is keyed on the block-level .contenttile.teaser wrapper, never on the <a> card
 * wrappers, so html2md inline-merging of adjacent anchors cannot collapse tiles.
 *
 * Content-page variant: mastercard rows (block-context/cards-tile/source-mastercard.html),
 * matched by `.container__body__content:has(.mastercard .card__primary-img img)...`:
 *   > .container__body__content__cols > .mastercard > card.master-card > .card   <- iterated
 *       .card__primary-img .cmp-image img                -> image cell
 *       .card__title button.link-button[data-href]        -> linked h3 title (AEM path
 *           /content/wwg/au/en/... mapped to the public /au/en/... URL); or .card__title text
 *       .card__description p (empty / nbsp-only dropped)  -> description
 *       .card__cta a[href] / a[href] (optional)           -> link p
 *   Empty columns are skipped. Used only when the element has no .contenttile.teaser, so the
 *   homepage/newsroom content-tile output is unchanged.
 * Legal pages (block-context/cards-tile/source-legal-sharing.html, e.g. /privacy/sharing.html):
 *   .container__body__four-column (or three-column) of mastercards with .card__primary-img,
 *   plain-text .card__title span (no link trigger) -> unlinked h3, and descriptions whose
 *   paragraphs mix text with inline <a> links -> paragraph kept with its inline links
 *   (attributes other than href stripped, hrefs mapped via publicHref).
 * Content-tile video tiles (button[data-href], no anchor) fall back to the data-href
 * (made absolute) for the link; tiles with an anchor are unaffected.
 *
 * Variant `cols-2` when the source container is two-column (.two-50-50 /
 * .container__body__two-column), e.g. board-of-directors "Find out more", refrigeration
 * "Career Spotlight".
 *
 * Block table (cards: 2 columns), one row per tile in document order:
 *   [image | h3 title, description p (optional), link p]
 * Hrefs are kept as authored (relative /content/dam/... PDFs are made absolute by a transformer).
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const ORIGIN = 'https://www.woolworthsgroup.com.au';
// Authored hrefs are often already percent-encoded (%20, %3A): keep valid %XX escapes and
// encodeURI only the text between them, so they are not double-encoded (%2520 -> 404).
const encodeOnce = (s) => String(s).split(/(%[0-9a-f]{2})/i)
  .map((part, i) => (i % 2 ? part : encodeURI(part))).join('');

// AEM author paths (/content/wwg/au/en/...) -> public paths (/au/en/...); DAM files absolute.
function publicHref(href) {
  const h = (href || '').trim();
  if (!h) return '';
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith('//')) return h;
  if (h.startsWith('/content/wwg/')) return h.replace(/^\/content\/wwg/, '');
  if (h.startsWith('/content/dam/')) return encodeOnce(`${ORIGIN}${h}`);
  return h;
}

function mastercardRow(card, document) {
  const imgEl = [...card.querySelectorAll('.card__primary-img img, img')]
    .find((img) => (img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith('data:'));
  const dm = card.querySelector('[data-cmp-src]');
  const src = imgEl ? imgEl.getAttribute('src') : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  let imgCell = '';
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    imgCell = img;
  }
  const titleWrap = card.querySelector('.card__title');
  const title = clean(titleWrap && titleWrap.textContent);
  const titleTrigger = titleWrap && titleWrap.querySelector('[data-href], a[href]');
  const titleHref = titleTrigger ? publicHref(titleTrigger.getAttribute('data-href') || titleTrigger.getAttribute('href')) : '';

  const body = [];
  if (title) {
    const h3 = document.createElement('h3');
    if (titleHref) {
      const a = document.createElement('a');
      a.href = titleHref;
      a.textContent = title;
      h3.append(a);
    } else {
      h3.textContent = title;
    }
    body.push(h3);
  }
  const desc = card.querySelector('.card__description');
  if (desc) {
    [...desc.children].filter((c) => clean(c.textContent)).forEach((c) => {
      if (c.tagName === 'UL' || c.tagName === 'OL') {
        const list = document.createElement(c.tagName.toLowerCase());
        c.querySelectorAll('li').forEach((li) => {
          const item = document.createElement('li');
          item.textContent = clean(li.textContent);
          list.append(item);
        });
        body.push(list);
        return;
      }
      const p = document.createElement('p');
      const links = [...c.querySelectorAll('a[href]')];
      if (links.length === 1 && clean(links[0].textContent) === clean(c.textContent)) {
        const a = document.createElement('a');
        a.href = publicHref(links[0].getAttribute('href'));
        a.textContent = clean(c.textContent);
        p.append(a);
      } else if (links.length) {
        // keep inline links inside running text
        const copy = c.cloneNode(true);
        copy.querySelectorAll('script, style, svg').forEach((n) => n.remove());
        [copy, ...copy.querySelectorAll('*')].forEach((el) => {
          [...el.attributes].forEach((attr) => { if (attr.name !== 'href') el.removeAttribute(attr.name); });
          if (el.tagName === 'A') el.setAttribute('href', publicHref(el.getAttribute('href')));
        });
        // split at runs of 2+ <br> (e.g. "text<br><br><a>Learn more</a>") into separate paragraphs
        const segments = [[]];
        let brRun = [];
        [...copy.childNodes].forEach((n) => {
          if (n.nodeName === 'BR' || (n.nodeType === 3 && !clean(n.textContent) && brRun.length)) {
            brRun.push(n);
            return;
          }
          const brs = brRun.filter((b) => b.nodeName === 'BR').length;
          if (brs >= 2) segments.push([]);
          else segments[segments.length - 1].push(...brRun);
          brRun = [];
          segments[segments.length - 1].push(n);
        });
        const blank = (n) => n && (n.nodeName === 'BR' || (n.nodeType === 3 && !clean(n.textContent)));
        segments.forEach((seg) => {
          const sp = document.createElement('p');
          sp.append(...seg);
          while (blank(sp.firstChild)) sp.firstChild.remove();
          while (blank(sp.lastChild)) sp.lastChild.remove();
          if (clean(sp.textContent)) body.push(sp);
        });
        return;
      } else {
        p.textContent = clean(c.textContent);
      }
      body.push(p);
    });
  }
  card.querySelectorAll('.card__cta a[href], .card__link a[href]').forEach((a) => {
    const text = clean(a.textContent) || clean(a.getAttribute('title'));
    if (!text) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = publicHref(a.getAttribute('href'));
    link.textContent = text;
    p.append(link);
    body.push(p);
  });
  if (!imgCell && !body.length) return null;
  return [imgCell, body.length ? body : ''];
}

function pickTiles(root) {
  // One entry per teaser wrapper; read the --md copy, else the first teaser inside it.
  let tiles = [...root.querySelectorAll('.contenttile.teaser')]
    .map((wrap) => wrap.querySelector('.contenttile--md')
      || wrap.querySelector('.cmp-teaser:not(.contenttile--sm)')
      || wrap.querySelector('.cmp-teaser'))
    .filter(Boolean);
  if (!tiles.length) {
    // Fallback: teaser components without the AEM wrapper div.
    tiles = [...root.querySelectorAll('.cmp-teaser:not(.contenttile--sm)')]
      .filter((t) => !t.parentElement.closest('.cmp-teaser'));
  }
  return tiles;
}

function buildRow(tile, document) {
  // Image: first real <img> (skip data: icons), else Dynamic Media data-cmp-src.
  const imgEl = [...tile.querySelectorAll('img')]
    .find((img) => {
      const s = img.getAttribute('src') || '';
      return s && !s.startsWith('data:');
    });
  const dm = tile.querySelector('[data-cmp-src]');
  const src = imgEl
    ? imgEl.getAttribute('src')
    : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  let imgCell = '';
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    imgCell = img;
  }

  const content = tile.querySelector('.cmp-teaser__content') || tile;
  const titleEl = content.querySelector('.cmp-teaser__content__title')
    || content.querySelector('h1, h2, h3, h4, h5, h6');
  const title = clean(titleEl ? titleEl.textContent : '');

  // Description: explicit class, else unclassed paragraphs that are not title/tag/link.
  let descEls = [...content.querySelectorAll('.cmp-teaser__content__description')];
  if (!descEls.length) {
    descEls = [...content.querySelectorAll('p')].filter((p) => p !== titleEl
      && !p.closest('.cmp-teaser__content__tag, [class*="cmp-teaser__content__link"]')
      && !p.classList.contains('cmp-teaser__content__title'));
  }
  const descs = descEls.map((d) => clean(d.textContent)).filter(Boolean);

  const anchor = tile.querySelector('a.cmp-teaser__content__link--card[href]') || tile.querySelector('a[href]');
  // video tiles have no anchor: fall back to the button data-href (absolute)
  const videoBtn = anchor ? null : tile.querySelector('button[data-href]');
  const href = anchor ? anchor.getAttribute('href') : (videoBtn ? publicHref(videoBtn.getAttribute('data-href')) : '');
  const ctaText = clean(tile.querySelector('span.cmp-teaser__content__link')?.textContent)
    || (videoBtn ? 'Watch video' : 'Learn more');

  if (!imgCell && !title && !href) return null;

  const body = [];
  if (title) {
    const h3 = document.createElement('h3');
    h3.textContent = title;
    body.push(h3);
  }
  descs.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    body.push(p);
  });
  if (href) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = ctaText;
    p.append(a);
    body.push(p);
  }
  return [imgCell, body.length ? body : ''];
}

export default function parse(element, { document }) {
  let cells;
  if (!element.querySelector('.contenttile.teaser, .cmp-teaser') && element.querySelector('.mastercard, card.master-card')) {
    cells = [...element.querySelectorAll('card.master-card .card, .mastercard .card')]
      .filter((c, i, all) => all.indexOf(c) === i && !c.parentElement.closest('.card'))
      .map((card) => mastercardRow(card, document)).filter(Boolean);
  } else {
    cells = pickTiles(element).map((tile) => buildRow(tile, document)).filter(Boolean);
  }

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Tiles laid out in a two-column (two-50-50) source container -> 2-up variant.
  // Never inferred from the tile count (a 3-column row with 2 tiles stays 3-up).
  const twoCol = element.matches('.two-50-50, .container__body__two-column');
  const name = twoCol ? 'cards-tile (cols-2)' : 'cards-tile';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
