/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-story. Base: hero.
 * Source: https://www.woolworthsgroup.com.au/au/en/our-impact/sustainability/our-stories/2026/2026-world-environment-day.html
 * Generated: 2026-10-14
 *
 * Source structure (validated against block-context/hero-story/source.html):
 *   .container__body__two-column.two-50-50
 *     .container__body__content__cols (text column)
 *       .heading .cmp-title h1.heading-container__body__text
 *         .heading-container__body__text__icon > img (decorative data: svg)  -> ignored
 *         .heading-container__body__text__content (title text)              -> row 2 h1
 *       .text .cmp-text p (date / "2:15 min video", may be empty)            -> row 2 paragraph(s)
 *     .container__body__content__cols (media column)
 *       .image.heroBannerV3-imageBanner (or plain .image) .cmp-image > img   -> row 1 (alt kept)
 *       Dynamic Media: URL may only be on [data-cmp-src]
 *
 * Variant `offset-top` when a 96px spacer (.separator.h-96) sits immediately before the hero
 * container (the enclosing .colscontainer) on the source.
 *
 * Block table (hero: 1 column):
 *   row 1: feature image
 *   row 2: h1 title + subtitle paragraph(s)
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

export default function parse(element, { document }) {
  const h1 = element.querySelector('h1');
  const titleSrc = h1
    ? (h1.querySelector('.heading-container__body__text__content') || h1)
    : element.querySelector('h2, .cmp-title');
  const titleText = clean(titleSrc ? titleSrc.textContent : '');

  // Subtitle paragraph(s): text components only, never inside the heading component.
  const subtitles = [...element.querySelectorAll('.text .cmp-text p, .cmp-text > p')]
    .filter((p, i, all) => all.indexOf(p) === i && !p.closest('.heading, .cmp-title'))
    .map((p) => clean(p.textContent))
    .filter(Boolean);

  // Feature image: prefer the hero banner image, then any content image (not the heading icon).
  const imageHolder = element.querySelector('.heroBannerV3-imageBanner')
    || [...element.querySelectorAll('.image')].find((el) => !el.closest('.heading')) || null;
  const isContentImg = (img) => {
    const src = img.getAttribute('src') || '';
    return src && !src.startsWith('data:') && !img.closest('.heading, .heading-container__body__text__icon');
  };
  let image = imageHolder ? [...imageHolder.querySelectorAll('img')].find(isContentImg) : null;
  if (!image) image = [...element.querySelectorAll('img')].find(isContentImg) || null;

  let imgSrc = image ? (image.getAttribute('src') || image.src) : '';
  let imgAlt = image ? (image.getAttribute('alt') || '') : '';
  if (!imgSrc) {
    // Dynamic Media not yet rendered: URL only in data-cmp-src.
    const dm = (imageHolder && (imageHolder.matches('[data-cmp-src]') ? imageHolder : imageHolder.querySelector('[data-cmp-src]')))
      || element.querySelector('[data-cmp-src]');
    if (dm) {
      imgSrc = dm.getAttribute('data-cmp-src');
      imgAlt = dm.getAttribute('data-asset-alt') || dm.getAttribute('alt') || dm.getAttribute('data-title') || '';
    }
  }

  // Empty-block guard.
  if (!titleText && !imgSrc && !subtitles.length) {
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
    const heading = document.createElement('h1');
    heading.textContent = titleText;
    contentCell.push(heading);
  }
  subtitles.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    contentCell.push(p);
  });
  cells.push([contentCell]);

  // 96px spacer (separator.h-96) directly before the hero container on the source -> offset-top.
  const prevComponent = (el) => {
    let prev = el ? el.previousElementSibling : null;
    while (prev && prev.matches('hr, script, noscript, style, link')) prev = prev.previousElementSibling;
    return prev;
  };
  const isSpacer96 = (el) => !!el && el.matches('.separator.h-96');
  const container = element.closest('.colscontainer');
  const offsetTop = isSpacer96(prevComponent(container)) || isSpacer96(prevComponent(element));

  const name = offsetTop ? 'hero-story (offset-top)' : 'hero-story';
  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
