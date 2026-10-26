import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-timeline: history timeline - one full-width band per milestone with a
 * text card on one side and the year + image on the other.
 * Each authored row is one milestone (cell order tolerated):
 *   year cell:  short text such as "2023" or "1924-1930"
 *   body cell:  title (heading or first paragraph) + paragraph(s)
 *   image cell: picture
 * The year may also be the first short paragraph of the body cell.
 * Optional FIRST cell: per-row variant text "<band>[, right]" where band is
 * midnight | sky | ocean (e.g. "sky, right"). It sets the band colour
 * (cards-timeline-band-<band>) and puts the card on the right
 * (cards-timeline-right). Without it, bands cycle midnight/sky/ocean and the
 * card alternates sides (even rows right).
 * A short paragraph BEFORE the title heading is the milestone date
 * (cards-timeline-date).
 * @param {Element} block
 */

const YEAR_PATTERN = /^(c\.\s*)?\d{4}(\s*[-–]\s*\d{2,4})?s?$/i;
const BANDS = ['midnight', 'sky', 'ocean'];
const SIDES = ['left', 'right'];

function isYearText(text) {
  return YEAR_PATTERN.test(text.trim());
}

/**
 * Parses a per-row variant cell ("sky, right"). Returns null when the cell is
 * not a variant cell (any token outside the known band / side keywords).
 */
function parseVariant(cell) {
  if (!cell || cell.querySelector('picture, img, h1, h2, h3, h4, h5, h6')) return null;
  const tokens = cell.textContent.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length || !tokens.every((t) => BANDS.includes(t) || SIDES.includes(t))) return null;
  return {
    band: tokens.find((t) => BANDS.includes(t)),
    right: tokens.includes('right'),
  };
}

function buildItem(row, index) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);
  const cells = [...row.children];
  const variant = parseVariant(cells[0]);
  // Universal Editor: an empty band/side cell is still the setting cell
  if (variant || cells[0]?.dataset.aueProp === 'variant') {
    const variantCell = cells.shift();
    variantCell.remove();
    // Universal Editor: the band/side setting stays editable on a hidden element
    if (variantCell.hasAttribute('data-aue-prop')) {
      const setting = document.createElement('span');
      setting.hidden = true;
      setting.textContent = variantCell.textContent.trim();
      moveInstrumentation(variantCell, setting);
      li.append(setting);
    }
  }
  const band = variant?.band || BANDS[index % BANDS.length];
  const right = variant ? variant.right : index % 2 === 1;
  li.className = `cards-timeline-item cards-timeline-band-${band}`;
  if (right) li.classList.add('cards-timeline-right');

  const card = document.createElement('div');
  card.className = 'cards-timeline-card';
  const aside = document.createElement('div');
  aside.className = 'cards-timeline-aside';
  const year = document.createElement('p');
  year.className = 'cards-timeline-year';
  const media = document.createElement('div');
  media.className = 'cards-timeline-image';

  cells.forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !media.children.length) {
      const holder = pic.parentElement;
      media.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
    const text = cell.textContent.trim();
    if (!text) {
      // Universal Editor: empty but editable cells keep their field in place
      moveInstrumentation(cell, cell.dataset.aueProp === 'year' ? year : card);
      return;
    }
    if (!year.textContent && isYearText(text)) {
      year.textContent = text;
      moveInstrumentation(cell, year);
      return;
    }
    // Universal Editor: the text cell's field moves to the card
    moveInstrumentation(cell, card);
    if (!cell.children.length) {
      const p = document.createElement('p');
      p.textContent = text;
      card.append(p);
      return;
    }
    card.append(...cell.childNodes);
  });

  // year authored as the first short paragraph of the body
  if (!year.textContent) {
    const first = card.firstElementChild;
    if (first && isYearText(first.textContent)) {
      year.textContent = first.textContent.trim();
      first.remove();
    }
  }

  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  const title = heading || card.firstElementChild;
  if (title) title.classList.add('cards-timeline-title');

  // date paragraph authored before the title heading
  const lead = card.firstElementChild;
  if (heading && lead !== heading && lead.tagName === 'P' && lead.nextElementSibling === heading) {
    lead.classList.add('cards-timeline-date');
  }

  if (year.textContent || year.hasAttribute('data-aue-prop')) aside.append(year);
  if (media.children.length) aside.append(media);
  li.append(card);
  if (aside.children.length) li.append(aside);
  else li.classList.add('cards-timeline-no-aside');
  return li;
}

export default function decorate(block) {
  const ol = document.createElement('ol');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture')
      || row.hasAttribute('data-aue-resource'))
    .forEach((row, i) => ol.append(buildItem(row, i)));

  ol.querySelectorAll('.cards-timeline-image picture > img').forEach((img) => {
    const picture = createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '750' }, { width: '600' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    img.closest('picture').replaceWith(picture);
  });

  block.replaceChildren(ol);
}
