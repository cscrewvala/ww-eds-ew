/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-brand. Base: hero.
 * Source: https://www.woolworthsgroup.com.au/au/en/who-we-are/100-years-of-wwg.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .colscontainer.heroBannerV3
 *
 * Source structure (validated against block-context/hero-brand/source.html + live DOM):
 *   .colscontainer.heroBannerV3 > .heroBannerV3-container__body
 *     .heroBannerV3-banner__content
 *       .image > .cmp-image.heroBannerV3-cmp-image > <svg id="artwork">   -> logo (INLINE SVG ONLY)
 *       .text > .cmp-text.heroBannerV3-banner-text > h2.cmp-teaser__title  -> tagline
 *     .container__body__corner-graphic > img.graphic--bottom-right.{art}  -> decorative swoosh
 *       (no src: the file is set via CSS `content: url(...)` from
 *        /etc.clientlibs/wwg/clientlibs/clientlib-site/resources/images/svg/heroBanner/{art_class}.svg)
 *
 * Logo handling: the source has no <img>, data-cmp-src, alt, <title> or aria-label for the
 * logo, so no image is emitted (data: URIs are deliberately NOT generated). If a future page
 * provides an <img>/data-cmp-src it is used; otherwise any accessible name found on the SVG
 * (aria-label, <title>, <desc>, title attr) is output as a paragraph instead.
 *
 * Block contract (blocks/hero-brand/hero-brand.js): first picture = logo, second = decorative
 * art. The swoosh is therefore only emitted when a logo image exists — otherwise the block
 * would render the swoosh as the logo.
 *
 * Block table (hero: 1 column):
 *   row: logo image (when available)
 *   row: logo name paragraph (fallback, when available) + tagline heading
 *   row: decorative swoosh image (optional, only alongside a logo image)
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const ART_BASE = 'https://www.woolworthsgroup.com.au/etc.clientlibs/wwg/clientlibs/clientlib-site/resources/images/svg/heroBanner/';

function realSrc(img) {
  const src = img.getAttribute('src') || '';
  return src && !src.startsWith('data:') ? src : '';
}

function findLogo(content, document) {
  const holder = content.querySelector('.heroBannerV3-cmp-image, .cmp-image') || content.querySelector('.image') || content;
  const imgEl = [...holder.querySelectorAll('img')].find((img) => realSrc(img));
  const dm = holder.querySelector('[data-cmp-src]');
  const src = imgEl ? realSrc(imgEl) : (dm ? (dm.getAttribute('data-cmp-src') || '').replace('{.width}', '') : '');
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = imgEl ? (imgEl.getAttribute('alt') || '') : (dm.getAttribute('data-asset-alt') || dm.getAttribute('alt') || '');
    return { img, name: '' };
  }
  // Inline SVG only. The 100 Years artwork is shipped as /icons/wwg-100-years.svg, so emit the
  // icon notation; otherwise fall back to the SVG's accessible name, if any.
  const svg = holder.querySelector('svg');
  if (svg && svg.getAttribute('id') === 'artwork' && /874\.78833/.test(svg.getAttribute('viewBox') || '')) {
    return { img: null, name: '', icon: ':wwg-100-years:' };
  }
  const name = svg ? clean(
    svg.getAttribute('aria-label')
    || svg.querySelector('title')?.textContent
    || svg.querySelector('desc')?.textContent
    || svg.getAttribute('title')
    || holder.getAttribute('aria-label')
    || holder.getAttribute('title'),
  ) : '';
  return { img: null, name };
}

function findArt(element, document) {
  const artImg = element.querySelector('.container__body__corner-graphic img, img[class*="graphic--"]');
  if (!artImg) return null;
  let src = realSrc(artImg);
  if (!src) {
    // CSS-supplied artwork: live computed style first, then the class -> file-name convention.
    try {
      const view = document.defaultView || (typeof window !== 'undefined' ? window : null);
      const content = view ? view.getComputedStyle(artImg).content : '';
      const m = content && content.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) src = m[1];
    } catch (e) { /* no CSSOM in this DOM */ }
  }
  if (!src) {
    const cls = [...artImg.classList].find((c) => !c.startsWith('graphic--') && c !== 'is-hidden');
    if (cls) src = `${ART_BASE}${cls.replace(/-/g, '_')}.svg`;
  }
  if (!src) return null;
  const img = document.createElement('img');
  img.src = src;
  img.alt = artImg.getAttribute('alt') || '';
  return img;
}

export default function parse(element, { document }) {
  const content = element.querySelector('.heroBannerV3-banner__content') || element;

  const logo = findLogo(content, document);

  const taglineSrc = content.querySelector('.heroBannerV3-banner-text h1, .heroBannerV3-banner-text h2, .heroBannerV3-banner-text h3')
    || content.querySelector('h1, h2, h3')
    || content.querySelector('.heroBannerV3-banner-text p, .cmp-text p');
  const taglineText = taglineSrc ? clean(taglineSrc.textContent) : '';

  // Empty-block guard.
  if (!logo.img && !logo.icon && !logo.name && !taglineText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (logo.img) cells.push([logo.img]);
  if (logo.icon) {
    const p = document.createElement('p');
    p.textContent = logo.icon;
    cells.push([p]);
  }

  const textCell = [];
  if (logo.name) {
    const p = document.createElement('p');
    p.textContent = logo.name;
    textCell.push(p);
  }
  if (taglineText) {
    // Preserve the source heading level (h2); fall back to a paragraph for plain text.
    const tag = taglineSrc && /^H[1-6]$/.test(taglineSrc.tagName) ? taglineSrc.tagName.toLowerCase() : 'p';
    const t = document.createElement(tag);
    t.textContent = taglineText;
    textCell.push(t);
  }
  if (textCell.length) cells.push([textCell]);

  if (logo.img || logo.icon) {
    const art = findArt(element, document);
    if (art) cells.push([art]);
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-brand', cells });
  element.replaceWith(block);
}
