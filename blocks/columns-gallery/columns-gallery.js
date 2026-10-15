import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * columns-gallery: a row of equal-size photos (typically 3) side by side.
 * Authoring: one row with one image per cell, or one image per row, or several
 * images in one cell - every picture becomes one gallery item. Optional text in a
 * cell is kept as a caption under its image. Column count follows the number of
 * images (max 4 per row; larger sets wrap).
 * @param {Element} block
 */

function buildItem(picture, captionNodes) {
  const figure = document.createElement('figure');
  figure.className = 'columns-gallery-item';
  const media = document.createElement('div');
  media.className = 'columns-gallery-image';
  const link = picture.closest('a');
  media.append(link && link.querySelector('picture') === picture ? link : picture);
  figure.append(media);
  if (captionNodes.length) {
    const caption = document.createElement('figcaption');
    caption.className = 'columns-gallery-caption';
    caption.append(...captionNodes);
    figure.append(caption);
  }
  return figure;
}

export default function decorate(block) {
  const items = [];
  [...block.querySelectorAll(':scope > div > div')].forEach((cell) => {
    const pictures = [...cell.querySelectorAll('picture')];
    if (!pictures.length) return;
    if (pictures.length > 1) {
      pictures.forEach((pic) => items.push(buildItem(pic, [])));
      return;
    }
    // single-image cell: remaining text becomes the caption
    const [pic] = pictures;
    const holder = pic.closest('p');
    (pic.closest('a') || pic).remove();
    if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
      holder.remove();
    }
    const caption = [...cell.children].filter((el) => el.textContent.trim());
    items.push(buildItem(pic, caption));
  });

  const grid = document.createElement('div');
  grid.className = 'columns-gallery-grid';
  grid.append(...items);
  block.classList.add(`columns-gallery-${Math.max(1, Math.min(items.length, 4))}-up`);

  grid.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '800' }, { width: '750' }]),
    );
  });

  block.replaceChildren(grid);
}
