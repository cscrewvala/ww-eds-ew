/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base: hero.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   herobannercarousel.heroBannerCarousel:not(:has(.banner--category))
 *
 * Source structure (validated against block-context/hero-banner/source.html):
 *   herobannercarousel > section.cmp-carousel.hero-banner-carousel
 *     .slick-slide (non-cloned) > ... .hero-banner-carousel__slider__items
 *       .heroBanner > .cmp-image[data-cmp-src] > img.cmp-image__image     -> row 1 (bg image, alt kept)
 *       .hero-banner-carousel__slider__items__banner__text
 *         h2.hero[title]                                                  -> row 2 (h1)
 *         p.p--subText                                                    -> row 2 (paragraph)
 *     .banner-wave (decorative corner graphic)                            -> ignored
 *   Slick controls (arrows/dots), if present, are ignored.
 *
 * Block table (library hero: 1 column):
 *   row 1: background image (optional)
 *   row 2: title as h1 + intro paragraph
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

export default function parse(element, { document }) {
  // First real slide; slick may add .slick-cloned copies.
  const slide = element.querySelector('.slick-slide:not(.slick-cloned) .hero-banner-carousel__slider__items')
    || element.querySelector('.hero-banner-carousel__slider__items')
    || element.querySelector('.heroBanner')
    || element;

  // Background image: content <img> (never the .banner-wave decoration), else Scene7 data-cmp-src.
  const imgEl = [...slide.querySelectorAll('.cmp-image img, img')].find((img) => {
    const src = img.getAttribute('src') || '';
    return src && !src.startsWith('data:') && !img.closest('.banner-wave');
  });
  const dmHolder = [...slide.querySelectorAll('[data-cmp-src]')].find((el) => !el.closest('.banner-wave')) || null;
  let imgSrc = imgEl ? imgEl.getAttribute('src') : '';
  if (!imgSrc && dmHolder) {
    imgSrc = (dmHolder.getAttribute('data-cmp-src') || '').replace('{.width}', '');
  }
  const imgAlt = imgEl
    ? (imgEl.getAttribute('alt') || '')
    : (dmHolder ? (dmHolder.getAttribute('data-asset-alt') || dmHolder.getAttribute('alt') || '') : '');

  // Text.
  const textWrap = slide.querySelector('.hero-banner-carousel__slider__items__banner__text') || slide;
  const titleSrc = textWrap.querySelector('h2.hero')
    || textWrap.querySelector('h1, h2, h3');
  const titleText = titleSrc ? (clean(titleSrc.textContent) || clean(titleSrc.getAttribute('title'))) : '';
  const introSrc = textWrap.querySelector('p.p--subText')
    || [...textWrap.querySelectorAll('p')].find((p) => clean(p.textContent)) || null;
  const introText = introSrc ? clean(introSrc.textContent) : '';

  // Empty-block guard.
  if (!imgSrc && !titleText && !introText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  if (imgSrc) {
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = imgAlt;
    cells.push([img]);
  } else {
    cells.push(['']);
  }

  const contentCell = [];
  if (titleText) {
    const h1 = document.createElement('h1');
    h1.textContent = titleText;
    contentCell.push(h1);
  }
  if (introText) {
    const p = document.createElement('p');
    p.textContent = introText;
    contentCell.push(p);
  }
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
