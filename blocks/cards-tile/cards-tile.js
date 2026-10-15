import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * cards-tile: equal-width tiles (3 per row on desktop, 4 when the block holds 4 tiles).
 * Each authored row is one tile:
 *   cell 1: image
 *   cell 2: title (heading or paragraph, usually linked), optional description, link ("Click here")
 * Authors may omit/merge cells; image vs. body content is detected by content, not position.
 *
 * Two looks, picked from the content:
 *   - link tile (default): image + title + CTA, the whole tile is clickable.
 *   - text tile (`.cards-tile-text`): image + title + description (+ inline CTA),
 *     used when any tile carries descriptive text.
 * Variant `cols-2`: two columns of up to 572px (source two-50-50 container).
 * A tile whose CTA points at a video becomes a video tile (`.cards-tile-video`).
 * @param {Element} block
 */

function classifyBody(body) {
  const children = [...body.children];
  if (!children.length) return;

  let title = body.querySelector('h1, h2, h3, h4, h5, h6');
  const paragraphs = children.filter((el) => el.tagName === 'P');

  // CTA: the last link-only paragraph, when it is not the only piece of text.
  const last = paragraphs[paragraphs.length - 1];
  const isLinkOnly = (p) => {
    const a = p && p.querySelector('a[href]');
    return a && p.textContent.trim() === a.textContent.trim();
  };
  let cta = null;
  if (last && isLinkOnly(last) && children.length > 1 && last !== title) cta = last;

  // No heading authored: the first non-CTA paragraph acts as the title.
  if (!title) title = paragraphs.find((p) => p !== cta) || null;

  if (title) title.classList.add('cards-tile-title');
  if (cta) cta.classList.add('cards-tile-cta');
  children.forEach((el) => {
    if (el !== title && el !== cta && el.textContent.trim()) el.classList.add('cards-tile-description');
  });
}

function buildTile(row) {
  const li = document.createElement('li');
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-tile-card-image';
  const body = document.createElement('div');
  body.className = 'cards-tile-card-body';

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !imageWrap.children.length) {
      const holder = pic.closest('p');
      imageWrap.append(pic);
      if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) {
        holder.remove();
      }
    }
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
      if (child.tagName === 'PICTURE') return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      body.append(child);
    });
  });

  classifyBody(body);

  if (imageWrap.children.length) li.append(imageWrap);
  else li.classList.add('cards-tile-no-image');
  if (body.children.length) li.append(body);
  return li;
}

/**
 * Link tiles are clickable as a whole (source: the tile is one anchor).
 * The title becomes the primary link (reusing the CTA target when the title is unlinked)
 * and stretches over the tile; the CTA stays a separate, hoverable link above it.
 * @param {Element} li
 */
function linkTile(li) {
  const title = li.querySelector('.cards-tile-title');
  const ctaLink = li.querySelector('.cards-tile-cta a[href]');
  if (!title) return;
  let primary = title.querySelector('a[href]');
  if (!primary && ctaLink) {
    primary = document.createElement('a');
    primary.href = ctaLink.href;
    if (ctaLink.target) primary.target = ctaLink.target;
    primary.append(...title.childNodes);
    title.append(primary);
  }
  if (!primary) return;
  primary.classList.add('cards-tile-link');
  li.classList.add('cards-tile-linked');
}

const VIDEO_HREF = /\.(mp4|webm|mov|m3u8)([?#]|$)|\/s7viewers\/|youtube\.com|youtu\.be|vimeo\.com/i;

/**
 * Video tile (source .cmp-teaser--tile-video): play icon over the thumbnail, no CTA row.
 * The CTA keeps working as the card link: its target is the stretched title link
 * and its text ("Watch video") stays in that link for assistive tech only.
 * Call after linkTile().
 * @param {Element} li
 */
function videoTile(li) {
  const cta = li.querySelector('.cards-tile-cta');
  const ctaLink = cta && cta.querySelector('a[href]');
  const primary = li.querySelector('.cards-tile-link');
  if (!ctaLink || !primary || !VIDEO_HREF.test(ctaLink.getAttribute('href'))) return;
  if (primary !== ctaLink) {
    const label = document.createElement('span');
    label.className = 'cards-tile-sr-only';
    label.textContent = ` ${ctaLink.textContent.trim()}`;
    primary.append(label);
    cta.remove();
  }
  li.classList.add('cards-tile-video');
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture'))
    .forEach((row) => ul.append(buildTile(row)));

  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '600' }, { width: '750' }]),
    );
  });

  const tiles = [...ul.children];
  // `cols-2` (source two-50-50 container of .contenttile teasers): link tiles even when they
  // carry a description, as long as every tile has a CTA; long-copy tiles keep the text look.
  const cols2 = block.classList.contains('cols-2');
  const linkLook = cols2 && tiles.every((li) => li.querySelector('.cards-tile-cta'));
  const isText = !linkLook && !!ul.querySelector('.cards-tile-description');
  if (isText) {
    block.classList.add('cards-tile-text');
    tiles.forEach((li) => {
      if (li.querySelector('a[href]')) li.classList.add('cards-tile-linked');
    });
  } else {
    tiles.forEach((li) => {
      linkTile(li);
      videoTile(li);
    });
  }
  if (tiles.length === 4 && !cols2) block.classList.add('cards-tile-cols-4');

  block.replaceChildren(ul);
}
