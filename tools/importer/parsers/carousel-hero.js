/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability.html
 * Generated: 2026-10-20
 *
 * Used for heroBannerCarousel instances that hero-article cannot represent: a background video
 * (Scene7 SmartCropVideoViewer) or more than one slide.
 *
 * Source structure:
 *   herobannercarousel.heroBannerCarousel > section.cmp-carousel.hero-banner-carousel
 *     .hero-banner-carousel__slider__items (one per slide; slick adds .slick-cloned copies)
 *       .heroBanner[.black--gradient|.teaser.no-opacity]
 *         .cmp-image img                                      -> image slide
 *         #s7video_div.video-screen > ... video[poster]       -> Scene7 video slide; the inline
 *           SmartCropVideoViewer script carries "asset" : "<company>/<asset>"
 *         .hero-banner-carousel__slider__items__banner__text
 *           h2.hero                                           -> h1 (first slide), h2 (others)
 *           p.p--subText(.h3)                                 -> h3 / p
 *           a (CTA)                                           -> kept
 *
 * Block table (library carousel: one row per slide, 2 columns):
 *   col 1: image only (the Scene7 poster for video slides)
 *   col 2: video link (https://<host>/is/content/<asset>, video slides only), heading,
 *          sub-text, CTAs
 * Variants: gradient (.black--gradient), no-overlay (.teaser.no-opacity)
 * Slide timing is page metadata (`carousel-interval`, seconds), not part of the block.
 */
const S7_HOST = 'https://woolworthsgroup.scene7.com';

function text(el) {
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
}

/** Scene7 asset path ("company/asset", percent-encoded) for a video slide */
function videoAsset(slide) {
  const script = [...slide.querySelectorAll('script')].map((s) => s.textContent).join('\n');
  const m = script.match(/"asset"\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  const video = slide.querySelector('video[poster]');
  const poster = video ? video.getAttribute('poster') || '' : '';
  const p = poster.match(/\/is\/image\/([^?#]+)/);
  return p ? p[1] : '';
}

function slideImage(slide, asset, document) {
  const img = document.createElement('img');
  if (asset) {
    img.src = `${S7_HOST}/is/image/${asset}`;
    img.alt = '';
    return img;
  }
  const src = [...slide.querySelectorAll('.cmp-image img, img.cmp-image__image, img')]
    .find((x) => !x.closest('.banner-wave'));
  if (!src) return null;
  img.src = src.getAttribute('src') || src.src;
  const alt = src.getAttribute('alt') || '';
  img.alt = /^alt$/i.test(alt.trim()) ? '' : alt;
  return img;
}

function slideText(slide, asset, index, document) {
  const content = [];
  if (asset) {
    const link = document.createElement('a');
    link.href = `${S7_HOST}/is/content/${asset}`;
    link.textContent = link.href;
    const p = document.createElement('p');
    p.append(link);
    content.push(p);
  }
  const textWrap = slide.querySelector('.hero-banner-carousel__slider__items__banner__text') || slide;
  const category = textWrap.querySelector('.banner--category');
  if (text(category)) {
    const p = document.createElement('p');
    p.textContent = text(category);
    content.push(p);
  }
  const title = textWrap.querySelector('h2.hero, h1, h2, h3');
  const titleText = text(title) || (title ? (title.getAttribute('title') || '').trim() : '');
  if (titleText) {
    const h = document.createElement(index === 0 ? 'h1' : 'h2');
    h.textContent = titleText;
    content.push(h);
  }
  textWrap.querySelectorAll('p.p--subText').forEach((p) => {
    if (!text(p)) return;
    const el = document.createElement(p.classList.contains('h3') ? 'h3' : 'p');
    el.textContent = text(p);
    content.push(el);
  });
  textWrap.querySelectorAll('a[href]').forEach((a) => {
    if (!text(a)) return;
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    const link = document.createElement('a');
    link.href = a.getAttribute('href');
    link.textContent = text(a);
    strong.append(link);
    p.append(strong);
    content.push(p);
  });
  return content;
}

export default function parse(element, { document }) {
  const root = element.querySelector('section.hero-banner-carousel') || element;
  let slides = [...root.querySelectorAll('.hero-banner-carousel__slider__items')]
    .filter((s) => !s.closest('.slick-cloned'));
  if (!slides.length) slides = [root];

  const cells = [];
  slides.forEach((slide, i) => {
    const isVideo = !!slide.querySelector('.video-screen, video, script[src*="SmartCropVideoViewer"]');
    const raw = isVideo ? videoAsset(slide) : '';
    const asset = raw ? encodeURI(decodeURI(raw)) : '';
    const image = slideImage(slide, asset, document);
    const content = slideText(slide, asset, i, document);
    if (image || content.length) cells.push([image || '', content.length ? content : '']);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const banner = root.querySelector('.heroBanner');
  const cls = banner ? banner.className : '';
  const variants = [];
  if (/\bblack--gradient\b/.test(cls)) variants.push('gradient');
  if (/\bno-opacity\b/.test(cls) && banner.classList.contains('teaser')) variants.push('no-overlay');

  const name = variants.length ? `carousel-hero (${variants.join(', ')})` : 'carousel-hero';
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name, cells }));
}
