import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * columns-text: grid of heading + rich-text blocks (no images), 2 per row on desktop.
 * Authoring: any number of rows, each with 1-2 cells; every non-empty cell is one
 * text block (heading, paragraphs, lists, links). Rows with a single cell still
 * flow into the 2-column grid. Column count follows the widest authored row
 * (1-3); the default is 2.
 * @param {Element} block
 */

export default function decorate(block) {
  const rows = [...block.children];
  // empty cells (e.g. padding added by a Universal Editor save) don't count as columns
  const filled = (cell) => !!(cell.textContent.trim() || cell.querySelector('picture, img'));
  const widest = Math.max(1, ...rows.map((r) => [...r.children].filter(filled).length));
  const cols = Math.min(widest === 1 ? 2 : widest, 3);
  block.classList.add(`columns-text-${cols}-cols`);

  // Universal Editor: every authored row (instrumented) keeps its own grid; otherwise one grid
  const perRow = rows.length > 1 && rows.some((r) => r.hasAttribute('data-aue-resource'));
  const grids = [];
  let grid = null;
  const newGrid = () => {
    grid = document.createElement('div');
    grid.className = 'columns-text-grid';
    grids.push(grid);
  };
  rows.forEach((row) => {
    if (!grid || perRow) newGrid();
    // Universal Editor: row -> grid
    moveInstrumentation(row, grid);
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim() && !cell.querySelector('picture')
        && !cell.hasAttribute('data-aue-resource')) return;
      const item = document.createElement('div');
      item.className = 'columns-text-item';
      // Universal Editor: cell (column) -> text item
      moveInstrumentation(cell, item);
      if (!cell.children.length) {
        const p = document.createElement('p');
        p.textContent = cell.textContent.trim();
        item.append(p);
      } else {
        item.append(...cell.childNodes);
      }
      grid.append(item);
    });
  });
  if (!grid) newGrid();

  block.replaceChildren(...grids);
}
