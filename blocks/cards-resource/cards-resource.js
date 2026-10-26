import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-resource: centred resource cards (3 per row on desktop) or
 * "policy document" frames (icon left, stacked).
 * Each authored row is one card:
 *   cell 1: icon / logo image (optional; may be left empty)
 *   cell 2: title (heading or bold paragraph), description, CTA link
 * Authors may merge everything into one cell or omit the icon; icon vs. body
 * content is detected by content, not position.
 *
 * Layouts:
 * - default: centred cards; collapses to an accordion below 768px (source).
 * - documents: used when the block has the `documents` class, or when every
 *   card has an empty icon cell (source inline-SVG icons were not migrated).
 *   Empty icon cells get the default document icon shipped with the block.
 * @param {Element} block
 */

const MOBILE_MQ = window.matchMedia('(width < 768px)');
let uid = 0;

const isLinkOnly = (el) => {
  const a = el && el.querySelector('a[href]');
  return !!a && el.textContent.trim() === a.textContent.trim();
};

function classifyBody(body) {
  const children = [...body.children];
  if (!children.length) return null;

  // CTA: trailing link-only paragraphs (allow more than one button).
  const ctas = [];
  for (let i = children.length - 1; i > 0; i -= 1) {
    if (children[i].tagName === 'P' && isLinkOnly(children[i])) ctas.unshift(children[i]);
    else break;
  }

  let title = body.querySelector('h1, h2, h3, h4, h5, h6');
  if (!title) title = children.find((el) => el.tagName === 'P' && !ctas.includes(el)) || null;

  children.forEach((el) => {
    if (el === title) el.classList.add('cards-resource-title');
    else if (ctas.includes(el)) {
      el.classList.add('cards-resource-cta');
      el.classList.remove('button-wrapper');
      const a = el.querySelector('a[href]');
      if (a && /^https?:/i.test(a.href) && new URL(a.href).origin !== window.location.origin) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.classList.add('cards-resource-external');
      }
    } else el.classList.add('cards-resource-description');
  });

  if (ctas.length > 1) {
    const actions = document.createElement('div');
    actions.className = 'cards-resource-actions';
    ctas[0].before(actions);
    actions.append(...ctas);
  }
  return title;
}

const hasMedia = (el) => !!el.querySelector('picture, img, svg');

function buildCard(row) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);
  const icon = document.createElement('div');
  icon.className = 'cards-resource-icon';
  const body = document.createElement('div');
  body.className = 'cards-resource-body';

  const cells = [...row.children];
  // an authored-but-empty icon cell marks a "document" frame
  const emptyIconCell = cells.length > 1 && !cells[0].textContent.trim() && !hasMedia(cells[0]);

  cells.forEach((cell) => {
    // Universal Editor: the text cell's field moves to the card body
    moveInstrumentation(cell, body);
    if (!cell.children.length) {
      const value = cell.textContent.trim();
      if (value) {
        const p = document.createElement('p');
        p.textContent = value;
        body.append(p);
      }
      return;
    }
    [...cell.children].forEach((child) => {
      const pic = child.tagName === 'PICTURE' ? child : child.querySelector('picture');
      if (pic) {
        if (!icon.children.length) icon.append(pic);
        // picture-only wrapper (or the picture itself): nothing left for the body
        if (child === pic || !child.textContent.trim()) return;
      }
      body.append(child);
    });
  });

  const title = classifyBody(body);

  if (emptyIconCell && !icon.children.length) {
    li.classList.add('cards-resource-document');
    const img = document.createElement('img');
    img.src = `${window.hlx?.codeBasePath || ''}/blocks/cards-resource/document.svg`;
    img.alt = '';
    img.width = 64;
    img.height = 64;
    img.loading = 'lazy';
    icon.append(img);
  }

  if (icon.children.length) li.append(icon);
  else li.classList.add('cards-resource-no-icon');
  if (body.children.length || body.hasAttribute('data-aue-prop')) li.append(body);
  return { li, title };
}

/**
 * Default layout: header (icon + title + mobile toggle) and a collapsible
 * content area (description + CTA). The toggle is hidden at >= 768px, where
 * the content is always visible.
 */
function buildAccordion(li, title) {
  const icon = li.querySelector(':scope > .cards-resource-icon');
  const body = li.querySelector(':scope > .cards-resource-body');
  if (!body) return;

  const header = document.createElement('div');
  header.className = 'cards-resource-header';
  if (icon) header.append(icon);
  if (title) header.append(title);

  const content = document.createElement('div');
  uid += 1;
  content.id = `cards-resource-content-${uid}`;
  content.className = 'cards-resource-content';
  content.append(...body.children);
  if (!content.children.length) {
    // Universal Editor: an empty but editable body stays in place
    li.replaceChildren(header, ...(body.hasAttribute('data-aue-prop') ? [body] : []));
    return;
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'cards-resource-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', content.id);
  toggle.setAttribute('aria-label', title ? `Show details: ${title.textContent.trim()}` : 'Show details');
  header.append(toggle);

  body.replaceChildren(content);
  li.replaceChildren(header, body);

  header.addEventListener('click', () => {
    if (!MOBILE_MQ.matches) return;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    li.classList.toggle('cards-resource-open', open);
  });
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  const cards = [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture')
      || row.hasAttribute('data-aue-resource'))
    .map((row) => {
      const card = buildCard(row);
      ul.append(card.li);
      return card;
    });

  ul.querySelectorAll('.cards-resource-icon picture > img').forEach((img) => {
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    img.closest('picture').replaceWith(picture);
  });

  const documents = block.classList.contains('documents')
    || (cards.length > 0 && cards.every(({ li }) => li.classList.contains('cards-resource-document')));

  if (documents) {
    block.classList.add('cards-resource-documents');
    ul.querySelectorAll(':scope > li > .cards-resource-body').forEach((body) => {
      body.className = 'cards-resource-frame';
    });
  } else {
    block.classList.add('cards-resource-cards');
    cards.forEach(({ li, title }) => buildAccordion(li, title));
  }

  block.classList.add(`cards-resource-count-${Math.min(ul.children.length, 4)}`);
  block.replaceChildren(ul);
}
