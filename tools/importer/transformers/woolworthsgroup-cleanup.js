/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: woolworthsgroup.com.au site-wide cleanup.
 *
 * Template-agnostic (news-article, story-article, listing-page, homepage,
 * content-page, investor-page, legal-page, leadership-profile).
 *
 * Selector provenance:
 *  - cleaned.html (news-article, big-w-lands-on-doordash):
 *      .cmp-experiencefragment--header > header.header, .video_modal#dynamic-video-wrap,
 *      .stockprice.top-ticker-container > sharepriceticker > .share-ticker,
 *      sidenavigation.side-nav-container inside .side-nav-template__body__navigation,
 *      .banner-wave (inside herobannercarousel), .cmp-experiencefragment--footer > footer.footer,
 *      .container__body__corner-graphic, iframe#destination_publishing_iframe_wfg_0 (Adobe ID sync)
 *  - metadata.json images.mapping: tracking pixels (*.omtrdc.net, *.demdex.net),
 *      loader gif (clientlib-vendor/resources/ajax-loader.gif)
 *  - visual-trees.json (other templates): div.container__body__divider-graphic(.ripple-*,
 *      .land-sun-line, .sky-sun, .berry-land-dark, .rotate-divider) brand divider graphics
 *  - Supplied by migration brief from source DOM of other templates:
 *      [data-component="sideNavigation"], img[class*="ripple-"]
 *
 * Note: no cookie/consent banner markup exists in any captured DOM for this site
 * (consent is handled via the cookies-statement page), so no vendor selectors are guessed.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

// Overlays / non-content widgets that could be picked up by block parsers.
const BEFORE_SELECTORS = [
  '.video_modal',
  '#dynamic-video-wrap',
  // Decorative ripple / wave / divider graphics (banner-wave sits inside the hero carousel)
  '.banner-wave',
  'img[class*="ripple-"]',
  '.container__body__divider-graphic',
  '.container__body__corner-graphic',
  // Loader gif
  'img[src*="ajax-loader"]',
];

// Global chrome and tracking removed after block parsing.
const AFTER_SELECTORS = [
  // Header (experience fragment) + nav + search
  '.cmp-experiencefragment--header',
  'header',
  // Share-price ticker
  '.stockprice.top-ticker-container',
  'sharepriceticker',
  '.share-ticker',
  // Side navigation
  '[data-component="sideNavigation"]',
  'sidenavigation',
  '.side-nav-template__body__navigation',
  '[data-component="secondaryNavigation"]',
  'secondarynavigation',
  '.secondarynavigation',
  // Salesforce Web-to-Lead form (partner-with-us): deferred — needs a form/embed decision
  'form[action*="salesforce.com"]',
  '.g-recaptcha',
  // Invisible placeholder copy (ocean text on an ocean band, e.g. lorem ipsum on 100 Years)
  '.colscontainer.container--bg-ocean .text.ocean',
  // Footer (experience fragment incl. acknowledgement of country + copyright)
  '.cmp-experiencefragment--footer',
  'footer',
  // Tracking / scripts
  'script',
  'noscript',
  'iframe',
  'link',
  'style',
  'img[src*="omtrdc.net"]',
  'img[src*="demdex.net"]',
];

const CTA_SKIP_CONTAINERS = '.contenttile, .mastercard, .accordion, .heroStats, .ecosystem, smallmediacard, '
  + '.leadershipprofile, .linklist, .policydocument, herobannercarousel, .wwgmodal, .tabs';

const SOURCE_ORIGIN = 'https://www.woolworthsgroup.com.au';
const SOURCE_HOSTS = ['www.woolworthsgroup.com.au', 'woolworthsgroup.com.au'];

