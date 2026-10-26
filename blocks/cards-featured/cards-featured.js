import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * cards-featured: curated featured stories. The first card renders large (image on top),
 * the remaining cards stack beside it as horizontal tiles (thumbnail left, text right).
 * Each authored row is one card:
 *   cell 1: image (optionally plus a link to a video for the first/featured card)
 *   cell 2: tag labels paragraph (e.g. "100 Years, People"), title (heading), "Learn more" link
 * Cells may be omitted or merged; image vs body content is detected by content.
 * A video link (Scene7 / DAM / direct video file) turns the card image into a play trigger
 * that opens a modal player on click. Nothing video-related loads until the click.
 * @param {Element} block
 */

const DIRECT_VIDEO = /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i;

function isImageUrl(href) {
  return /\/is\/image\//i.test(href) || /\.(jpe?g|png|webp|gif|avif|svg)(\?|#|$)/i.test(href);
}

function isVideoLink(a) {
  const href = a.getAttribute('href') || '';
  return /^(https?:)?\/\//i.test(href) && !isImageUrl(href)
    && (/s7viewers|\/is\/content\/|youtube\.com|youtu\.be|vimeo\.com/i.test(href)
      || DIRECT_VIDEO.test(href));
}

function buildPlayer(url, title) {
  if (DIRECT_VIDEO.test(url) || /\/is\/content\//i.test(url)) {
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.autoplay = true; // starts only after the user clicked play
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
  dialog.className = 'cards-featured-dialog';
  dialog.setAttribute('aria-label', title || 'Video');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'cards-featured-close';
  close.setAttribute('aria-label', 'Close video');
  close.textContent = '×';

  const frame = document.createElement('div');
  frame.className = 'cards-featured-player';
  frame.append(buildPlayer(url, title));

  dialog.append(close, frame);
  document.body.append(dialog);

  const teardown = () => {
    dialog.remove();
    trigger.focus();
  };
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', teardown);
  dialog.showModal();
}

function buildCard(row) {
  const li = document.createElement('li');
  moveInstrumentation(row, li);
  const imageWrap = document.createElement('div');
  imageWrap.className = 'cards-featured-card-image';
  const body = document.createElement('div');
  body.className = 'cards-featured-card-body';

  // Pull out a video link before distributing content, so it never renders as text.
  const videoLink = [...row.querySelectorAll('a[href]')].find(isVideoLink);
  let videoUrl = null;
  if (videoLink) {
    videoUrl = videoLink.href;
    const holder = videoLink.closest('p');
    if (holder && holder.textContent.trim() === videoLink.textContent.trim()
      && !holder.querySelector('picture')) {
      holder.remove();
    } else {
      videoLink.remove();
    }
  }

  [...row.children].forEach((cell) => {
    const pic = cell.querySelector('picture');
    if (pic && !imageWrap.children.length) {
      const holder = pic.closest('p');
      imageWrap.append(pic);
      if (holder && !holder.textContent.trim() && !holder.querySelector('picture')) holder.remove();
    }
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
      if (child.tagName === 'PICTURE') return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      body.append(child);
    });
  });

  const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.classList.add('cards-featured-title');
    // Paragraphs above the title are tag labels: "100 Years, People" -> one pill per tag.
    const tagParas = [];
    let prev = heading.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'P' && !prev.querySelector('a[href]')) tagParas.unshift(prev);
      prev = prev.previousElementSibling;
    }
    const labels = tagParas.flatMap((p) => p.textContent.split(',').map((t) => t.trim()))
      .filter(Boolean);
    if (tagParas.length) {
      const tags = document.createElement('div');
      tags.className = 'cards-featured-tags';
      labels.forEach((label) => {
        const pill = document.createElement('span');
        pill.textContent = label;
        tags.append(pill);
      });
      tagParas[0].replaceWith(tags);
      tagParas.slice(1).forEach((p) => p.remove());
    }
  }
  const links = [...body.querySelectorAll('a[href]')];
  const cta = links[links.length - 1];
  const ctaHolder = cta && cta.closest('p');
  if (ctaHolder) ctaHolder.classList.add('cards-featured-cta');
  // Body paragraphs after the title (other than the CTA) are the description.
  let seenTitle = !heading;
  [...body.children].forEach((child) => {
    if (child === heading) seenTitle = true;
    else if (seenTitle && child.tagName === 'P' && !child.classList.contains('cards-featured-cta')) {
      child.classList.add('cards-featured-description');
    }
  });

  // The whole card is clickable on the source: link the title and stretch it over the card.
  // The visible "Learn more" stays clickable but is skipped in tab order (same destination).
  if (heading && cta && !heading.querySelector('a[href]')) {
    const titleLink = document.createElement('a');
    titleLink.href = cta.getAttribute('href');
    titleLink.className = 'cards-featured-title-link';
    titleLink.append(...heading.childNodes);
    heading.append(titleLink);
    cta.tabIndex = -1;
  }

  if (videoUrl && imageWrap.children.length) {
    li.classList.add('cards-featured-video');
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'cards-featured-play';
    const title = heading ? heading.textContent.trim() : '';
    play.setAttribute('aria-label', title ? `Play video: ${title}` : 'Play video');
    // Source play glyph (71x71, white 92% ring + triangle).
    play.innerHTML = '<svg width="71" height="71" viewBox="0 0 71 71" fill="none" aria-hidden="true" focusable="false">'
      + '<path d="M49.63 33.9c.77-.47.77-1.58 0-2.05L27.85 18.5c-.8-.5-1.83.08-1.83 1.02v26.71c0 .94 1.03 1.52 1.83 1.03L49.63 33.9Z" fill="#fff" fill-opacity=".92"/>'
      + '<path fill-rule="evenodd" clip-rule="evenodd" d="M34.75 58.02a25.29 25.29 0 1 0 0-50.58 25.29 25.29 0 0 0 0 50.58Zm0 2.7a28 28 0 1 0 0-56 28 28 0 0 0 0 56Z" fill="#fff" fill-opacity=".92"/>'
      + '</svg>';
    play.addEventListener('click', () => openModal(videoUrl, title, play));
    imageWrap.append(play);
  }

  if (imageWrap.children.length) li.append(imageWrap);
  if (body.children.length || body.hasAttribute('data-aue-prop')) li.append(body);
  return li;
}

