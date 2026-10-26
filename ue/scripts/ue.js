/*
 * Universal Editor (Author Bus) editor-only behaviour.
 * Loaded by scripts/scripts.js only on *.ue.da.live (not awaited; scripts.js already sets the
 * editor flag document.documentElement.dataset.ue before the page decorates).
 * Based on https://github.com/aemsites/da-block-collection/blob/main/ue/scripts/ue.js
 */
import { openItem } from '../../blocks/accordion-program/accordion-program.js';
import { showSlide } from '../../blocks/carousel-hero/carousel-hero.js';
import { showTab } from '../../blocks/embed-iframe/embed-iframe.js';

/** the closest instrumented block of an element (the element itself may be the block) */
function blockOf(element) {
  return element.closest('.block[data-aue-resource]')
    || element.parentElement?.closest('.block[data-aue-resource]');
}

const setupUEEventHandlers = () => {
  // image swapped in the properties panel: drop the optimized <source>/srcset renditions so the
  // new image shows (the panel only updates the <img src>)
  document.body.addEventListener('aue:content-patch', ({ detail: { patch, request } }) => {
    let element = document.querySelector(`[data-aue-resource="${request.target.resource}"]`);
    if (element && element.getAttribute('data-aue-prop') !== patch.name) {
      element = element.querySelector(`[data-aue-prop='${patch.name}']`);
    }
    if (element?.getAttribute('data-aue-type') !== 'media') return;
    const picture = element.tagName === 'IMG' ? element.closest('picture') : element;
    picture?.querySelectorAll('source').forEach((source) => source.remove());
    picture?.querySelector('img')?.removeAttribute('srcset');
  });

  // reveal what the author selects in the content tree
  document.body.addEventListener('aue:ui-select', ({ detail }) => {
    const resource = detail?.resource;
    if (!resource) return;
    const element = document.querySelector(`[data-aue-resource="${resource}"]`);
    if (!element) return;
    const block = blockOf(element);
    if (!block) return;

    if (block.classList.contains('accordion-program')) {
      openItem(block, element);
    } else if (block.classList.contains('carousel-hero')) {
      const slide = element.closest('.carousel-hero-slide');
      const slides = [...block.querySelectorAll('.carousel-hero-slide')];
      if (slide) showSlide(block, slides.indexOf(slide));
    } else if (block.classList.contains('embed-iframe')) {
      showTab(block, element);
    } else {
      // content inside a closed <dialog> (e.g. cards-logo detail panels): open it
      const dialog = element.closest('dialog');
      if (dialog && !dialog.open && typeof dialog.show === 'function') dialog.show();
    }
  });
};

/**
 * The editor's connection library (cors.js) is added to the page by the ue.da.live backend. If that
 * copy was blocked (the site CSP only trusts nonce'd scripts: 'strict-dynamic') or failed, load it
 * from here: scripts created by a trusted script are allowed. Without it the editor shows
 * "Couldn't connect to the page".
 */
const CORS_JS = 'https://universal-editor-service.adobe.io/cors.js';
function ensureEditorConnection() {
  const load = () => {
    if (window.UniversalEditorEmbedded) return;
    const script = document.createElement('script');
    script.src = CORS_JS;
    script.async = true;
    script.dataset.ueFallback = 'true';
    document.head.append(script);
  };
  if (document.readyState === 'complete') load();
  else window.addEventListener('load', load, { once: true });
}

export default () => {
  ensureEditorConnection();
  // editor mode (also set by scripts.js before decoration): e.g. carousel-hero does not rotate
  document.documentElement.dataset.ue = 'true';
  setupUEEventHandlers();
};
