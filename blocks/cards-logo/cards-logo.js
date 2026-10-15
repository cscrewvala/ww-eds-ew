import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * cards-logo: brand / channel cards - logo on the left, name + link on the right.
 * Grid of fixed-width cards, centered (a single card sits centered on its own).
 * Each authored row is one card:
 *   cell 1: logo image
 *   cell 2: name (heading or paragraph), optional description paragraph(s)/list,
 *           link ("Visit Woolworths", "Follow Us on LinkedIn")
 * Cells may be merged or swapped - the logo is detected by its picture.
 * @param {Element} block
 */

function buildCard(row) {
  const li = document.createElement('li');
  const logo = document.createElement('div');
  logo.className = 'cards-logo-image';
  const body = document.createElement('div');
  body.className = 'cards-logo-body';

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !logo.children.length) {
      const holder = pic.parentElement;
      logo.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
    if (!cell.children.length) {
      const text = cell.textContent.trim();
      if (text) {
        const p = document.createElement('p');
        p.textContent = text;
        body.append(p);
      }
      return;
    }
    body.append(...[...cell.children].filter((el) => el.textContent.trim() || el.querySelector('picture')));
  });

  const children = [...body.children];
  const name = children.find((el) => /^H[1-6]$/.test(el.tagName))
    || children.find((el) => !el.querySelector('a[href]')) || null;
  // CTA = last element that is only a link; description paragraphs may contain inline links.
  const isLinkOnly = (el) => {
    const a = el.querySelector('a[href]');
    return a && a.textContent.trim() === el.textContent.trim();
  };
  const linkEl = children.findLast((el) => el !== name && isLinkOnly(el))
    || children.find((el) => el !== name && el.querySelector('a[href]')) || null;
  if (name) name.classList.add('cards-logo-name');
  if (linkEl) linkEl.classList.add('cards-logo-link');

  // Description (a pop-up on the source): grouped and clamped, with a disclosure toggle.
  const descEls = children.filter((el) => el !== name && el !== linkEl);
  if (descEls.length) {
    const desc = document.createElement('div');
    desc.className = 'cards-logo-description';
    descEls[0].before(desc);
    desc.append(...descEls);
  }

  if (logo.children.length) li.append(logo);
  else li.classList.add('cards-logo-no-image');
  if (body.children.length) li.append(body);
  return li;
}

let toggleId = 0;

/**
 * Adds a "Show more" toggle after a clamped description; shown only while the text overflows.
 * @param {Element} desc .cards-logo-description
 */
function addToggle(desc) {
  toggleId += 1;
  desc.id = desc.id || `cards-logo-description-${toggleId}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cards-logo-toggle';
  button.setAttribute('aria-controls', desc.id);
  button.setAttribute('aria-expanded', 'false');
  button.textContent = 'Show more';
  button.hidden = true;
  desc.after(button);

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Show less' : 'Show more';
    desc.classList.toggle('cards-logo-description-expanded', expanded);
  });

  // Hide the toggle when the clamped text already fits (re-checked on resize / font load).
  const update = () => {
    if (desc.classList.contains('cards-logo-description-expanded')) return;
    button.hidden = desc.scrollHeight <= desc.clientHeight + 1;
  };
  new ResizeObserver(update).observe(desc);
  document.fonts?.ready.then(update);
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .forEach((row) => ul.append(buildCard(row)));

  ul.querySelectorAll('.cards-logo-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '200' }]));
  });

  if (ul.children.length === 1) block.classList.add('cards-logo-single');
  block.replaceChildren(ul);
  block.querySelectorAll('.cards-logo-description').forEach(addToggle);
}
