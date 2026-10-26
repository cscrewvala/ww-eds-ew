import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-video: grid of video message cards (poster + play button + title + date).
 * Clicking a card's play button (or title) opens the video in a modal; the player
 * is only created on click.
 *
 * Authored rows, one per card (cell order tolerated):
 *   cell 1: poster image
 *   cell 2: link to the video (Scene7 viewer / DAM / .mp4 URL, title as link text) + date paragraph
 */

const DIRECT_VIDEO = /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i;

// Play glyph from the source card (.card__video svg); drop shadow applied in CSS.
const PLAY_ICON = `<svg class="cards-video-play-icon" width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
<path d="M49.6345 33.9048C50.401 33.4348 50.401 32.3213 49.6345 31.8514L27.8526 18.497C27.0501 18.005 26.0188 18.5824 26.0188 19.5237V46.2325C26.0188 47.1737 27.0501 47.7511 27.8526 47.2592L49.6345 33.9048Z" fill="#fff" fill-opacity="0.92"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M34.75 58.0179C48.7175 58.0179 60.0403 46.695 60.0403 32.7275C60.0403 18.7601 48.7175 7.43722 34.75 7.43722C20.7825 7.43722 9.45968 18.7601 9.45968 32.7275C9.45968 46.695 20.7825 58.0179 34.75 58.0179ZM34.75 60.7275C50.214 60.7275 62.75 48.1915 62.75 32.7275C62.75 17.2636 50.214 4.72754 34.75 4.72754C19.286 4.72754 6.75 17.2636 6.75 32.7275C6.75 48.1915 19.286 60.7275 34.75 60.7275Z" fill="#fff" fill-opacity="0.92"/>
</svg>`;

function isImageUrl(href) {
  return /\/is\/image\//i.test(href) || /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(href);
}

function findVideoLink(row) {
  const links = [...row.querySelectorAll('a[href]')]
    .filter((a) => !isImageUrl(a.getAttribute('href') || ''));
  return links.find((a) => /scene7|s7viewers|\/is\/content\/|adobeaemcloud|\/content\/dam\/|youtube|vimeo/i.test(a.href)
    || DIRECT_VIDEO.test(a.href)) || links[0] || null;
}

function buildPlayer(url, title) {
  if (DIRECT_VIDEO.test(url) || /\/is\/content\//i.test(url)) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true; // only after an explicit user click
    return video;
  }
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.title = title || 'Video player';
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  return iframe;
}

function openModal(url, title, trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'cards-video-dialog';
  dialog.setAttribute('aria-label', title || 'Video');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cards-video-close';
  close.setAttribute('aria-label', 'Close video');
  close.textContent = '×';

  const frame = document.createElement('div');
  frame.className = 'cards-video-player';
  frame.append(buildPlayer(url, title));

  dialog.append(close, frame);
  document.body.append(dialog);

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.remove(); // removing the player stops playback
    trigger.focus();
  });

  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  close.focus();
}

function decorateCard(row) {
  const li = document.createElement('li');
  li.className = 'cards-video-card';
  moveInstrumentation(row, li);

  const link = findVideoLink(row);
  const url = link ? link.href : '';
  const title = link ? link.textContent.trim() : '';

  const img = row.querySelector('picture img, img');
  const media = document.createElement('div');
  media.className = 'cards-video-media';
  if (img) {
    const picture = createOptimizedPicture(img.src, img.alt || '', false, [{ width: '750' }]);
    moveInstrumentation(img, picture.querySelector('img'));
    media.append(picture);
  } else {
    li.classList.add('no-poster');
  }

  const body = document.createElement('div');
  body.className = 'cards-video-body';
  [...row.children].forEach((cell) => {
    // Universal Editor: the text cell's field moves to the card body
    moveInstrumentation(cell, body);
    if (!cell.children.length && cell.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      body.append(p);
      return;
    }
    [...cell.children].forEach((child) => {
      if (child.tagName === 'PICTURE' || child.tagName === 'IMG') return;
      if (child.querySelector('picture, img') && !child.textContent.trim()) return;
      if (!child.textContent.trim()) return;
      body.append(child);
    });
  });

  // Title: the paragraph/heading holding the video link, else the first heading.
  const titleEl = (link && body.contains(link) && link.closest('.cards-video-body > *'))
    || body.querySelector('h2, h3, h4, h5, h6');
  if (titleEl) titleEl.classList.add('cards-video-title');
  const dateEl = [...body.children].find((el) => el !== titleEl);
  if (dateEl) dateEl.classList.add('cards-video-date');

  if (url) {
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'cards-video-play';
    play.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
    play.innerHTML = PLAY_ICON;
    play.addEventListener('click', () => openModal(url, title, play));
    media.append(play);

    if (link && body.contains(link)) {
      link.addEventListener('click', (e) => {
        // Let modified clicks (new tab etc.) fall through to the raw URL.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openModal(url, title, link);
      });
    }
  }

  if (media.children.length) li.append(media);
  if (body.children.length || body.hasAttribute('data-aue-prop')) li.append(body);
  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    if (!row.textContent.trim() && !row.querySelector('img')
      && !row.hasAttribute('data-aue-resource')) return;
    ul.append(decorateCard(row));
  });
  block.replaceChildren(ul);
}
