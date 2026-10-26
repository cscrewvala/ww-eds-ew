import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-stats: row of stat / goal items separated by vertical dividers.
 * Each authored row is one item:
 *   cell 1: figure (e.g. "100%", "~ 100%") - optional
 *   cell 2: caption text
 * A single-cell row is also accepted: a leading heading/strong/short paragraph
 * is treated as the figure, the rest as the caption. Rows with only text and
 * no figure render as goal statements (caption only).
 *
 * Variant `panel` (source hero-stats container with title / intro / CTA):
 *   first row (optional): heading + intro paragraph(s) -> centred panel header
 *   last row (optional):  a single CTA link -> centred outlined button
 * rendered inside a tinted rounded container.
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
  moveInstrumentation(row, li);
  const figure = document.createElement('div');
  figure.className = 'cards-stats-figure';
  const caption = document.createElement('div');
  caption.className = 'cards-stats-caption';

  const cells = [...row.children].filter((c) => c.textContent.trim() || c.querySelector('picture')
    || c.hasAttribute('data-aue-prop'));

  if (cells.length >= 2) {
    moveInstrumentation(cells[0], figure);
    figure.append(...cellContent(cells[0]));
    cells.slice(1).forEach((c) => {
      moveInstrumentation(c, caption);
      caption.append(...cellContent(c));
    });
  } else if (cells.length === 1) {
    moveInstrumentation(cells[0], caption);
    const parts = cellContent(cells[0]);
    if (parts.length > 1 && isFigureCandidate(parts[0])) {
      figure.append(parts.shift());
    }
    caption.append(...parts);
  }

  if (figure.textContent.trim()) {
    li.append(figure);
  } else {
    li.classList.add('cards-stats-no-figure');
    // Universal Editor: keep an empty but editable figure in place
    if (figure.hasAttribute('data-aue-prop')) li.append(figure);
  }
  if (caption.children.length || caption.hasAttribute('data-aue-prop')) li.append(caption);
  return li;
}

/** A row that holds a heading: the panel title (+ intro). */
function isHeaderRow(row) {
  return !!row.querySelector('h1, h2, h3, h4, h5, h6');
}

/** A row whose whole text is one link that is not a figure ("Read our latest report"). */
function isCtaRow(row) {
  const cells = [...row.children].filter((c) => c.textContent.trim());
  if (cells.length !== 1) return false;
  const links = cells[0].querySelectorAll('a[href]');
  if (links.length !== 1) return false;
  const text = cells[0].textContent.trim();
  return links[0].textContent.trim() === text && !isFigureCandidate(links[0]);
}

function buildHeader(row) {
  const header = document.createElement('div');
  header.className = 'cards-stats-header';
  [...row.children].forEach((cell) => {
    moveInstrumentation(cell, header);
    header.append(...cellContent(cell));
  });
  header.querySelectorAll(':scope > p').forEach((p) => p.classList.add('cards-stats-intro'));
  return header;
}

function buildCta(row) {
  const footer = document.createElement('div');
  footer.className = 'cards-stats-cta';
  const a = row.querySelector('a[href]');
  const p = document.createElement('p');
  p.className = 'button-wrapper';
  moveInstrumentation(a.closest('.cards-stats > div > div'), p);
  a.className = 'button secondary';
  p.append(a);
  footer.append(p);
  return footer;
}

export default function decorate(block) {
  const rows = [...block.children]
    .filter((row) => row.textContent.trim() || row.hasAttribute('data-aue-resource'));
  let header;
  let cta;
  if (block.classList.contains('panel')) {
    if (rows.length && isHeaderRow(rows[0])) header = buildHeader(rows.shift());
    if (rows.length && isCtaRow(rows[rows.length - 1])) cta = buildCta(rows.pop());
  }

  const ul = document.createElement('ul');
  rows.forEach((row) => ul.append(buildItem(row)));

  const count = ul.children.length;
  block.classList.add(`cards-stats-${Math.min(count, 4)}-up`);
  if (count === 1) block.classList.add('cards-stats-single');

  block.replaceChildren(...[header, ul, cta].filter(Boolean));
}