function isEmptyParagraph(p) {
  if (p.querySelector('img, picture, a, br, iframe, video, table')) return false;
  return p.textContent.replace(/[\s ]+/g, '') === '';
}

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    WebImporter.DOMUtils.remove(element, BEFORE_SELECTORS);

    // Standalone CTA components become EDS buttons: filled -> <strong> (primary),
    // outlined/secondary -> <em> (secondary). CTAs inside cards/tiles/accordions are left to
    // their block parsers.
    const doc = element.ownerDocument;
    element.querySelectorAll('.button-container').forEach((cta) => {
      if (cta.closest(CTA_SKIP_CONTAINERS)) return;
      const a = cta.querySelector('a[href]');
      if (!a || /^javascript:/i.test(a.getAttribute('href')) || a.closest('strong, em')) return;
      a.textContent = a.textContent.replace(/\s+/g, ' ').trim();
      const secondary = /\b(cta-secondary|secondary|outline|btn-[a-z-]*outline)\b/.test(cta.className);
      const wrap = doc.createElement(secondary ? 'em' : 'strong');
      a.replaceWith(wrap);
      wrap.append(a);
    });

    // Heading components carry their visual level in a class (h2--semibold, h3, h3-secondary),
    // while the tag is often h1/h2 regardless; use the visual level.
    // The page title (first title-like heading, hero included) stays h1.
    const isProfile = payload && payload.template && payload.template.name === 'leadership-profile';
    const titleSel = isProfile ? 'h1' : 'herobannercarousel h1, herobannercarousel h2, .heroBannerV3 h1, .heroBannerV3 h2, h1';
    const pageTitle = element.querySelector(titleSel);
    element.querySelectorAll('.heading').forEach((wrapper) => {
      const m = wrapper.className.match(/\bh([1-6])(-secondary|--[a-z-]+)?\b/);
      const heading = wrapper.querySelector('h1, h2, h3, h4, h5, h6');
      if (!m || !heading || heading === pageTitle) return;
      let level = Number(m[1]) + (m[2] === '-secondary' ? 1 : 0);
      level = Math.min(Math.max(level, 2), 6); // h1 is reserved for the page title
      if (heading.tagName === `H${level}`) return;
      const h = doc.createElement(`h${level}`);
      h.append(...heading.childNodes);
      heading.replaceWith(h);
    });
  }

  if (hookName === H.after) {
    // Salesforce Web-to-Lead form (partner-with-us) is not migrated: leave a contact link instead.
    element.querySelectorAll('form[action*="salesforce.com"]').forEach((form) => {
      const doc = element.ownerDocument;
      const p = doc.createElement('p');
      const a = doc.createElement('a');
      a.href = '/au/en/contact-us';
      a.textContent = 'Contact us';
      p.append('To discuss a partnership or community request, please ', a, '.');
      form.before(p);
    });

    WebImporter.DOMUtils.remove(element, AFTER_SELECTORS);

    // Profile pages carry a zero-size hero banner (mislabelled "Board of Directors" even on
    // management profiles) and decorative heading icons — none of it is content.
    const templateName = payload && payload.template && payload.template.name;
    if (templateName === 'leadership-profile') {
      WebImporter.DOMUtils.remove(element, ['herobannercarousel', '.heroBannerCarousel', 'h1 svg', 'h2 svg', '.common-separator']);
    }

    // Drop empty "&nbsp;" spacer paragraphs inside AEM text components
    // (e.g. leading <p>&nbsp;</p> in .media-template-body .cmp-text).
    element.querySelectorAll('.cmp-text p').forEach((p) => {
      if (isEmptyParagraph(p)) p.remove();
    });

    // Remove HTML comments (analytics tag comments etc.).
    const doc = element.ownerDocument;
    const walker = doc.createTreeWalker(element, 128 /* NodeFilter.SHOW_COMMENT */);
    const comments = [];
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.remove());

    // ReadSpeaker "Listen" widget link (page chrome).
    element.querySelectorAll('a[href*="readspeaker.com"]').forEach((a) => {
      const p = a.closest('p');
      if (p && p.textContent.trim() === a.textContent.trim()) p.remove();
      else a.remove();
    });

    // One h1 per page: the source uses h1 for section headings too; keep the first, demote the rest.
    [...element.querySelectorAll('h1')].slice(1).forEach((h1) => {
      const h2 = element.ownerDocument.createElement('h2');
      [...h1.attributes].forEach((attr) => h2.setAttribute(attr.name, attr.value));
      h2.append(...h1.childNodes);
      h1.replaceWith(h2);
    });

    // Rewrite internal page links to the EDS IA (same paths, no .html; /au/en.html -> /).
    // DAM assets (PDFs, videos) stay on the source host, so make them absolute.
    element.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      let url;
      try {
        url = new URL(href, SOURCE_ORIGIN);
      } catch (e) {
        return;
      }
      if (!/^https?:$/.test(url.protocol) || !SOURCE_HOSTS.includes(url.hostname)) return;
      let path = url.pathname.replace(/^\/content\/wwg(?=\/au\/)/, '');
      if (path.startsWith('/content/dam/') || path.startsWith('/etc.clientlibs/')) {
        a.setAttribute('href', `${SOURCE_ORIGIN}${path}${url.search}`);
        return;
      }
      if (/\.html?$/.test(path)) {
        path = path.replace(/\.html?$/, '');
        if (path === '/au/en' || path === '/au') path = '/';
        // Same sanitisation the import script applies to document paths (lowercase etc.)
        else path = WebImporter.FileUtils.sanitizePath(path);
      }
      a.setAttribute('href', `${path}${url.search}${url.hash}`);
    });

    // Strip tracking / AEM data-layer attributes.
    element.querySelectorAll('[data-cmp-data-layer], [data-cmp-clickable], [onclick]').forEach((el) => {
      el.removeAttribute('data-cmp-data-layer');
      el.removeAttribute('data-cmp-clickable');
      el.removeAttribute('onclick');
    });
  }
}
