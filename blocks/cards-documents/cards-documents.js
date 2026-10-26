import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-documents: grid of document link lists grouped by year (or topic),
 * 4 groups per row on desktop. Each group: title, divider, list of document links
 * with a type icon (pdf / video / content / link); long link text is truncated
 * with an ellipsis, the full text is shown in a hover tooltip.
 * Each authored row is one group:
 *   cell 1: group title ("2026", "Financial data")
 *   cell 2: links - a bulleted list, or one link per paragraph
 * A single-cell row is tolerated: its first heading/paragraph is the title.
 * @param {Element} block
 */

const VIDEO_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be|vimeo\.com)$/;

/**
 * Icon type for a document link (mirrors the source linkList data-type):
 * pdf, video (YouTube/Vimeo), content (other files: csv, xlsx, ...) or link.
 * @param {HTMLAnchorElement} a
 * @returns {string}
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

function collectLinks(nodes) {
  const links = [];
  nodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'A') links.push(node);
    else links.push(...node.querySelectorAll('a[href]'));
  });
  return links;
}

function buildGroup(row) {
  const li = document.createElement('li');
  li.className = 'cards-documents-group';
  moveInstrumentation(row, li);
  const cells = [...row.children];

  let titleNodes;
  let bodyNodes;
  if (cells.length >= 2) {
    titleNodes = [...cells[0].childNodes];
    bodyNodes = cells.slice(1).flatMap((c) => [...c.childNodes]);
  } else {
    const cell = cells[0] || row;
    const first = cell.firstElementChild;
    const firstLink = first && first.querySelector('a[href]');
    const isLinkOnly = firstLink && first.textContent.trim() === firstLink.textContent.trim();
    // title = first child when it is not itself a link list or a lone link
    if (first && !first.matches('ul, ol') && !isLinkOnly) {
      titleNodes = [first];
      bodyNodes = [...cell.childNodes].filter((n) => n !== first);
    } else {
      titleNodes = [];
      bodyNodes = [...cell.childNodes];
    }
  }

  const titleCell = cells.length >= 2 ? cells[0] : null;
  const titleText = titleNodes.map((n) => n.textContent).join(' ').trim();
  if (titleText || titleCell?.hasAttribute('data-aue-prop')) {
    const title = document.createElement('h3');
    title.className = 'cards-documents-title';
    title.textContent = titleText;
    moveInstrumentation(titleCell, title);
    li.append(title);
  }

  const list = document.createElement('ul');
  list.className = 'cards-documents-list';
  if (cells.length >= 2) moveInstrumentation(cells[1], list);
  collectLinks(bodyNodes).forEach((a) => {
    const item = document.createElement('li');
    item.dataset.type = linkType(a);
    a.className = 'cards-documents-link';
    item.append(a);
    // hover tooltip with the full (possibly truncated) link text, as on the source
    const text = a.textContent.trim();
    if (text) {
      const tip = document.createElement('span');
      tip.className = 'cards-documents-tooltip';
      tip.setAttribute('aria-hidden', 'true');
      tip.textContent = text;
      item.append(tip);
    }
    list.append(item);
  });
  if (list.children.length || list.hasAttribute('data-aue-prop')) li.append(list);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.hasAttribute('data-aue-resource'))
    .forEach((row) => ul.append(buildGroup(row)));
  block.replaceChildren(ul);
}
