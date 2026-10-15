import { createOptimizedPicture } from '../../scripts/scripts.js';

/**
 * columns-spotlight: media card on the left, heading + text + CTA on the right.
 * One authored row, two cells (order tolerated - the cell with the picture is the media):
 *   media cell: poster image, optional link to a video (Scene7 viewer / DAM / mp4),
 *               optional caption paragraph(s)
 *   text cell:  heading, paragraph(s), optional CTA link
 * When a video link is present the poster becomes a play button that opens a
 * modal player; nothing video-related loads until the click.
 * @param {Element} block
 */

const DIRECT_VIDEO = /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i;

function isImageUrl(href) {
  return /\/is\/image\//i.test(href) || /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(href);
}

function isVideoUrl(href) {
  return /^(https?:)?\/\//i.test(href) && !isImageUrl(href)
    && (/s7viewers|\/is\/content\/|youtube\.com|youtu\.be|vimeo\.com|\/content\/dam\//i.test(href)
      || DIRECT_VIDEO.test(href));
}

function buildPlayer(url, title) {
  if (DIRECT_VIDEO.test(url) || /\/is\/content\//i.test(url)) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true;
    return video;
  }
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = title || 'Video player';
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
  return iframe;
}

function openModal(url, title, trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'columns-spotlight-dialog';
  dialog.setAttribute('aria-label', title || 'Video');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'columns-spotlight-close';
  close.setAttribute('aria-label', 'Close video');
  close.textContent = '×';
  const frame = document.createElement('div');
  frame.className = 'columns-spotlight-player';
  frame.append(buildPlayer(url, title));
  dialog.append(close, frame);
  // dialog is appended to body; keep it scoped via the block class for CSS
  dialog.classList.add('columns-spotlight');
  document.body.append(dialog);

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { dialog.remove(); trigger.focus(); });
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  close.focus();
}

// aem.js wrapTextNodes() wraps a cell holding a bare <picture> plus <p>s in one
// outer <p>, yielding invalid <p><picture><p>..</p></p>; unwrap it again
function unwrapNestedParagraphs(cell) {
  cell.querySelectorAll(':scope > p').forEach((p) => {
    if (p.querySelector(':scope > p, :scope > picture, :scope > div')) p.replaceWith(...p.childNodes);
  });
}

function decorateMedia(cell) {
  cell.classList.add('columns-spotlight-media');
  unwrapNestedParagraphs(cell);
  const picture = cell.querySelector('picture');
  const videoLink = [...cell.querySelectorAll('a[href]')]
    .find((a) => isVideoUrl(a.getAttribute('href') || ''));

  const poster = document.createElement('div');
  poster.className = 'columns-spotlight-poster';
  if (picture) {
    const holder = picture.parentElement;
    poster.append(picture);
    if (holder && holder !== cell && !holder.textContent.trim() && !holder.querySelector('picture')) holder.remove();
  }

  const caption = document.createElement('div');
  caption.className = 'columns-spotlight-caption';

  let url = '';
  if (videoLink) {
    url = videoLink.href;
    const p = videoLink.closest('p');
    // drop the raw video link (and its wrapper if it held nothing else)
    if (p && p.textContent.trim() === videoLink.textContent.trim()) p.remove();
    else videoLink.remove();
  }
  [...cell.childNodes].forEach((n) => {
    if (n.nodeType === Node.ELEMENT_NODE || n.textContent.trim()) caption.append(n);
  });

  const title = caption.textContent.trim();
  if (url && picture) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'columns-spotlight-play';
    button.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
    button.append(...poster.childNodes);
    const icon = document.createElement('span');
    icon.className = 'columns-spotlight-play-icon';
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    button.addEventListener('click', () => openModal(url, title, button));
    poster.append(button);
  }

  const card = document.createElement('div');
  card.className = 'columns-spotlight-card';
  if (poster.children.length) card.append(poster);
  if (caption.textContent.trim()) {
    card.classList.add('columns-spotlight-card-captioned');
    card.append(caption);
  }
  cell.replaceChildren(card);
}

const CONTACT_HREF = /^(mailto|tel):/i;

function isLinkOnly(p) {
  const a = p.querySelector('a[href]');
  return a && p.textContent.trim() === a.textContent.trim() ? a : null;
}

function isStrongOnly(p) {
  const s = p?.tagName === 'P' && p.querySelector('strong, b');
  return !!s && p.textContent.trim() === s.textContent.trim();
}

/* "Contact X" (bold) + mailto/tel link -> icon contact panel (source .contact-panel) */
function decorateContacts(cell) {
  [...cell.querySelectorAll(':scope > p')].forEach((p) => {
    const a = isLinkOnly(p);
    if (!a || !CONTACT_HREF.test(a.getAttribute('href') || '')) return;
    const panel = document.createElement('div');
    panel.className = 'columns-spotlight-contact';
    if (/^mailto:/i.test(a.getAttribute('href'))) panel.classList.add('columns-spotlight-contact-mail');
    const prev = p.previousElementSibling;
    p.replaceWith(panel);
    if (isStrongOnly(prev)) {
      prev.classList.add('columns-spotlight-contact-title');
      panel.append(prev);
    }
    p.classList.add('columns-spotlight-contact-value');
    panel.append(p);
  });
}

function decorateText(cell) {
  cell.classList.add('columns-spotlight-text');
  decorateContacts(cell);
  const links = [...cell.querySelectorAll(':scope > p')].filter((p) => {
    const a = isLinkOnly(p);
    return a && !CONTACT_HREF.test(a.getAttribute('href') || '');
  });
  const last = links[links.length - 1];
  if (last && last === cell.lastElementChild) last.classList.add('columns-spotlight-cta');
}

export default function decorate(block) {
  // flatten every authored cell (any number of rows) into a single 2-column row
  const cells = [...block.querySelectorAll(':scope > div > div')]
    .filter((c) => c.textContent.trim() || c.querySelector('picture'));
  const mediaCell = cells.find((c) => c.querySelector('picture')) || null;
  const textCells = cells.filter((c) => c !== mediaCell);

  const row = document.createElement('div');
  row.className = 'columns-spotlight-row';
  if (mediaCell) {
    decorateMedia(mediaCell);
    row.append(mediaCell);
  }
  if (textCells.length) {
    const text = textCells[0];
    textCells.slice(1).forEach((c) => text.append(...c.childNodes));
    decorateText(text);
    row.append(text);
  }
  if (!mediaCell) block.classList.add('columns-spotlight-no-media');

  row.querySelectorAll('.columns-spotlight-poster picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '1200' }, { width: '750' }]),
    );
  });

  block.replaceChildren(row);
}
