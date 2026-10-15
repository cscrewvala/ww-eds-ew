import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * columns-media: rows of text beside a photo, 50/50 on desktop.
 * Each authored row is one text | image pair:
 *   cell 1: heading, paragraphs, bulleted list, optional link
 *   cell 2: image (rounded photo / portrait)
 * Cell order is respected (image may be authored first); rows stack on mobile
 * with text first. Rows are separated by a divider. Single-cell rows (text only
 * or image only) span the full width. Extra cells are merged into the text cell.
 * @param {Element} block
 */

const isImageCell = (cell) => !!cell.querySelector('picture') && !cell.textContent.trim();

function buildRow(row) {
  const item = document.createElement('div');
  item.className = 'columns-media-row';

  const cells = [...row.children].filter((c) => c.textContent.trim() || c.querySelector('picture'));
  let media = null;
  let text = null;
  let mediaFirst = false;

  cells.forEach((cell, i) => {
    if (!media && isImageCell(cell)) {
      media = document.createElement('div');
      media.className = 'columns-media-image';
      media.append(cell.querySelector('picture'));
      mediaFirst = !text && i === 0;
      return;
    }
    if (!text) {
      text = document.createElement('div');
      text.className = 'columns-media-text';
    }
    if (!cell.children.length) {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      text.append(p);
    } else {
      text.append(...cell.childNodes);
    }
  });

  // A picture inside the text cell (no dedicated image cell): lift it out.
  if (!media && text) {
    const pic = text.querySelector('picture');
    if (pic) {
      const holder = pic.parentElement;
      media = document.createElement('div');
      media.className = 'columns-media-image';
      media.append(pic);
      if (holder !== text && !holder.textContent.trim() && !holder.children.length) holder.remove();
    }
  }

  if (text) item.append(text);
  if (media) {
    if (mediaFirst) {
      item.prepend(media);
      item.classList.add('columns-media-image-first');
    } else item.append(media);
  }
  if (!text || !media) item.classList.add('columns-media-single');
  return item;
}

export default function decorate(block) {
  const rows = [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .map(buildRow);

  rows.forEach((row) => {
    row.querySelectorAll('.columns-media-image picture > img').forEach((img) => {
      img.closest('picture').replaceWith(
        createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '900' }, { width: '750' }]),
      );
    });
  });

  block.replaceChildren(...rows);
}
