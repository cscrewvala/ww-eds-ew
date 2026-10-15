import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * cards-profile: leadership profile cards - circular photo, name, role,
 * appointment note and a "Learn more" link, all centered.
 * Each authored row is one person:
 *   cell 1: photo
 *   cell 2: name (heading or first paragraph), role, appointed date, link
 * Cells may be merged or swapped - the photo is detected by its picture.
 * Layout: 2 cards per row; large sets (10+ people, e.g. the executive committee)
 * switch to 3 per row on wide screens.
 * @param {Element} block
 */

const LARGE_SET = 10;

function isLinkOnly(el) {
  const a = el.querySelector('a[href]');
  return a && el.textContent.trim() === a.textContent.trim();
}

function buildCard(row) {
  const li = document.createElement('li');
  const photo = document.createElement('div');
  photo.className = 'cards-profile-image';
  const body = document.createElement('div');
  body.className = 'cards-profile-body';

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !photo.children.length) {
      const holder = pic.parentElement;
      photo.append(pic);
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
    body.append(...[...cell.children].filter((el) => el.textContent.trim()));
  });

  const children = [...body.children];
  const cta = children.length > 1 && isLinkOnly(children[children.length - 1])
    ? children[children.length - 1] : null;
  const name = body.querySelector('h1, h2, h3, h4, h5, h6')
    || children.find((el) => el !== cta) || null;
  if (name) name.classList.add('cards-profile-name');
  if (cta) cta.classList.add('cards-profile-cta');
  const role = children.find((el) => el !== name && el !== cta);
  if (role) role.classList.add('cards-profile-role');
  children
    .filter((el) => el !== name && el !== cta && el !== role)
    .forEach((el) => el.classList.add('cards-profile-note'));

  if (photo.children.length) li.append(photo);
  else li.classList.add('cards-profile-no-image');
  if (body.children.length) li.append(body);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .forEach((row) => ul.append(buildCard(row)));

  ul.querySelectorAll('.cards-profile-image picture > img').forEach((img) => {
    img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }]));
  });

  if (ul.children.length >= LARGE_SET) block.classList.add('cards-profile-large');
  block.replaceChildren(ul);
}
