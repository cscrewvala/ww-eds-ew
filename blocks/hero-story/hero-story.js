import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * hero-story: page-top split hero. Text (h1 title + optional subtitle such as a
 * date or "2:15 min video") on the left, rounded feature image on the right.
 * Authored rows (order tolerated):
 *   1. feature image
 *   2. h1 title + subtitle paragraph (subtitle may be empty/absent)
 * @param {Element} block
 */
export default function decorate(block) {
  const media = document.createElement('div');
  media.className = 'hero-story-media';
  const content = document.createElement('div');
  content.className = 'hero-story-content';

  const picture = block.querySelector('picture');
  if (picture) {
    const img = picture.querySelector('img');
    if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt || '', true, [
        { media: '(min-width: 900px)', width: '1200' },
        { width: '750' },
      ]);
      const newImg = optimized.querySelector('img');
      moveInstrumentation(img, newImg);
      newImg.setAttribute('loading', 'eager');
      newImg.setAttribute('fetchpriority', 'high');
      media.append(optimized);
    } else {
      media.append(picture);
    }
  } else {
    block.classList.add('no-image');
  }

  // Gather every non-image element from all cells, in authored order.
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    // Universal Editor: the text cell's field moves to the content wrapper
    if (!cell.querySelector('picture')) moveInstrumentation(cell, content);
    const children = [...cell.children];
    if (!children.length && cell.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      content.append(p);
      return;
    }
    children.forEach((child) => {
      if (child.tagName === 'PICTURE') return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      if (!child.textContent.trim() && !child.querySelector('img')) return;
      content.append(child);
    });
  });

  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('hero-story-title');
    let next = heading.nextElementSibling;
    while (next) {
      if (next.tagName === 'P') next.classList.add('hero-story-subtitle');
      next = next.nextElementSibling;
    }
  }

  const children = [content];
  if (media.children.length) children.push(media);
  block.replaceChildren(...children);
}
