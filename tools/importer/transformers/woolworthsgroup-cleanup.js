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

    // Mark source data tables; any still loose after parsing become table-data blocks
    // (an unconverted <table> is otherwise read as a block named after its first cell).
    element.querySelectorAll('table').forEach((t) => t.setAttribute('data-source-table', ''));

    // Standalone CTA components become EDS buttons: filled -> <strong> (primary),
    // outlined/secondary -> <em> (secondary). CTAs inside cards/tiles/accordions are left to
    // their block parsers.
    // Midnight-filled CTAs (btn-midnight / primary-midnight) -> <strong><em> (accent).
    // A container can hold a row of buttons (newsroom category filters): wrap every link.
    const doc = element.ownerDocument;
    element.querySelectorAll('.button-container').forEach((cta) => {
      if (cta.closest(CTA_SKIP_CONTAINERS)) return;
      const secondary = /\b(cta-secondary|secondary|outline|btn-[a-z-]*outline)\b/.test(cta.className);
      const accent = !secondary && /\b(btn-midnight|primary-midnight|cta-midnight)\b/.test(cta.className);
      cta.querySelectorAll('a[href]').forEach((a) => {
        if (/^javascript:/i.test(a.getAttribute('href')) || a.closest('strong, em')) return;
        if (a.parentElement.closest('a[href]')) return;
        a.textContent = a.textContent.replace(/\s+/g, ' ').trim();
        if (!a.textContent) return;
        const wrap = doc.createElement(secondary ? 'em' : 'strong');
        a.replaceWith(wrap);
        if (accent) {
          const em = doc.createElement('em');
          em.append(a);
          wrap.append(em);
        } else {
          wrap.append(a);
        }
      });
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

    // Rich-text headings carrying a visual class on their only child (h4 > span.h5) take
    // that visual level; `p > span.h5` (sole content, leading <br> ignored) is a sub-heading.
    const onlySpan = (el) => {
      const kids = [...el.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim())
        && !(n.nodeName === 'BR'));
      const span = kids.length === 1 && kids[0].nodeName === 'SPAN' ? kids[0] : null;
      return span && span.textContent.trim() ? span : null;
    };
    element.querySelectorAll('.cmp-text h1, .cmp-text h2, .cmp-text h3, .cmp-text h4, .cmp-text h5, .cmp-text h6')
      .forEach((heading) => {
        if (heading === pageTitle) return;
        const span = onlySpan(heading);
        const m = span && span.className.match(/\bh([1-6])\b/);
        if (!m) return;
        const level = Math.min(Math.max(Number(m[1]), 2), 6);
        if (heading.tagName === `H${level}`) return;
        const h = doc.createElement(`h${level}`);
        h.textContent = span.textContent.replace(/\s+/g, ' ').trim();
        heading.replaceWith(h);
      });
    // A leading `span.h5` followed by more text in the same paragraph is an inline lead-in
    // label ("<span class="h5">The opportunity:</span> For decades…") -> <strong>.
    const leadingSpan = (el) => {
      const kids = [...el.childNodes].filter((n) => !(n.nodeType === 3 && !n.textContent.trim())
        && !(n.nodeName === 'BR'));
      const span = kids.length > 1 && kids[0].nodeName === 'SPAN' ? kids[0] : null;
      return span && span.textContent.trim() && !span.querySelector('img, picture, a') ? span : null;
    };
    element.querySelectorAll('.cmp-text p').forEach((p) => {
      const span = onlySpan(p);
      if (!span) {
        const lead = leadingSpan(p);
        if (!lead || !lead.classList.contains('h5')) return;
        const strong = doc.createElement('strong');
        strong.textContent = lead.textContent.replace(/\s+/g, ' ').trim();
        lead.replaceWith(strong);
        // keep a word space between the label and the following text
        const next = strong.nextSibling;
        if (next && next.nodeType === 3 && !/^\s/.test(next.textContent)) strong.after(doc.createTextNode(' '));
        return;
      }
      if (!span.classList.contains('h5')) return;
      const h5 = doc.createElement('h5');
      h5.textContent = span.textContent.replace(/\s+/g, ' ').trim();
      p.replaceWith(h5);
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

    // Loose source tables (not consumed by a block parser, not nested in a block) -> table-data
    element.querySelectorAll('table[data-source-table]').forEach((table) => {
      if (table.parentElement && table.parentElement.closest('table')) {
        table.removeAttribute('data-source-table');
        return;
      }
      const cells = [...table.rows].map((row) => [...row.cells].map((cell) => {
        const div = element.ownerDocument.createElement('div');
        div.append(...cell.childNodes);
        return div;
      })).filter((row) => row.length);
      if (!cells.length) { table.remove(); return; }
      table.replaceWith(WebImporter.Blocks.createBlock(element.ownerDocument, { name: 'table-data', cells }));
    });
    element.querySelectorAll('[data-source-table]').forEach((t) => t.removeAttribute('data-source-table'));

    // Profile pages carry a zero-size hero banner (mislabelled "Board of Directors" even on
    // management profiles) and decorative heading icons — none of it is content.
    const templateName = payload && payload.template && payload.template.name;
    if (templateName === 'leadership-profile') {
      WebImporter.DOMUtils.remove(element, ['herobannercarousel', '.heroBannerCarousel', 'h1 svg', 'h2 svg', '.common-separator']);
    }

    // Drop empty "&nbsp;" spacer paragraphs inside AEM text components
    // (e.g. leading <p>&nbsp;</p> in .media-template-body .cmp-text) and empty spacer
    // headings (<h3>&nbsp;</h3> before "Related Stories" on stories-page-template pages).
    element.querySelectorAll('.cmp-text p, .cmp-text h1, .cmp-text h2, .cmp-text h3, .cmp-text h4, .cmp-text h5, .cmp-text h6').forEach((p) => {
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
      // Story category tags link to the home page with ?articleFilter=<tag> (the source's
      // filtered story feed); the EDS equivalent is the Our Stories listing, whose
      // article-list block reads the active tag from ?tag=.
      const articleFilter = url.searchParams.get('articleFilter');
      if (articleFilter && /^\/(au\/en(\.html?)?\/?)?$/.test(path)) {
        a.setAttribute('href', `/au/en/our-impact/sustainability/our-stories?tag=${encodeURIComponent(articleFilter)}`);
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
