/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-article. Base: hero.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-newsroom/media-releases/latest-news/2026/woolworths-locks-in-cinnabon-cake-as-a-permanent-bakery-hero.html
 * Generated: 2026-10-14
 *
 * Source structure (validated against block-context/hero-article/source.html):
 *   section.cmp-carousel.hero-banner-carousel (or wrapping herobannercarousel.heroBannerCarousel)
 *     .slick-slide > ... .hero-banner-carousel__slider__items
 *       .cmp-image > img.cmp-image__image                       -> row 1 (image, alt kept)
 *       .hero-banner-carousel__slider__items__banner__text
 *         p.banner--category                                    -> row 2 (paragraph)
 *         h2.hero                                               -> row 2 (h1)
 *     .banner-wave (decorative corner graphic)                  -> ignored
 *   Carousel controls (slick arrows/dots), if present, are ignored.
 *
 * Content-page variants:
 *   - No eyebrow (block-context/hero-article/source-contact-us.html): .alignLeft__text with only
 *     h2.hero -> row 2 holds just the h1. Generic "alt" alt text is dropped.
 *   - Video-background hero (block-context/hero-article/source-sustainability-video.html): no
 *     .cmp-image; a Scene7 SmartCropVideoViewer renders <video poster="...">. The poster still
 *     becomes the row 1 image (query string stripped, spaces encoded) - blocks/hero-article has
 *     no video support. p.p--subText under the heading is kept as a paragraph after the h1.
 *
 * Block table (library hero: 1 column):
 *   row 1: background image (optional)
 *   row 2: category paragraph + title as h1
 */
export default function parse(element, { document }) {
  // Union selectors overlap: herobannercarousel wraps section.hero-banner-carousel.
  // If the inner section was already converted into a block table, unwrap the
  // wrapper rather than nesting a second hero around the existing one.
  const hasSourceSlide = element.querySelector('.hero-banner-carousel__slider__items, .heroBanner');
  if (!hasSourceSlide && element.querySelector('table')) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Pick the first real slide; slick may add .slick-cloned copies on multi-banner carousels.
  const slide = element.querySelector('.slick-slide:not(.slick-cloned) .hero-banner-carousel__slider__items')
    || element.querySelector('.hero-banner-carousel__slider__items')
    || element.querySelector('.heroBanner')
    || element;

  // Image: content image in the slide, never the .banner-wave decoration.
  let image = slide.querySelector('.cmp-image img, img.cmp-image__image');
  // Video-background hero: use the <video> poster frame as the image.
  const video = !image ? slide.querySelector('video[poster]') : null;
  const posterSrc = video ? encodeURI(decodeURI((video.getAttribute('poster') || '').split('?')[0])) : '';
  if (!image && !posterSrc) {
    image = [...slide.querySelectorAll('img')].find((img) => !img.closest('.banner-wave')) || null;
  }

  const textWrap = slide.querySelector('.hero-banner-carousel__slider__items__banner__text') || slide;

  const categorySrc = textWrap.querySelector('.banner--category');
  // 2023+/latest-news pages: h2.hero. 2019 news-archive pages: p.p--subText (no heading).
  const titleSrc = textWrap.querySelector('h2.hero')
    || textWrap.querySelector('h1, h2, h3')
    || textWrap.querySelector('.p--subText')
    || [...textWrap.querySelectorAll('p')].find((p) => !p.classList.contains('banner--category')) || null;

  const categoryText = categorySrc ? categorySrc.textContent.replace(/\s+/g, ' ').trim() : '';
  const titleText = titleSrc
    ? (titleSrc.textContent.replace(/\s+/g, ' ').trim() || (titleSrc.getAttribute('title') || '').trim())
    : '';

  // Sub-text under a real heading (video hero): extra paragraph(s) after the h1.
  const subTexts = titleSrc && /^H[1-6]$/.test(titleSrc.tagName)
    ? [...textWrap.querySelectorAll('p')]
      .filter((p) => p !== categorySrc && !p.classList.contains('banner--category') && p.classList.contains('p--subText'))
      .map((p) => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)
    : [];

  // Empty-block guard.
  if (!image && !posterSrc && !titleText && !categoryText) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Fallback: AEM Dynamic Media image not yet rendered — URL only in data-cmp-src.
  const dmHolder = !image
    ? ([...slide.querySelectorAll('[data-cmp-src]')].find((el) => !el.closest('.banner-wave')) || null)
    : null;
  const dmSrc = dmHolder ? dmHolder.getAttribute('data-cmp-src') : '';

  if (image || posterSrc || dmSrc) {
    const img = document.createElement('img');
    if (image) {
      img.src = image.getAttribute('src') || image.src;
      const alt = image.getAttribute('alt') || '';
      img.alt = /^alt$/i.test(alt.trim()) ? '' : alt;
    } else if (posterSrc) {
      img.src = posterSrc;
      img.alt = '';
    } else {
      img.src = dmSrc;
      img.alt = dmHolder.getAttribute('data-asset-alt') || dmHolder.getAttribute('alt') || '';
    }
    cells.push([img]);
  } else {
    cells.push(['']);
  }

  const contentCell = [];
  if (categoryText) {
    const p = document.createElement('p');
    p.textContent = categoryText;
    contentCell.push(p);
  }
  if (titleText) {
    const h1 = document.createElement('h1');
    h1.textContent = titleText;
    contentCell.push(h1);
  }
  subTexts.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    contentCell.push(p);
  });
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-article', cells });
  element.replaceWith(block);
}
