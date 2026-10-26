import { getMetadata, loadScript } from '../../scripts/aem.js';
import { createOptimizedPicture, moveInstrumentation } from '../../scripts/scripts.js';

/**
 * carousel-hero: full-bleed hero slides (image or background video, optional overlay text)
 * that rotate on a timer. Source: heroBannerCarousel (wwg/components/herobannercarousel).
 * Authored rows, one per slide (library carousel: image | text):
 *   - image: slide image; for video slides it is the poster.
 *   - text: heading + paragraphs / CTAs, overlaid bottom-left. A link to a video anywhere in
 *     the row makes it a video slide: Scene7 asset (https://<host>/is/content/<company>/<asset>,
 *     played with SmartCropVideoViewer like the source) or a direct .mp4/.webm file.
 * Page metadata `carousel-interval`: seconds between slides (default 6).
 * Variants: `gradient` (transparent-to-black scrim instead of the flat one), `no-overlay`,
 *   `hide-controls` (no pause/play button, as the source video hero; arrows/dots still show
 *   for several slides).
 */

const DEFAULT_INTERVAL = 6;
const S7_VIEWER = 'https://woolworthsgroup.scene7.com/s7viewers/html5/js/SmartCropVideoViewer.js';
const DIRECT_VIDEO = /\.(mp4|webm|ogg|m4v|mov)(\?|#|$)/i;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Universal Editor: slides do not rotate on their own while the page is being edited
const editing = () => document.documentElement.dataset.ue === 'true';

/** block -> { show, rowIndexes } for showSlide() */
const carousels = new WeakMap();

let viewerCount = 0;

/** Scene7 asset from an /is/content/ or /is/image/ URL: { origin, asset, company } */
function scene7Asset(href) {
  let url;
  try { url = new URL(href); } catch (e) { return null; }
  const m = url.pathname.match(/^\/is\/(?:content|image)\/((([^/]+)\/.+))$/);
  if (!m) return null;
  return { origin: url.origin, asset: m[1], company: m[3] };
}

function findVideoLink(row) {
  return [...row.querySelectorAll('a[href]')].find((a) => {
    const href = a.getAttribute('href') || '';
    return /^https?:\/\//i.test(href) && (/\/is\/content\//i.test(href) || DIRECT_VIDEO.test(href));
  }) || null;
}

// video starts this long after the page load event (the delayed phase); the poster shows until then
const VIDEO_DELAY = 3000;

/** waits for the delayed phase, so the video never competes with the poster (LCP) */
function afterLoad() {
  return new Promise((resolve) => {
    const later = () => setTimeout(resolve, VIDEO_DELAY);
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
  });
}

/** mounts the source's Scene7 SmartCropVideoViewer (muted, looping, no controls) */
async function mountScene7(container, s7, autoplay) {
  viewerCount += 1;
  container.id = `carousel-hero-video-${viewerCount}`;
  await afterLoad();
  await loadScript(S7_VIEWER);
  if (!window.s7viewers || !window.s7viewers.SmartCropVideoViewer) return;
  new window.s7viewers.SmartCropVideoViewer({
    containerId: container.id,
    params: {
      serverurl: `${s7.origin}/is/image/`,
      contenturl: `${s7.origin}/is/content/`,
      videoserverurl: `${s7.origin}/is/content/`,
      config: `${s7.company}/Video`,
      asset: s7.asset,
      autoplay: autoplay ? '1' : '0',
      mutevolume: '1',
      loop: '1',
      initialbitrate: '3000',
      singleclick: 'none',
    },
  }).init();
}

function mountDirectVideo(container, src, autoplay) {
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.preload = 'none';
  afterLoad().then(() => {
    video.src = src;
    if (autoplay) video.play().catch(() => {});
  });
  container.append(video);
}

function buildSlide(row, index, total, autoplayVideo) {
  const slide = document.createElement('div');
  slide.className = 'carousel-hero-slide';
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');
  slide.setAttribute('aria-label', `${index + 1} of ${total}`);
  // Universal Editor: the row (slide item) instrumentation moves to the slide
  moveInstrumentation(row, slide);

  const media = document.createElement('div');
  media.className = 'carousel-hero-media';
  const content = document.createElement('div');
  content.className = 'carousel-hero-content';

  const link = findVideoLink(row);
  const img = row.querySelector('picture img');
  if (img) {
    const picture = createOptimizedPicture(img.src, img.alt || '', index === 0, [
      { media: '(min-width: 900px)', width: '2000' },
      { width: '900' },
    ]);
    moveInstrumentation(img, picture.querySelector('img'));
    if (index === 0) {
      const first = picture.querySelector('img');
      first.setAttribute('loading', 'eager');
      first.setAttribute('fetchpriority', 'high');
    }
    media.append(picture);
  }

  if (link) {
    const href = link.getAttribute('href');
    const player = document.createElement('div');
    player.className = 'carousel-hero-video';
    // Universal Editor: the video link is not rendered; its field moves to the player
    moveInstrumentation(link, player);
    const s7 = DIRECT_VIDEO.test(href) ? null : scene7Asset(href);
    if (s7) {
      // the Scene7 poster is the asset itself on /is/image/
      if (!img) {
        media.append(createOptimizedPicture(`${s7.origin}/is/image/${s7.asset}`, '', index === 0));
      }
      mountScene7(player, s7, autoplayVideo && index === 0);
    } else {
      mountDirectVideo(player, link.href, autoplayVideo && index === 0);
    }
    media.append(player);
    slide.classList.add('has-video');
  }

  // overlay text: everything that is not the media
  [...row.querySelectorAll(':scope > div')].forEach((cell) => {
    // Universal Editor: the text cell's field moves to the content wrapper
    if (!cell.contains(img)) moveInstrumentation(cell, content);
    [...cell.children].forEach((child) => {
      if (child.tagName === 'PICTURE' || child === link) return;
      const linkOnly = link && child.contains(link)
        && child.textContent.trim() === link.textContent.trim();
      if (linkOnly) return;
      if (child.querySelector('picture') && !child.textContent.trim()) return;
      if (!child.textContent.trim()) return;
      content.append(child);
    });
  });

  if (!media.children.length) slide.classList.add('no-media');
  slide.append(media);
  if (content.children.length) {
    const inner = document.createElement('div');
    inner.className = 'carousel-hero-inner';
    inner.append(content);
    slide.append(inner);
  }
  return slide;
}

function slideVideo(slide) {
  return slide.querySelector('.carousel-hero-video video');
}

export default function decorate(block) {
  const allRows = [...block.querySelectorAll(':scope > div')];
  const rows = allRows
    .filter((row) => row.textContent.trim() || row.querySelector('picture, a[href]'));
  const rowIndexes = rows.map((row) => allRows.indexOf(row));
  const animate = !reducedMotion();
  const slides = rows.map((row, i) => buildSlide(row, i, rows.length, animate));

  const track = document.createElement('div');
  track.className = 'carousel-hero-slides';
  track.setAttribute('aria-live', 'off');
  track.append(...slides);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  const heading = block.querySelector('h1, h2');
  block.setAttribute('aria-label', heading ? heading.textContent.trim() : 'Hero');
  block.replaceChildren(track);
  if (!slides.length) return;

  const multi = slides.length > 1;
  const hasVideo = slides.some((s) => s.classList.contains('has-video'));
  block.classList.toggle('single', !multi);

  const seconds = parseFloat(getMetadata('carousel-interval'));
  const interval = (Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_INTERVAL) * 1000;

  let current = 0;
  let timer = null;
  let paused = !animate; // reduced motion: nothing moves until the user presses play
  let hovered = false;
  let focused = false;
  const dots = [];

  const controls = document.createElement('div');
  controls.className = 'carousel-hero-controls';

  function show(index, focus = false) {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      slide.inert = !active;
      const video = slideVideo(slide);
      if (video) {
        if (active && !paused) video.play().catch(() => {});
        else video.pause();
      }
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === current ? 'true' : 'false'));
    if (focus) dots[current]?.focus();
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    if (multi && !paused && !hovered && !focused && !editing()) {
      timer = setInterval(() => show(current + 1), interval);
    }
  }

  if (multi) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-hero-prev';
    prev.setAttribute('aria-label', 'Previous slide');
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-hero-next';
    next.setAttribute('aria-label', 'Next slide');
    prev.addEventListener('click', () => { show(current - 1); start(); });
    next.addEventListener('click', () => { show(current + 1); start(); });

    const nav = document.createElement('div');
    nav.className = 'carousel-hero-dots';
    slides.forEach((slide, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Show slide ${i + 1} of ${slides.length}`);
      dot.addEventListener('click', () => { show(i); start(); });
      dots.push(dot);
      nav.append(dot);
    });
    controls.append(prev, nav, next);

    // hovering or focusing the hero holds the current slide
    block.addEventListener('mouseenter', () => { hovered = true; stop(); });
    block.addEventListener('mouseleave', () => { hovered = false; start(); });
    block.addEventListener('focusin', () => { focused = true; stop(); });
    block.addEventListener('focusout', (e) => {
      if (block.contains(e.relatedTarget)) return;
      focused = false;
      start();
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  // anything that moves on its own gets a pause control (WCAG 2.2.2) unless the author hides it
  const showToggle = !block.classList.contains('hide-controls');
  if (showToggle && (multi || hasVideo)) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'carousel-hero-toggle';
    const label = () => {
      const what = multi ? 'slideshow' : 'video';
      toggle.setAttribute('aria-label', paused ? `Play ${what}` : `Pause ${what}`);
      toggle.classList.toggle('paused', paused);
    };
    toggle.addEventListener('click', () => {
      paused = !paused;
      label();
      show(current);
      start();
    });
    label();
    controls.append(toggle);

    // the Scene7 viewer creates its <video> late; sync it with the pause state once it appears
    if (hasVideo) {
      const pending = new Set(slides.filter((s) => s.classList.contains('has-video')));
      const observer = new MutationObserver(() => {
        pending.forEach((slide) => {
          if (!slideVideo(slide)) return;
          pending.delete(slide);
          show(current);
        });
        if (!pending.size) observer.disconnect();
      });
      observer.observe(track, { childList: true, subtree: true });
    }
  }

  if (controls.children.length) {
    block.append(controls);
    block.classList.add('has-controls');
  }
  carousels.set(block, { show, rowIndexes });
  show(0);
  start();
}

/**
 * Universal Editor: shows the slide authored in row `index` (e.g. when the author selects it).
 * @param {Element} block the carousel-hero block
 * @param {number} index authored row index (slide index when no empty rows were skipped)
 */
export function showSlide(block, index) {
  const carousel = carousels.get(block);
  if (!carousel) return;
  const position = carousel.rowIndexes.indexOf(Number(index));
  carousel.show(position >= 0 ? position : Number(index) || 0);
}
