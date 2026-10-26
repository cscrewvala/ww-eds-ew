import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * accordion-program: stacked collapsible items (native <details>/<summary>).
 * Each authored row is one item:
 *   cell 1: label (plain text or heading)
 *   cell 2: body (rich text, lists, links, images)
 * Single-cell rows are tolerated: the first heading/paragraph becomes the label,
 * the rest the body. Group headings ("Climate: towards net zero") are authored as
 * default content above each accordion block.
 *
 * Inside a panel, a bulleted list whose items are each a single bare link
 * (<li><a>..</a></li>, as on the investor pages) is rendered as a document link
 * list: type icon (pdf / video / content / link, same icons as cards-documents),
 * single-line truncated link with a hover tooltip. A heading directly before such
 * a list (e.g. the month on ASX announcements) is styled as the list title.
 *
 * Runs of consecutive image-only paragraphs are grouped into an image grid
 * (3-up from 600px), and tables are wrapped in a horizontal scroller.
 *
 * Variants (block classes):
 * - open-first:    the first item is expanded on load (investor accordions)
 * - berry-bullets: plain (non-link) bullet lists use berry dot bullets
 *                  (source .custom-bullets--berry, e.g. dividends)
 * - inset:         panel content inset 31px / 44px (>=900px), for source panels
 *                  that wrap their content in an inner container
 * @param {Element} block
 */

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com)$/;
const FOOTNOTE_START = /^\(\d{1,2}\)\s/;
const FOOTNOTE_MARK = /(\S)(\(\d{1,2}\))(?=\s|$)/g;

/**
 * Icon type for a document link (mirrors the source linkList data-type).
 * @param {HTMLAnchorElement} a
 * @returns {string} pdf | video | content | link
 */
function linkType(a) {
  let url;
  try {
    url = new URL(a.getAttribute('href') || '', window.location.href);
  } catch (e) {
    return 'link';
  }
  if (/\.pdf$/i.test(url.pathname)) return 'pdf';
  if (VIDEO_HOSTS.test(url.hostname)) return 'video';
  // other downloadable files (csv, xlsx, docx, ...) use the "content" icon
  if (/\.(?!html?$)[a-z0-9]{2,5}$/i.test(url.pathname)) return 'content';
  return 'link';
}

/** true when every <li> holds exactly one link and nothing else */
function isLinkList(ul) {
  const items = [...ul.children];
  return items.length > 0 && items.every((li) => {
    const only = li.children.length === 1 ? li.firstElementChild : null;
    return only && only.tagName === 'A' && only.hasAttribute('href')
      && li.textContent.trim() === only.textContent.trim();
  });
}

function decorateLinkLists(body) {
  body.querySelectorAll(':scope > ul').forEach((ul) => {
    if (!isLinkList(ul)) return;
    ul.classList.add('accordion-program-links');
    const prev = ul.previousElementSibling;
    if (prev && /^H[2-6]$/.test(prev.tagName)) prev.classList.add('accordion-program-links-title');
    [...ul.children].forEach((li) => {
      const a = li.firstElementChild;
      li.dataset.type = linkType(a);
      a.classList.add('accordion-program-link');
      const text = a.textContent.trim();
      if (text) {
        // full link text on hover, as on the source (long titles are truncated)
        const tip = document.createElement('span');
        tip.className = 'accordion-program-tooltip';
        tip.setAttribute('aria-hidden', 'true');
        tip.textContent = text;
        li.append(tip);
      }
    });
  });
}

/** true for a <picture>, or a <p>/<a> whose only content is one picture */
function isImageOnly(el) {
  if (el.tagName === 'PICTURE') return true;
  if (!/^(P|A)$/.test(el.tagName) || el.children.length !== 1) return false;
  const child = el.firstElementChild;
  return el.textContent.trim() === ''
    && (child.tagName === 'PICTURE' || child.tagName === 'IMG' || isImageOnly(child));
}

/** group runs of consecutive image-only elements into an image grid */
function decorateImages(body) {
  let run = [];
  const flush = () => {
    if (run.length) {
      const grid = document.createElement('div');
      grid.className = 'accordion-program-images';
      run[0].before(grid);
      grid.append(...run);
    }
    run = [];
  };
  [...body.children].forEach((el) => {
    if (isImageOnly(el)) run.push(el);
    else flush();
  });
  flush();
}

/** wrap tables so wide ones scroll instead of overflowing the panel */
function decorateTables(body) {
  body.querySelectorAll('table').forEach((table) => {
    if (table.parentElement.classList.contains('accordion-program-table')) return;
    const wrap = document.createElement('div');
    wrap.className = 'accordion-program-table';
    table.before(wrap);
    wrap.append(table);
  });
}