export default function decorate(block) {
  const rows = [...block.children]
    .filter((row) => row.textContent.trim() || row.querySelector('picture')
      || row.hasAttribute('data-aue-resource'));

  const featured = document.createElement('div');
  featured.className = 'cards-featured-lead';
  const leadList = document.createElement('ul');
  featured.append(leadList);

  const list = document.createElement('ul');
  list.className = 'cards-featured-list';

  rows.forEach((row, i) => {
    const card = buildCard(row);
    if (i === 0) leadList.append(card);
    else list.append(card);
  });

  // Pictures now live in the new lists (moved out of the authored rows); optimize them there.
  [[leadList, '900'], [list, '500']].forEach(([ul, width]) => {
    ul.querySelectorAll('picture > img').forEach((img) => {
      // Scene7 pads (letterboxes) renditions wider than the master; fit=constrain prevents it.
      let { src } = img;
      if (/\/is\/image\//.test(src) && !/[?&]fit=/.test(src)) {
        src += `${src.includes('?') ? '&' : '?'}fit=constrain`;
      }
      const picture = createOptimizedPicture(src, img.alt, false, [{ width }]);
      moveInstrumentation(img, picture.querySelector('img'));
      img.closest('picture').replaceWith(picture);
    });
  });

  if (!list.children.length) block.classList.add('no-list');
  block.replaceChildren(featured, ...(list.children.length ? [list] : []));
}
