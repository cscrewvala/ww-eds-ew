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
  const widest = Math.max(1, ...rows.map((r) => r.children.length));
  const cols = Math.min(widest === 1 ? 2 : widest, 3);
  block.classList.add(`columns-text-${cols}-cols`);

  const grid = document.createElement('div');
  grid.className = 'columns-text-grid';
  rows.forEach((row) => {
    [...row.children].forEach((cell) => {
      if (!cell.textContent.trim() && !cell.querySelector('picture')) return;
      const item = document.createElement('div');
      item.className = 'columns-text-item';
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

  block.replaceChildren(grid);
}
