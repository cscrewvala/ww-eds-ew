/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-featured. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/who-we-are/100-years-of-wwg.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .container__body__two-column.two-50-50:has(.contenttile)
 *
 * Source structure (validated against block-context/cards-featured/source.html):
 *   .container__body__two-column > .container__body__content__cols x2 > .cmp-container
 *     .contenttile.teaser > div > contenttile.cmp-teaser.contenttile--md   <- iterated (one per tile)
 *       video tile (cmp-teaser--tile-video, first/large tile):
 *         button.cmp-teaser__asset__video__link[data-href=*.mp4] wraps .cmp-teaser__image img
 *       image tile (cmp-teaser--horizontal-tile):
 *         a.cmp-teaser__content__link--card[href] wraps image + content
 *       .cmp-teaser__content__tag > p*             -> tags paragraph
 *       p.cmp-teaser__content__title               -> h3
 *       .cmp-teaser__content__description          -> description (optional)
 *       fallback (homepage, unclassed markup): plain <p> before the title -> tags,
 *         plain <p> after the title -> description. Used only when the classed
 *         tag/description wrappers are absent, so the 100-years output is unchanged.
 *       (validated: block-context/cards-featured/source.html + source-homepage.html)
 *       span.cmp-teaser__content__link             -> CTA text ("Learn more")
 *     contenttile.contenttile--sm (mobile duplicate) -> ignored
 *
 * Iteration is keyed on the custom block-level <contenttile> element, never on the <a> card
 * wrapper, so html2md inline-merging of adjacent anchors cannot collapse tiles.
 *
 * Block table (cards: 2 columns), one row per tile in document order:
 *   [image | tags p, h3 title, description p, link p]
 * Video tile link = absolute button[data-href] (blocks/cards-featured detects absolute
 * video URLs and turns the image into a play trigger).
 */
const ORIGIN = 'https://www.woolworthsgroup.com.au';
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function absolute(href) {
  if (!href) return '';
  if (/^(https?:)?\/\//i.test(href)) return href;
  return href.startsWith('/') ? `${ORIGIN}${href}` : href;
}

function pickTiles(root) {
  let tiles = [...root.querySelectorAll('.contenttile--md')];
  if (!tiles.length) {
    tiles = [...root.querySelectorAll('.cmp-teaser:not(.contenttile--sm)')]
      .filter((t) => !t.parentElement.closest('.cmp-teaser'));
  }
  return tiles;
}

function buildRow(tile, document) {
  // Image: real <img> (skip data: icons), else Dynamic Media data-cmp-src.
  const imgEl = [...tile.querySelectorAll('.cmp-teaser__image img, img')]
    .find((img) => (img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith('data:'));
  const dm = tile.querySelector('.cmp-teaser__image [data-cmp-src], [data-cmp-src]');
  const src = imgEl ? imgEl.getAttribute('src') : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  let imgCell = '';
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    imgCell = img;
  }

  // Tags: visible labels, else data-filter-value.
  let tags = [...tile.querySelectorAll('.cmp-teaser__content__tag p')]
    .map((t) => clean(t.textContent)).filter(Boolean);
  if (!tags.length) {
    tags = (tile.getAttribute('data-filter-value') || '').split(',').map((t) => clean(t)).filter(Boolean);
  }

  const titleEl = tile.querySelector('.cmp-teaser__content__title')
    || tile.querySelector('.cmp-teaser__content h1, .cmp-teaser__content h2, .cmp-teaser__content h3, .cmp-teaser__content h4');
  const title = clean(titleEl ? titleEl.textContent : '');

  const descEl = tile.querySelector('.cmp-teaser__content__description');
  let descs = descEl ? [clean(descEl.textContent)].filter(Boolean) : [];

  // Fallback (homepage variant): unclassed <p> siblings of the title paragraph.
  //   before the title -> tag paragraph (only when no .cmp-teaser__content__tag / data-filter-value)
  //   after the title  -> description paragraph(s) (only when no .cmp-teaser__content__description)
  const content = titleEl ? titleEl.parentElement : null;
  if (content && titleEl.tagName === 'P') {
    const loose = [...content.children].filter((el) => el.tagName === 'P' && el !== titleEl
      && !el.className.trim());
    const isBefore = (el) => !!(el.compareDocumentPosition(titleEl) & 4); // titleEl follows el
    if (!tags.length) {
      tags = loose.filter(isBefore).map((p) => clean(p.textContent)).filter(Boolean);
    }
    if (!descs.length) {
      descs = loose.filter((p) => !isBefore(p)).map((p) => clean(p.textContent)).filter(Boolean);
    }
  }

  // Link: card anchor, else video button[data-href].
  const anchor = tile.querySelector('a.cmp-teaser__content__link--card[href]') || tile.querySelector('a[href]');
  const videoBtn = tile.querySelector('button[data-href]');
  let href = '';
  let ctaText = '';
  if (anchor) {
    href = anchor.getAttribute('href');
    ctaText = clean(tile.querySelector('span.cmp-teaser__content__link')?.textContent) || 'Learn more';
  } else if (videoBtn) {
    href = absolute(videoBtn.getAttribute('data-href'));
    ctaText = 'Watch video';
  }

  if (!imgCell && !title && !href) return null;

  const body = [];
  if (tags.length) {
    const p = document.createElement('p');
    p.textContent = tags.join(', ');
    body.push(p);
  }
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
  const cells = pickTiles(element).map((tile) => buildRow(tile, document)).filter(Boolean);

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-featured', cells });
  element.replaceWith(block);
}
