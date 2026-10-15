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
 * Variants (comma list, e.g. `hero-article (subtitle, gradient)`):
 *   subtitle    title came from p.p--subText (no h2.hero)
 *   gradient    .heroBanner.black--gradient (bottom gradient scrim instead of flat overlay)
 *   no-overlay  .heroBanner.teaser.no-opacity, or the .cmp-image::after scrim has opacity 0
 *   top|bottom|right  .position__obj--top/--bottom/--right, or img object-position
 *               50% 0% / 50% 100% / 100% 50% (default 0% 50% = no class)
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
  // A `.p--subText.h3` sub-line is styled as an h3 on the source -> emit it as <h3>.
  const subTexts = titleSrc && /^H[1-6]$/.test(titleSrc.tagName)
    ? [...textWrap.querySelectorAll('p')]
      .filter((p) => p !== categorySrc && !p.classList.contains('banner--category') && p.classList.contains('p--subText'))
      .map((p) => ({ text: p.textContent.replace(/\s+/g, ' ').trim(), h3: p.classList.contains('h3') }))
      .filter((t) => t.text)
    : [];
  // Title taken from p.p--subText (no h2.hero, e.g. 2019 news-archive): smaller title variant.
  const subtitleVariant = !!titleSrc && titleSrc.tagName === 'P' && titleSrc.classList.contains('p--subText');

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
  subTexts.forEach(({ text, h3 }) => {
    const el = document.createElement(h3 ? 'h3' : 'p');
    el.textContent = text;
    contentCell.push(el);
  });
  cells.push([contentCell]);

  // Presentation variants from the source hero banner (.heroBanner on the slide).
  const variants = [];
  if (subtitleVariant) variants.push('subtitle');
  const banner = slide.closest('.heroBanner') || slide.querySelector('.heroBanner')
    || element.querySelector('.heroBanner') || element;
  const bannerCls = banner.className || '';
  const view = document.defaultView || (typeof window !== 'undefined' ? window : null);
  if (/\bblack--gradient\b/.test(bannerCls)) variants.push('gradient');
  let noOverlay = /\bno-opacity\b/.test(bannerCls) && banner.classList.contains('teaser');
  if (!noOverlay && view && !/\bblack--gradient\b/.test(bannerCls)) {
    // Scrim is the .cmp-image::after overlay; opacity 0 means no darkening.
    const scrimHost = banner.querySelector('.cmp-image');
    try {
      const after = scrimHost ? view.getComputedStyle(scrimHost, '::after') : null;
      if (after && after.content !== 'none' && after.opacity === '0') noOverlay = true;
    } catch (e) { /* no computed styles (offline) */ }
  }
  if (noOverlay) variants.push('no-overlay');
  // Image anchor: position__obj--top|bottom|right, else the img object-position.
  let anchor = (bannerCls.match(/\bposition__obj--(top|bottom|right)\b/) || [])[1] || '';
  const imgEl = image || video;
  if (!anchor && imgEl) {
    let pos = '';
    const inline = (imgEl.getAttribute('style') || '').match(/object-position\s*:\s*([^;]+)/i);
    if (inline) pos = inline[1];
    else if (view) {
      try { pos = view.getComputedStyle(imgEl).objectPosition || ''; } catch (e) { pos = ''; }
    }
    const norm = pos.trim().toLowerCase()
      .replace(/\bcenter\b/g, '50%').replace(/\btop\b/g, '0%').replace(/\bbottom\b/g, '100%')
      .replace(/\bleft\b/g, '0%').replace(/\bright\b/g, '100%')
      .replace(/\s+/g, ' ');
    anchor = { '50% 0%': 'top', '50% 100%': 'bottom', '100% 50%': 'right' }[norm] || '';
  }
  if (anchor) variants.push(anchor);

  const name = variants.length ? `hero-article (${variants.join(', ')})` : 'hero-article';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
