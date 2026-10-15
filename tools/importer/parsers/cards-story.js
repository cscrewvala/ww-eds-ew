/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-story. Base: cards.
 * Sources: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2025/recycle-and-save.html (image tiles)
 *          .../2025/partnering-with-rural-aid-to-back-aussie-farmers-during-tough-times.html (video tiles)
 * Generated: 2026-10-14
 *
 * Instances (page-templates.json):
 *   .container__body__two-column.two-50-50:has(.contenttile)  -> group of related tiles (one row per tile)
 *   .container__body__one-column .contenttile.teaser          -> single tile (one row)
 *
 * Source structure (validated against block-context/cards-story/source.html):
 *   .contenttile.teaser > div[data-component="contentTile"][data-cmp-data-layer]
 *     contenttile.cmp-teaser.contenttile--md[data-filter-value="100 Years,People"]   <- iterated (one per tile)
 *       image tile: a.cmp-teaser__content__link--card[href] (wraps everything)
 *         .cmp-teaser__image img.cmp-image__image (or [data-cmp-src])               -> cell 1
 *         .cmp-teaser__content__tag > p*                                            -> cell 2 tags paragraph
 *         p.cmp-teaser__content__title                                              -> cell 2 h3
 *         span.cmp-teaser__content__link ("Learn More")                             -> cell 2 link text
 *       video tile (cmp-teaser--tile-video): no <a>; button[data-href] (DAM mp4) wraps the poster
 *     contenttile.contenttile--sm  (mobile duplicate)                                -> ignored
 *
 * Iteration is keyed on the custom <contenttile> element (block-level wrapper), never on the
 * <a> card wrapper, so html2md inline-merging of adjacent anchors cannot collapse tiles.
 *
 * Block table (cards: 2 columns): [image | tags p, h3 title, "Learn More" link]
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function pickTiles(root) {
  // One visible copy per tile: prefer --md, fall back to any teaser not marked --sm.
  const teasers = root.matches('.contenttile.teaser') ? [root] : [...root.querySelectorAll('.contenttile.teaser')];
  const tiles = [];
  teasers.forEach((teaser) => {
    const tile = teaser.querySelector('.contenttile--md')
      || teaser.querySelector('.cmp-teaser:not(.contenttile--sm)')
      || teaser.querySelector('.cmp-teaser, contenttile');
    if (tile && !tiles.includes(tile)) tiles.push(tile);
  });
  if (!tiles.length) {
    root.querySelectorAll('.contenttile--md').forEach((t) => { if (!tiles.includes(t)) tiles.push(t); });
  }
  return tiles;
}

function layerLinkUrl(tile) {
  const holder = tile.closest('[data-cmp-data-layer]');
  if (!holder) return '';
  try {
    const data = JSON.parse(holder.getAttribute('data-cmp-data-layer'));
    const first = data && data[Object.keys(data)[0]];
    return (first && first['xdm:linkURL']) || '';
  } catch (e) {
    return '';
  }
}

function buildRow(tile, document) {
  // Image: real <img> (skip svg/data: icons), else Dynamic Media data-cmp-src.
  const imgEl = [...tile.querySelectorAll('.cmp-teaser__image img, img')]
    .find((img) => (img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith('data:'));
  let imgCell = '';
  const dm = tile.querySelector('.cmp-teaser__image [data-cmp-src], [data-cmp-src]');
  const src = imgEl ? imgEl.getAttribute('src') : (dm ? dm.getAttribute('data-cmp-src') : '');
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : '';
    imgCell = img;
  }

  // Tags: data-filter-value, else visible tag labels.
  let tags = (tile.getAttribute('data-filter-value') || '')
    .split(',').map((t) => clean(t)).filter(Boolean);
  if (!tags.length) {
    tags = [...tile.querySelectorAll('.cmp-teaser__content__tag p, .cmp-teaser__content__tag span')]
      .map((t) => clean(t.textContent)).filter(Boolean);
  }

  const titleEl = tile.querySelector('.cmp-teaser__content__title')
    || tile.querySelector('.cmp-teaser__content h1, .cmp-teaser__content h2, .cmp-teaser__content h3, .cmp-teaser__content h4');
  const title = clean(titleEl ? titleEl.textContent : '');

  // Link: card anchor, else video button[data-href], else data-layer linkURL.
  const anchor = tile.querySelector('a.cmp-teaser__content__link--card[href]') || tile.querySelector('a[href]');
  const videoBtn = tile.querySelector('button[data-href], [data-href]');
  const href = (anchor && anchor.getAttribute('href'))
    || (videoBtn && videoBtn.getAttribute('data-href'))
    || layerLinkUrl(tile);
  const ctaText = clean(tile.querySelector('span.cmp-teaser__content__link')?.textContent) || 'Learn More';

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
  // Single-tile selector can also match tiles inside a two-column group; the group
  // instance owns those, so leave them for it.
  if (element.matches('.contenttile.teaser') && element.closest('.container__body__two-column')) {
    return;
  }

  const tiles = pickTiles(element);
  const cells = tiles.map((tile) => buildRow(tile, document)).filter(Boolean);

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-story', cells });
  element.replaceWith(block);
}
