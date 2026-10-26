import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

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
  const rows = [...block.children];
  // Universal Editor: every authored row (instrumented) keeps its own grid; otherwise one grid
  const perRow = rows.length > 1 && rows.some((r) => r.hasAttribute('data-aue-resource'));
  const grids = [];
  let grid = null;
  let count = 0;
  rows.forEach((row) => {
    if (!grid || perRow) {
      grid = document.createElement('div');
      grid.className = 'columns-gallery-grid';
      grids.push(grid);
    }
    // Universal Editor: row -> grid
    moveInstrumentation(row, grid);
    [...row.children].forEach((cell) => {
      const pictures = [...cell.querySelectorAll('picture')];
      if (!pictures.length) return;
      const items = [];
      if (pictures.length > 1) {
        pictures.forEach((pic) => items.push(buildItem(pic, [])));
      } else {
        // single-image cell: remaining text becomes the caption
        const [pic] = pictures;
        const holder = pic.closest('p');
        (pic.closest('a') || pic).remove();
        if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
          // Universal Editor: the image paragraph's component moves to the picture
          moveInstrumentation(holder, pic.closest('a') || pic);
          holder.remove();
        }
        const caption = [...cell.children].filter((el) => el.textContent.trim());
        items.push(buildItem(pic, caption));
      }
      // Universal Editor: cell (column) -> its (first) gallery item
      moveInstrumentation(cell, items[0]);
      grid.append(...items);
      count += items.length;
    });
  });
  if (!grids.length) {
    grid = document.createElement('div');
    grid.className = 'columns-gallery-grid';
    grids.push(grid);
  }
  block.classList.add(`columns-gallery-${Math.max(1, Math.min(count, 4))}-up`);

  grids.forEach((g) => g.querySelectorAll('picture > img').forEach((img) => {
    const picture = img.closest('picture');
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '800' }, { width: '750' }]);
    moveInstrumentation(picture, optimized);
    moveInstrumentation(img, optimized.querySelector('img'));
    picture.replaceWith(optimized);
  }));

  block.replaceChildren(...grids);
}
