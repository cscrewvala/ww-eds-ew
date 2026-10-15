import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * hero-article: full-bleed background image with an overlaid category label and h1 title.
 * Authored rows (any order tolerated):
 *   1. background image
 *   2. category label (paragraph) + title (heading)
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const picture = block.querySelector('picture');

  const media = document.createElement('div');
  media.className = 'hero-article-media';
  const content = document.createElement('div');
  content.className = 'hero-article-content';

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt || '', true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      const newImg = optimized.querySelector('img');
      newImg.setAttribute('loading', 'eager');
      newImg.setAttribute('fetchpriority', 'high');
      media.append(optimized);
    } else {
      media.append(picture);
    }
  } else {
    block.classList.add('no-image');
  }

  // Collect all non-image content from every cell, preserving order.
  rows.forEach((row) => {
    [...row.querySelectorAll(':scope > div')].forEach((cell) => {
      [...cell.children].forEach((child) => {
        if (child.tagName === 'PICTURE' || (child.tagName === 'P' && child.querySelector('picture') && !child.textContent.trim())) return;
        content.append(child);
      });
      // Loose text nodes directly in a cell
      if (cell.textContent.trim() && !cell.querySelector('picture')) {
        const p = document.createElement('p');
        p.textContent = cell.textContent.trim();
        content.append(p);
      }
    });
  });

  // Mark the label paragraph(s) that precede the heading.
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P') prev.classList.add('hero-article-label');
      prev = prev.previousElementSibling;
    }
  }

  const inner = document.createElement('div');
  inner.className = 'hero-article-inner';
  inner.append(content);

  block.replaceChildren(media, inner);
}
