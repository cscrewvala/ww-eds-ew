import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * cards-timeline: history timeline - one full-width band per milestone with a
 * text card on one side and the year + image on the other.
 * Each authored row is one milestone (cell order tolerated):
 *   year cell:  short text such as "2023" or "1924-1930"
 *   body cell:  title (heading or first paragraph) + paragraph(s)
 *   image cell: picture
 * The year may also be the first short paragraph of the body cell.
 * Each item gets a cycling class (cards-timeline-band-1..3) as a hook for the
 * alternating band treatment applied by the design pass.
 * @param {Element} block
 */

const YEAR_PATTERN = /^(c\.\s*)?\d{4}(\s*[-–]\s*\d{2,4})?s?$/i;
const BAND_CYCLE = 3;

function isYearText(text) {
  return YEAR_PATTERN.test(text.trim());
}

function buildItem(row, index) {
  const li = document.createElement('li');
  li.className = `cards-timeline-item cards-timeline-band-${(index % BAND_CYCLE) + 1}`;

  const card = document.createElement('div');
  card.className = 'cards-timeline-card';
  const aside = document.createElement('div');
  aside.className = 'cards-timeline-aside';
  const year = document.createElement('p');
  year.className = 'cards-timeline-year';
  const media = document.createElement('div');
  media.className = 'cards-timeline-image';

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !media.children.length) {
      const holder = pic.parentElement;
      media.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
    const text = cell.textContent.trim();
    if (!text) return;
    if (!year.textContent && isYearText(text)) {
      year.textContent = text;
      return;
    }
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

  const title = card.querySelector('h1, h2, h3, h4, h5, h6') || card.firstElementChild;
  if (title) title.classList.add('cards-timeline-title');

  if (year.textContent) aside.append(year);
  if (media.children.length) aside.append(media);
  li.append(card);
  if (aside.children.length) li.append(aside);
  else li.classList.add('cards-timeline-no-aside');
  return li;
}

export default function decorate(block) {
  const ol = document.createElement('ol');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .forEach((row, i) => ol.append(buildItem(row, i)));

  ol.querySelectorAll('.cards-timeline-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '750' }, { width: '600' }]),
    );
  });

  block.replaceChildren(ol);
}
