import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * quote-story: pull quote with a decorative quote mark, an attribution eyebrow
 * and the quote text.
 * Authored rows:
 *   1. quote text (one or more paragraphs)
 *   2. attribution (optional)
 * A single-row block is treated as quote text only.
 * @param {Element} block
 */
function cellContent(row) {
  const cell = row.querySelector(':scope > div') || row;
  const nodes = [...cell.children].filter((el) => el.textContent.trim());
  if (!nodes.length && cell.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = cell.textContent.trim();
    return [p];
  }
  return nodes;
}

export default function decorate(block) {
  // Universal Editor: empty but instrumented rows (new block) stay, so their fields remain editable
  const rows = [...block.querySelectorAll(':scope > div')]
    .filter((r) => r.textContent.trim() || r.querySelector('[data-aue-prop]'));

  const figure = document.createElement('figure');
  figure.className = 'quote-story-figure';

  const createMark = (position) => {
    const mark = document.createElement('span');
    mark.className = `quote-story-mark quote-story-mark-${position}`;
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '"';
    return mark;
  };
  figure.append(createMark('start'));

  const quoteRows = rows.length > 1 ? rows.slice(0, -1) : rows;
  const attributionRow = rows.length > 1 ? rows[rows.length - 1] : null;

  if (attributionRow) {
    const caption = document.createElement('figcaption');
    caption.className = 'quote-story-attribution';
    caption.append(...cellContent(attributionRow));
    // Universal Editor: attribution cell -> figcaption
    moveInstrumentation(attributionRow.querySelector(':scope > div'), caption);
    figure.append(caption);
  }

  const quote = document.createElement('blockquote');
  quote.className = 'quote-story-text';
  quoteRows.forEach((row) => quote.append(...cellContent(row)));
  // Universal Editor: quote cell -> blockquote
  if (quoteRows[0]) moveInstrumentation(quoteRows[0].querySelector(':scope > div'), quote);
  figure.append(quote, createMark('end'));

  block.replaceChildren(figure);
}
