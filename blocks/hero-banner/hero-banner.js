import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * hero-banner: full-bleed background image with a centered heading and intro paragraph.
 * Authored rows (any order / merged cells tolerated):
 *   1. background image
 *   2. heading + intro paragraph(s) (optional CTA links)
 * @param {Element} block
 */
export default function decorate(block) {
  const picture = block.querySelector('picture');

  const media = document.createElement('div');
  media.className = 'hero-banner-media';
  const content = document.createElement('div');
  content.className = 'hero-banner-content';

  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt || '', true, [
        { media: '(min-width: 900px)', width: '2000' },
        { width: '900' },
      ]);
      const newImg = optimized.querySelector('img');
      moveInstrumentation(img, newImg);
      if (newImg) {
        newImg.setAttribute('loading', 'eager');
        newImg.setAttribute('fetchpriority', 'high');
      }
      media.append(optimized);
    } else {
      media.append(picture);
    }
  } else {
    block.classList.add('no-image');
  }

  // Collect all non-image content from every cell, preserving authored order.
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    // Universal Editor: the text cell's field moves to the content wrapper
    if (!cell.querySelector('picture')) moveInstrumentation(cell, content);
    if (!cell.children.length) {
      const text = cell.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        content.append(p);
      }
      return;
    }
    [...cell.children].forEach((child) => {
      if (child.tagName === 'PICTURE') return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      content.append(child);
    });
  });

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) heading.classList.add('hero-banner-title');

  const inner = document.createElement('div');
  inner.className = 'hero-banner-inner';
  if (content.children.length) inner.append(content);

  block.replaceChildren(...(media.children.length ? [media] : []), inner);
}
