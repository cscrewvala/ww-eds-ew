import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * Splits a comma-separated tag paragraph into a list of tag pills.
 * @param {Element} p paragraph holding e.g. "100 Years, People"
 * @returns {Element} ul.cards-story-tags
 */
function buildTags(p) {
  const ul = document.createElement('ul');
  ul.className = 'cards-story-tags';
  p.textContent.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.append(li);
  });
  return ul;
}

/**
 * cards-story: related-story teaser tiles in a 2-column grid.
 * Each authored row is one card:
 *   cell 1: image
 *   cell 2: tag labels paragraph (e.g. "100 Years, People"), title (h3), "Learn More" link
 * Cells may be omitted or merged; image vs body cells are detected by content.
 * The whole tile is clickable (as on the source) via the title link.
 * @param {Element} block
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('picture')) return;
    const li = document.createElement('li');
    const imageWrap = document.createElement('div');
    imageWrap.className = 'cards-story-card-image';
    const body = document.createElement('div');
    body.className = 'cards-story-card-body';

    [...row.children].forEach((cell) => {
      const pic = cell.querySelector('picture');
      const imageOnly = pic && !cell.textContent.trim();
      if (imageOnly) {
        imageWrap.append(pic);
        return;
      }
      if (pic && !imageWrap.children.length) {
        const holder = pic.closest('p') && !pic.closest('p').textContent.trim() ? pic.closest('p') : pic;
        imageWrap.append(pic);
        if (holder !== pic) holder.remove();
      }
      if (!cell.children.length && cell.textContent.trim()) {
        const p = document.createElement('p');
        p.textContent = cell.textContent.trim();
        body.append(p);
      } else {
        body.append(...cell.children);
      }
    });

    const links = [...body.querySelectorAll('a[href]')];
    const cta = links[links.length - 1];
    const ctaHolder = cta && cta.closest('p');

    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('cards-story-title');
      let prev = heading.previousElementSibling;
      while (prev) {
        const before = prev.previousElementSibling;
        if (prev.tagName === 'P' && !prev.querySelector('a')) prev.replaceWith(buildTags(prev));
        prev = before;
      }
      if (cta && !heading.querySelector('a') && !heading.contains(cta)) {
        const titleLink = document.createElement('a');
        titleLink.href = cta.href;
        titleLink.append(...heading.childNodes);
        heading.append(titleLink);
        // title link carries the accessible name; the CTA duplicates it
        cta.setAttribute('aria-hidden', 'true');
        cta.tabIndex = -1;
      }
    }
    if (ctaHolder && !heading?.contains(ctaHolder)) {
      ctaHolder.classList.add('cards-story-cta');
      cta.classList.remove('button');
      ctaHolder.classList.remove('button-container');
    }

    if (imageWrap.children.length) li.append(imageWrap);
    if (body.children.length) li.append(body);
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
    );
  });

  block.replaceChildren(ul);
}
