import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * columns-panel: stacked text panels on the left, a large image on the right.
 * Authoring (one row, two cells - order tolerated, the cell with a picture is the media):
 *   text cell:  one or more panels; each heading (H2-H6) starts a new panel
 *               ("Parking", "Metro", "Taxi"), followed by its paragraph(s)/list
 *   media cell: the image (aerial map, photo)
 * Extra rows are tolerated: every text cell contributes panels in order, and the
 * first picture found becomes the media. No picture -> panels use the full width.
 * @param {Element} block
 */

function splitPanels(cell) {
  const panels = [];
  let current = null;
  const start = () => {
    current = document.createElement('div');
    current.className = 'columns-panel-item';
    panels.push(current);
  };
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (!node.textContent.trim()) return;
      const p = document.createElement('p');
      p.textContent = node.textContent.trim();
      if (!current) start();
      current.append(p);
      return;
    }
    if (/^H[2-6]$/.test(node.tagName) || !current) start();
    current.append(node);
  });
  return panels;
}

export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const panels = document.createElement('div');
  panels.className = 'columns-panel-items';
  const media = document.createElement('div');
  media.className = 'columns-panel-media';

  cells.forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !media.children.length) {
      const holder = pic.parentElement;
      media.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
    if (cell.textContent.trim()) panels.append(...splitPanels(cell));
  });

  media.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '1600' }, { width: '750' }]),
    );
  });

  const row = document.createElement('div');
  row.className = 'columns-panel-row';
  if (panels.children.length) row.append(panels);
  if (media.children.length) row.append(media);
  else block.classList.add('columns-panel-no-media');
  block.replaceChildren(row);
}
