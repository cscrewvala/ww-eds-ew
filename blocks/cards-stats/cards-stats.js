/**
 * cards-stats: row of stat / goal items separated by vertical dividers.
 * Each authored row is one item:
 *   cell 1: figure (e.g. "100%", "~ 100%") - optional
 *   cell 2: caption text
 * A single-cell row is also accepted: a leading heading/strong/short paragraph
 * is treated as the figure, the rest as the caption. Rows with only text and
 * no figure render as goal statements (caption only).
 * @param {Element} block
 */

const FIGURE_MAX_LENGTH = 12;

function isFigureCandidate(el) {
  if (!el) return false;
  if (/^H[1-6]$/.test(el.tagName)) return true;
  const text = el.textContent.trim();
  if (!text || text.length > FIGURE_MAX_LENGTH) return false;
  // short text containing a digit reads as a figure ("100%", "~ 100%", ">20,000")
  return /\d/.test(text);
}

function toParagraph(cell) {
  const p = document.createElement('p');
  p.textContent = cell.textContent.trim();
  return p;
}

function cellContent(cell) {
  if (!cell.children.length) {
    return cell.textContent.trim() ? [toParagraph(cell)] : [];
  }
  return [...cell.children];
}

function buildItem(row) {
  const li = document.createElement('li');
  const figure = document.createElement('div');
  figure.className = 'cards-stats-figure';
  const caption = document.createElement('div');
  caption.className = 'cards-stats-caption';

  const cells = [...row.children].filter((c) => c.textContent.trim() || c.querySelector('picture'));

  if (cells.length >= 2) {
    figure.append(...cellContent(cells[0]));
    cells.slice(1).forEach((c) => caption.append(...cellContent(c)));
  } else if (cells.length === 1) {
    const parts = cellContent(cells[0]);
    if (parts.length > 1 && isFigureCandidate(parts[0])) {
      figure.append(parts.shift());
    }
    caption.append(...parts);
  }

  if (figure.textContent.trim()) li.append(figure);
  else li.classList.add('cards-stats-no-figure');
  if (caption.children.length) li.append(caption);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children]
    .filter((row) => row.textContent.trim())
    .forEach((row) => ul.append(buildItem(row)));

  const count = ul.children.length;
  block.classList.add(`cards-stats-${Math.min(count, 4)}-up`);
  if (count === 1) block.classList.add('cards-stats-single');

  block.replaceChildren(ul);
}
