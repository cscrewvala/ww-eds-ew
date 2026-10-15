/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-stats. Base: cards.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/climate-and-nature.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .heroStats:not(.accordion *)
 *
 * Source structure (validated against block-context/cards-stats/source*.html):
 *   herostats.heroStats > .hero-stats
 *     .hero-stats__title p                      -> panel header row: h2
 *     .hero-stats__content p                    -> panel header row: intro (skipped if blank)
 *     .hero-stats__three__column
 *       .hero-stats__column (x1..n)            <- iterated (block-level div); empty columns skipped
 *         .hero-stats__column__media img       -> default content (dial image, before block)
 *         h2/h3 (figure, may wrap <a>)        -> cell 1 (figure)
 *         p                                     -> cell 2 (caption)
 *         bare span.hero-column__figure        -> goal statement (caption only)
 *     .hero-stats__cta a > button              -> panel footer row: CTA link.
 *       The button nested in <a> is never iterated; CTA text falls back to the
 *       button text in case the parser flattened the nesting.
 *
 * Block table (cards convention / blocks/cards-stats): one row per item.
 *   With figures: [figure | caption]  (items lacking a figure get an empty figure cell)
 *   Goal-only grid (no figures, "no images" style): [caption]
 *   Variant `panel` when the source has a title/intro/CTA: first row [h2 + intro p], last row
 *   [CTA p > a] (each optional, single cell). A non-snow source panel background
 *   (hero-container--bg-tint-sky-5) is added as a second variant class, e.g. `panel, tint-sky-5`.
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function textWithLink(el, tag, document) {
  const out = document.createElement(tag);
  const text = clean(el.textContent);
  const a = el.querySelector('a[href]');
  if (a) {
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    out.append(link);
  } else {
    out.textContent = text;
  }
  return out;
}

export default function parse(element, { document }) {
  const root = element.querySelector('.hero-stats') || element;
  const leading = [];

  // Panel header (title + intro) and footer (CTA) live inside the block (panel variant).
  const header = [];
  const footer = [];
  const titleEl = root.querySelector('.hero-stats__title');
  if (titleEl && clean(titleEl.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = clean(titleEl.textContent);
    header.push(h2);
  }
  root.querySelectorAll('.hero-stats__content p').forEach((p) => {
    if (clean(p.textContent)) header.push(textWithLink(p, 'p', document));
  });

  const items = [];
  [...root.querySelectorAll('.hero-stats__column')].forEach((col) => {
    // dial / icon images stay as default content
    col.querySelectorAll('.hero-stats__column__media img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        const i = document.createElement('img');
        i.src = src;
        i.alt = img.getAttribute('alt') || '';
        leading.push(i);
      }
    });
    const content = [...col.children].filter((c) => !c.classList.contains('hero-stats__column__media'));
    const figureEl = content.find((c) => /^H[1-6]$/.test(c.tagName));
    const captionEls = content.filter((c) => c !== figureEl && clean(c.textContent));
    // bare text nodes directly in the column (defensive)
    if (!content.length && clean(col.textContent)) captionEls.push(col);
    if (!(figureEl && clean(figureEl.textContent)) && !captionEls.length) return;
    const figure = figureEl && clean(figureEl.textContent) ? textWithLink(figureEl, 'p', document) : null;
    const caption = captionEls.map((c) => textWithLink(c, 'p', document));
    items.push({ figure, caption });
  });

  root.querySelectorAll('.hero-stats__cta a[href]').forEach((a) => {
    let text = clean(a.textContent);
    if (!text && a.nextElementSibling && a.nextElementSibling.tagName === 'BUTTON') {
      text = clean(a.nextElementSibling.textContent);
    }
    if (!text) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text;
    p.append(link);
    footer.push(p);
  });

  // Empty-block guard.
  if (!items.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const hasFigures = items.some((i) => i.figure);
  const cells = items.map(({ figure, caption }) => (hasFigures
    ? [figure || '', caption.length ? caption : '']
    : [caption]));

  // Panel variant: optional first row (heading + intro) and last row (CTA link).
  const panel = header.length > 0 || footer.length > 0;
  if (header.length) cells.unshift([header]);
  if (footer.length) cells.push([footer]);
  const variants = [];
  if (panel) {
    variants.push('panel');
    // Tinted source panel (e.g. hero-container--bg-tint-sky-5); snow = no tint.
    const bg = ((root.closest('.hero-stats-container') || element.querySelector('.hero-stats-container') || element)
      .className.match(/hero-container--bg-([a-z0-9-]+)/) || [])[1];
    if (bg && bg !== 'snow') variants.push(bg);
  }
  const name = variants.length ? `cards-stats (${variants.join(', ')})` : 'cards-stats';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.before(...leading);
  element.replaceWith(block);
}
