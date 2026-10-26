/**
 * columns-logos: a left-aligned, wrapping row of partner / certification logos.
 * Authoring is flexible: one row with a logo per cell, or one logo per row, or
 * several logos in a single cell all work - every logo found in the block becomes
 * one item. A logo may be wrapped in a link (kept), and an optional text-only
 * cell is kept as a caption under the preceding logo.
 * @param {Element} block
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

function logoUnit(picture) {
  const link = picture.closest('a');
  return link && link.closest('.columns-logos') ? link : picture;
}

export default function decorate(block) {
  const rows = [...block.children];
  // Universal Editor: every authored row (instrumented) keeps its own list; otherwise one list
  const perRow = rows.length > 1 && rows.some((r) => r.hasAttribute('data-aue-resource'));
  const lists = [];
  let ul = null;

  rows.forEach((row) => {
    if (!ul || perRow) {
      ul = document.createElement('ul');
      lists.push(ul);
    }
    // Universal Editor: row -> list
    moveInstrumentation(row, ul);
    [...row.children].forEach((cell) => {
      const pictures = [...cell.querySelectorAll('picture')];
      if (!pictures.length) {
        // text-only cell: caption for the previous logo, or a text-only item
        const text = cell.textContent.trim();
        if (!text) return;
        const caption = document.createElement('p');
        caption.className = 'columns-logos-caption';
        caption.append(...cell.childNodes);
        // Universal Editor: text-only cell (column) -> caption
        moveInstrumentation(cell, caption);
        const prev = ul.lastElementChild;
        if (prev && !prev.querySelector('.columns-logos-caption')) prev.append(caption);
        else {
          const li = document.createElement('li');
          li.append(caption);
          ul.append(li);
        }
        return;
      }
      const units = [...new Set(pictures.map(logoUnit))];
      units.forEach((unit, i) => {
        const li = document.createElement('li');
        // Universal Editor: cell (column) -> its (first) logo item
        if (i === 0) moveInstrumentation(cell, li);
        // Universal Editor: an image paragraph left behind -> the logo
        const holder = unit.parentElement;
        if (holder && holder !== cell && holder.tagName === 'P'
          && holder.querySelectorAll('picture').length === 1
          && holder.textContent.trim() === unit.textContent.trim()) {
          moveInstrumentation(holder, unit);
        }
        const logo = document.createElement('div');
        logo.className = 'columns-logos-logo';
        logo.append(unit);
        li.append(logo);
        ul.append(li);
      });
    });
  });
  if (!lists.length) lists.push(document.createElement('ul'));

  block.replaceChildren(...lists);
}