function footnoteSpan(nodes) {
  const span = document.createElement('span');
  span.className = 'accordion-program-footnote';
  span.append(...nodes);
  return span;
}

/**
 * Small-print footnotes: a paragraph starting "(1) ..." and the matching "(1)"
 * markers in the body text are rendered small, as on the source.
 */
function decorateFootnotes(body) {
  const notes = [...body.querySelectorAll(':scope > p')]
    .filter((p) => FOOTNOTE_START.test(p.textContent.trim()));
  if (!notes.length) return;
  notes.forEach((p) => p.classList.add('accordion-program-footnote-note'));

  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.parentElement.closest('.accordion-program-footnote-note, a')) textNodes.push(node);
  }
  textNodes.forEach((node) => {
    const text = node.nodeValue;
    const matches = [...text.matchAll(FOOTNOTE_MARK)];
    if (!matches.length) return;
    const frag = document.createDocumentFragment();
    let last = 0;
    matches.forEach((m) => {
      frag.append(text.slice(last, m.index) + m[1], footnoteSpan([m[2]]));
      last = m.index + m[0].length;
    });
    frag.append(text.slice(last));
    node.replaceWith(frag);
  });
}

function splitSingleCell(cell) {
  const label = document.createElement('div');
  const body = document.createElement('div');
  const children = [...cell.children];
  if (!children.length) {
    label.textContent = cell.textContent.trim();
    return { label, body };
  }
  label.append(children.shift());
  body.append(...children);
  return { label, body };
}

function buildItem(row, index, blockId) {
  const cells = [...row.children];
  let labelCell;
  let bodyCell;
  if (cells.length >= 2) {
    [labelCell, bodyCell] = cells;
    // extra cells are appended to the body rather than dropped
    cells.slice(2).forEach((c) => bodyCell.append(...c.childNodes));
  } else {
    ({ label: labelCell, body: bodyCell } = splitSingleCell(cells[0] || row));
    // Universal Editor: a single-cell row's field stays with the label
    moveInstrumentation(cells[0], labelCell);
  }

  const summary = document.createElement('summary');
  summary.className = 'accordion-program-item-label';
  const title = document.createElement('span');
  title.className = 'accordion-program-item-title';
  // unwrap a lone heading/paragraph so the summary holds inline text
  const only = labelCell.children.length === 1 ? labelCell.firstElementChild : null;
  if (only && /^(P|H[1-6])$/.test(only.tagName)) {
    title.append(...only.childNodes);
  } else {
    title.append(...labelCell.childNodes);
  }
  summary.append(title);
  // Universal Editor: label cell -> summary
  moveInstrumentation(labelCell, summary);

  const body = document.createElement('div');
  body.className = 'accordion-program-item-body';
  body.id = `${blockId}-panel-${index}`;
  body.append(...bodyCell.childNodes);
  // Universal Editor: body cell -> panel
  moveInstrumentation(bodyCell, body);

  const details = document.createElement('details');
  details.className = 'accordion-program-item';
  // Universal Editor: row (item) -> details
  moveInstrumentation(row, details);
  details.append(summary);
  if (body.textContent.trim() || body.querySelector('picture, img')) {
    decorateLinkLists(body);
    decorateFootnotes(body);
    decorateImages(body);
    decorateTables(body);
    details.append(body);
  } else {
    details.classList.add('accordion-program-item-empty');
  }
  return details;
}

let blockCount = 0;

export default function decorate(block) {
  blockCount += 1;
  const blockId = `accordion-program-${blockCount}`;
  const items = [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .map((row, i) => buildItem(row, i, blockId));

  items.forEach((details) => {
    details.querySelectorAll('picture > img').forEach((img) => {
      const picture = createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '1200' }, { width: '750' }]);
      moveInstrumentation(img, picture.querySelector('img'));
      img.closest('picture').replaceWith(picture);
    });
  });

  if (block.classList.contains('open-first')) {
    const first = items.find((details) => !details.classList.contains('accordion-program-item-empty'));
    if (first) first.open = true;
  }

  block.replaceChildren(...items);
}

/**
 * Universal Editor: opens the accordion item that contains `itemEl` (e.g. the selected item
 * or one of its fields). Other items keep their state.
 * @param {Element} block the accordion-program block
 * @param {Element} itemEl the item (<details>) or an element inside it
 */
export function openItem(block, itemEl) {
  const details = itemEl && itemEl.closest('details.accordion-program-item');
  if (details && block.contains(details)) details.open = true;
}
