/* eslint-disable */
/* global WebImporter */
/**
 * Parser for video-story. Base: video.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/2026-world-environment-day.html
 * Generated: 2026-10-14
 *
 * Source structure (validated against block-context/video-story/source.html):
 *   .wwgvideo > .cmp-video > .cmp-video__body
 *     .cmp-video__body__content--top     (title/description duplicate)       -> ignored
 *     a.cmp-video__body__link[href]      (Scene7 viewer / DAM mp4 URL)       -> row 1 link
 *       .cmp-video__body__link__img-blk
 *         img.cmp-video__body__link__img-blk__img  (poster)                  -> row 1 image
 *         img[src^="data:"]                         (play icon)              -> ignored
 *     .cmp-video__body__content--bottom
 *       p.cmp-video__body__content__title                                    -> row 2 title (bold)
 *       div.cmp-video__body__content__description                            -> row 2 paragraph
 *   .video_modal (empty player shell + close button)                         -> ignored
 *   Variation: some videos expose the URL as button[data-href] instead of an <a>.
 *
 * Content-page variant (block-context/video-story/source-tile-video.html):
 *   .contenttile > div > contenttile.cmp-teaser--tile-video (.contenttile--md read; --sm duplicate ignored)
 *     button.cmp-teaser__asset__video__link[data-href=/content/dam/...mp4] -> row 1 link (made absolute,
 *                                                                          the block needs absolute URLs)
 *     .cmp-teaser__image img (poster)                                    -> row 1 image
 *     p.cmp-teaser__content__title                                       -> row 2 title (bold)
 *     .cmp-teaser__content__description (optional)                       -> row 2 paragraph
 *
 * Legal pages (block-context/video-story/source-legal-mastercard-video.html, e.g. /our-impact/reconciliation/our-artwork.html):
 *   .mastercard > card.master-card > .card
 *     .card__video > button.card__video__link[data-href=Scene7 viewer] -> row 1 link
 *       .card__video__img .cmp-image img (poster)                    -> row 1 image
 *     .card__title span                                              -> row 2 title (bold)
 *     .card__description p (optional) / .card__date (usually empty)  -> row 2 paragraphs
 *   .video_modal                                                     -> ignored
 *
 * Block table (video: 1 column):
 *   row 1: poster image + link to the video
 *   row 2: title + description
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const ORIGIN = 'https://www.woolworthsgroup.com.au';
// Authored hrefs are often already percent-encoded (%20, %3A): keep valid %XX escapes and
// encodeURI only the text between them, so they are not double-encoded (%2520 -> 404).
const encodeOnce = (s) => String(s).split(/(%[0-9a-f]{2})/i)
  .map((part, i) => (i % 2 ? part : encodeURI(part))).join('');

function absolute(href) {
  if (!href) return '';
  if (/^(https?:)?\/\//i.test(href)) return href;
  return href.startsWith('/') ? encodeOnce(`${ORIGIN}${href}`) : href;
}

// Video content tile (cmp-teaser--tile-video): read the --md copy only.
function readTile(element) {
  const tile = element.querySelector('.cmp-teaser--tile-video.contenttile--md')
    || element.querySelector('.cmp-teaser--tile-video:not(.contenttile--sm)');
  if (!tile) return null;
  const btn = tile.querySelector('button[data-href]');
  const a = tile.querySelector('a[href]');
  const videoUrl = absolute((btn && btn.getAttribute('data-href')) || (a && a.getAttribute('href')) || '');
  const imgEl = [...tile.querySelectorAll('.cmp-teaser__image img, img')]
    .find((img) => (img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith('data:'));
  const dm = tile.querySelector('[data-cmp-src]');
  const posterSrc = imgEl ? imgEl.getAttribute('src') : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  const titleText = clean(tile.querySelector('.cmp-teaser__content__title')?.textContent);
  const descEl = tile.querySelector('.cmp-teaser__content__description');
  const descParas = descEl
    ? ([...descEl.querySelectorAll('p')].map((p) => clean(p.textContent)).filter(Boolean).length
      ? [...descEl.querySelectorAll('p')].map((p) => clean(p.textContent)).filter(Boolean)
      : [clean(descEl.textContent)].filter(Boolean))
    : [];
  return {
    videoUrl, posterSrc, posterAlt: clean(imgEl && imgEl.getAttribute('alt')), titleText, descParas,
  };
}

// Mastercard video tile (.mastercard .card__video), legal pages.
function readMastercard(element) {
  const video = element.querySelector('.card__video');
  if (!video) return null;
  const card = video.closest('.card') || element;
  const btn = video.querySelector('[data-href]');
  const a = video.querySelector('a[href]');
  const videoUrl = absolute((btn && btn.getAttribute('data-href')) || (a && a.getAttribute('href')) || '');
  const imgEl = [...video.querySelectorAll('img')]
    .find((img) => (img.getAttribute('src') || '') && !(img.getAttribute('src') || '').startsWith('data:'));
  const dm = video.querySelector('[data-cmp-src]');
  const posterSrc = imgEl ? imgEl.getAttribute('src') : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  const titleText = clean(card.querySelector('.card__title')?.textContent);
  const descParas = [];
  card.querySelectorAll('.card__description, .card__date').forEach((d) => {
    const ps = [...d.querySelectorAll('p, li')];
    (ps.length ? ps.map((p) => clean(p.textContent)) : [clean(d.textContent)])
      .filter(Boolean).forEach((t) => descParas.push(t));
  });
  return {
    videoUrl, posterSrc, posterAlt: clean(imgEl && imgEl.getAttribute('alt')), titleText, descParas,
  };
}

export default function parse(element, { document }) {
  const tile = readTile(element);
  if (tile) {
    buildAndReplace(element, document, tile);
    return;
  }

  // Only when the element is not a .wwgvideo player (original story/content shape).
  const mastercard = !element.querySelector('.cmp-video') ? readMastercard(element) : null;
  if (mastercard) {
    buildAndReplace(element, document, mastercard);
    return;
  }

  // Video URL: link href, else button/element data-href.
  const link = element.querySelector('a.cmp-video__body__link[href]')
    || [...element.querySelectorAll('a[href]')].find((a) => !a.closest('.video_modal')) || null;
  const dataHrefEl = element.querySelector('[data-href]');
  const videoUrl = (link && link.href) || (dataHrefEl && dataHrefEl.getAttribute('data-href')) || '';

  // Poster: the poster img (not the data: play icon, not the modal close icon).
  const isPoster = (img) => {
    const src = img.getAttribute('src') || '';
    return src && !src.startsWith('data:') && !img.closest('.video_modal, .close-video');
  };
  let posterSrc = '';
  let posterAlt = '';
  const posterImg = element.querySelector('img.cmp-video__body__link__img-blk__img')
    || [...element.querySelectorAll('img')].find(isPoster) || null;
  if (posterImg && isPoster(posterImg)) {
    posterSrc = posterImg.getAttribute('src') || posterImg.src;
    posterAlt = posterImg.getAttribute('alt') || '';
  } else {
    const dm = element.querySelector('[data-cmp-src]');
    if (dm) posterSrc = dm.getAttribute('data-cmp-src');
  }

  // Title/description are duplicated in --top and --bottom: read --bottom only.
  const content = element.querySelector('.cmp-video__body__content--bottom')
    || element.querySelector('.cmp-video__body__content--top')
    || element.querySelector('.cmp-video__body__content');
  const titleText = clean(content && content.querySelector('.cmp-video__body__content__title')?.textContent);
  const descEl = content && content.querySelector('.cmp-video__body__content__description');
  let descParas = [];
  if (descEl) {
    const ps = [...descEl.querySelectorAll('p')];
    descParas = (ps.length ? ps.map((p) => clean(p.textContent)) : [clean(descEl.textContent)]).filter(Boolean);
  }

  buildAndReplace(element, document, {
    videoUrl, posterSrc, posterAlt, titleText, descParas,
  });
}

function buildAndReplace(element, document, {
  videoUrl, posterSrc, posterAlt, titleText, descParas,
}) {
  // Empty-block guard.
  if (!videoUrl && !posterSrc && !titleText && !descParas.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  const mediaCell = [];
  if (posterSrc) {
    const img = document.createElement('img');
    img.src = posterSrc;
    img.alt = posterAlt || titleText;
    mediaCell.push(img);
  }
  if (videoUrl) {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.textContent = videoUrl;
    const p = document.createElement('p');
    p.append(a);
    mediaCell.push(p);
  }
  cells.push([mediaCell.length ? mediaCell : '']);

  const bodyCell = [];
  if (titleText) {
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = titleText;
    p.append(strong);
    bodyCell.push(p);
  }
  descParas.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    bodyCell.push(p);
  });
  if (bodyCell.length) cells.push([bodyCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'video-story', cells });
  element.replaceWith(block);
}
