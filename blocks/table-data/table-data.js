import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * table-data: semantic data table.
 *
 * Authored rows: first row = column headers, subsequent rows = data.
 * Cells may contain links or other inline rich text, which is preserved.
 * Rows with fewer cells than the header are padded so columns stay aligned.
 *
 * Styles:
 * - default ("list"): borderless rows with light rules, link icon on link
 *   cells; on mobile each row stacks into a labelled card.
 * - "bordered": plain ruled grid (e.g. dividend history).
 * When no style is authored, tables without any links render "bordered".
 */

function moveContent(from, to) {
  // Unwrap a lone paragraph so cells don't carry paragraph margins.
  const only = from.children.length === 1 && from.firstElementChild.tagName === 'P'
    && from.childNodes.length === 1 ? from.firstElementChild : null;
  const source = only || from;
  while (source.firstChild) to.append(source.firstChild);
}

export default function decorate(block) {
  const rows = [...block.children].filter((row) => row.children.length);
  if (!rows.length) return;

  const columnCount = Math.max(...rows.map((row) => row.children.length));
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const labels = [];

  rows.forEach((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const tr = document.createElement('tr');
    moveInstrumentation(row, tr);
    const cells = [...row.children];
    for (let i = 0; i < columnCount; i += 1) {
      const cell = document.createElement(isHeader ? 'th' : 'td');
      if (cells[i]) {
        moveInstrumentation(cells[i], cell);
        moveContent(cells[i], cell);
      }
      if (isHeader) {
        cell.scope = 'col';
        labels[i] = cell.textContent.trim();
      } else {
        if (labels[i]) cell.dataset.label = labels[i];
        if (cell.querySelector('a[href]')) cell.classList.add('table-data-link');
      }
      tr.append(cell);
    }
    (isHeader ? thead : tbody).append(tr);
  });

  if (!block.classList.contains('bordered') && !block.classList.contains('list')
    && !tbody.querySelector('a[href]')) {
    block.classList.add('bordered');
  }

  table.append(thead, tbody);
  const scroller = document.createElement('div');
  scroller.className = 'table-data-scroll';
  scroller.append(table);
  block.replaceChildren(scroller);
}
