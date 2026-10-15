/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: woolworthsgroup.com.au section breaks + Section Metadata.
 *
 * Generic (template-agnostic) section model, derived from the source layout containers:
 *   - the top-level hero (herobannercarousel, not inside a .colscontainer) is its own section
 *   - every top-level source `.colscontainer` (not nested in another one, outside the global
 *     header/footer/side-nav chrome) starts a new section
 *   - loose components outside any .colscontainer (e.g. the .media-template-body article copy)
 *     form their own section per run (a run also breaks where .media-template-body starts/ends)
 *   - a visible separator rule (`hr.hr-separator`) between content rows of a container splits
 *     it: the following part is a new section with the `divider` style (leading rules mark the
 *     container itself as `divider`; trailing rules are dropped). The importer strips all <hr>
 *     before transformers run, so rule positions are read from payload.html (see
 *     sourceRuleAnchors).
 *
 * Section Metadata `style` (comma separated) per section:
 *   ocean|snow|midnight|sky|tint-sky-5|tint-sky-10|tint-sky-20|tint-ocean-10  container--bg-*
 *   centered           first .heading wrapper has .center-text
 *   centered-text      every non-empty .text/.cmp-text paragraph / list item is centred
 *                      (inline text-align:center or a centre class on it or an ancestor)
 *   statement          span.h1 inside .text / .cmp-text (incl. .text.welcome-banner)
 *   divider            starts with a separator rule
 *   narrow             content sits in .media-template-body
 *   headings-midnight  all .heading wrappers carry .midnight
 *   headings-dark      no .heading wrapper carries a colour modifier (ocean|midnight|snow|sky|white)
 *
 * Fallback: when the page has no top-level .colscontainer and no .media-template-body, the
 * template's configured `sections` (page-templates.json) are used as before.
 *
 * Breaks (marker <hr>) are inserted in beforeTransform, while the source DOM is intact
 * (parsers replace elements between the hooks). In afterTransform, sections that ended up
 * empty are dropped and Section Metadata is added after each remaining marker.
 */
const MARK = 'data-wwg-section';
const STYLE = 'data-wwg-style';

const CHROME = 'header, footer, .cmp-experiencefragment--header, .cmp-experiencefragment--footer, '
  + 'sidenavigation, .side-nav-template__body__navigation, [data-component="sideNavigation"], '
  + 'secondarynavigation, .secondarynavigation, [data-component="secondaryNavigation"], '
  + '.stockprice, sharepriceticker, .share-ticker';
const HERO = 'herobannercarousel, .heroBannerCarousel';
const BG = ['ocean', 'snow', 'midnight', 'sky', 'tint-sky-5', 'tint-sky-10', 'tint-sky-20', 'tint-ocean-10'];
// Components that become blocks: their own text alignment does not describe default content.
const BLOCKISH = '.contenttile, .mastercard, .accordion, .heroStats, .ecosystem, .leadershipprofile, '
  + '.contactpanel, .historytimeline, .tabs, .linklist, .wwgvideo, herobannercarousel';
const CENTER_CLASS = /^(center|centered|center-text|text-center|text-align-center|align-center|center-align)$/;
const SEPARATOR = 'hr.hr-separator, .separator hr, hr.separator';

function isChrome(el) {
  return !!el.closest(CHROME);
}

function meaningful(el) {
  if (!el) return false;
  if (el.textContent.replace(/[\s ]+/g, '') !== '') return true;
  return !!el.querySelector('img, picture, video, iframe, table');
}

function before(a, b) {
  // eslint-disable-next-line no-bitwise
  return !!(a.compareDocumentPosition(b) & 4); // b follows a
}

function isCentered(p, stop) {
  let e = p;
  while (e && e !== stop) {
    const st = (e.getAttribute && e.getAttribute('style')) || '';
    if (/text-align\s*:\s*center/i.test(st)) return true;
    if (e.classList && [...e.classList].some((k) => CENTER_CLASS.test(k))) return true;
    e = e.parentElement;
  }
  return false;
}

/**
 * Style list for the part of `container` selected by `inPart(el)`.
 */
function partStyle(container, inPart, extra) {
  const styles = [];
  const bg = (container.className.match(/\bcontainer--bg-([a-z0-9-]+)\b/) || [])[1];
  if (bg && BG.includes(bg)) styles.push(bg);

  const headings = [...container.querySelectorAll('.heading')]
    .filter((h) => inPart(h) && meaningful(h));
  if (headings.length && headings[0].classList.contains('center-text')) styles.push('centered');

  const paras = [...container.querySelectorAll('.text p, .text li, .cmp-text p, .cmp-text li')]
    .filter((p) => inPart(p) && !p.closest(BLOCKISH) && p.textContent.replace(/[\s ]+/g, ''));
  if (paras.length && paras.every((p) => isCentered(p, container))) styles.push('centered-text');

  const statement = [...container.querySelectorAll('.text span.h1, .cmp-text span.h1')]
    .some((s) => inPart(s) && meaningful(s));
  if (statement) styles.push('statement');

  if (extra && extra.divider) styles.push('divider');
  if (container.closest('.media-template-body')) styles.push('narrow');

  if (headings.length && headings.every((h) => h.classList.contains('midnight'))) styles.push('headings-midnight');
  // Heading components without any colour modifier render dark (default text colour).
  const COLOUR = ['ocean', 'midnight', 'snow', 'sky', 'white'];
  if (headings.length && headings.every((h) => !COLOUR.some((c) => h.classList.contains(c)))) styles.push('headings-dark');
  return styles;
}

function marker(doc, style) {
  const hr = doc.createElement('hr');
  hr.setAttribute(MARK, '');
  if (style && style.length) hr.setAttribute(STYLE, style.join(', '));
  return hr;
}

// Top-level components outside any .colscontainer / hero (wrappers excluded).
function looseUnits(root, containers, heroes) {
  const all = [...root.querySelectorAll('.aem-Grid > *, .cmp-container > *')];
  const units = all.filter((el) => {
    if (el.matches('.aem-Grid, .container, .responsivegrid, .colscontainer, .experiencefragment, hr')) return false;
    if (el.closest('.colscontainer') || el.closest(HERO) || isChrome(el)) return false;
    if (el.querySelector('.colscontainer, herobannercarousel, .heroBannerCarousel')) return false;
    if (containers.some((c) => el.contains(c)) || heroes.some((h) => el.contains(h))) return false;
    return meaningful(el);
  });
  // Outermost only.
  return units.filter((el) => !units.some((o) => o !== el && o.contains(el)));
}

function topContainers(root) {
  return [...root.querySelectorAll('.colscontainer')]
    .filter((c) => !c.parentElement.closest('.colscontainer') && !isChrome(c));
}

function isRule(hr) {
  return !hr.closest('.heading, ' + BLOCKISH);
}

/**
 * The importer's preProcess strips every <hr> before transformers run, so separator rules are
 * located in the original markup (payload.html) and mapped onto the live DOM as "the element
 * that followed the rule": same top-level container (by order), same tag + class string, same
 * ordinal within the container. Returns Map(container -> [anchor elements]).
 */
function sourceRuleAnchors(html, liveContainers) {
  const map = new Map();
  if (!html || typeof html !== 'string' || !/hr-separator|class="separator/.test(html)) return map;
  if (typeof DOMParser === 'undefined') return map;
  let src;
  try {
    src = new DOMParser().parseFromString(html, 'text/html');
  } catch (e) {
    return map;
  }
  const srcContainers = topContainers(src.body || src.documentElement);
  if (srcContainers.length !== liveContainers.length) return map; // cannot map reliably
  srcContainers.forEach((sc, ci) => {
    const anchors = [];
    [...sc.querySelectorAll(SEPARATOR)].filter(isRule).forEach((hr) => {
      let next = hr.nextElementSibling;
      while (next && next.matches('hr, script, noscript, style, link')) next = next.nextElementSibling;
      if (!next) return; // trailing rule
      const cls = next.getAttribute('class') || '';
      const same = (root) => [...root.querySelectorAll(next.tagName)]
        .filter((e) => (e.getAttribute('class') || '') === cls);
      const k = same(sc).indexOf(next);
      const target = same(liveContainers[ci])[k];
      if (target && !anchors.includes(target)) anchors.push(target);
    });
    if (anchors.length) map.set(liveContainers[ci], anchors);
  });
  return map;
}

function genericBreaks(element, doc, html) {
  const containers = topContainers(element);
  const hasBody = !!element.querySelector('.media-template-body');
  if (!containers.length && !hasBody) return false;

  const heroes = [...element.querySelectorAll(HERO)]
    .filter((h) => !h.closest('.colscontainer') && !isChrome(h)
      && !(h.parentElement && h.parentElement.closest(HERO)));
  const loose = looseUnits(element, containers, heroes);
  const ruleAnchors = sourceRuleAnchors(html, containers);

  const units = [
    ...heroes.map((el) => ({ el, kind: 'hero' })),
    ...containers.map((el) => ({ el, kind: 'container' })),
    ...loose.map((el) => ({ el, kind: 'loose' })),
  ].sort((a, b) => (a.el === b.el ? 0 : (before(a.el, b.el) ? -1 : 1)));

  let prev = null;
  units.forEach((unit) => {
    const { el, kind } = unit;
    if (kind === 'hero') {
      el.before(marker(doc, []));
    } else if (kind === 'loose') {
      const narrow = !!el.closest('.media-template-body');
      const continues = prev && prev.kind === 'loose' && prev.narrow === narrow;
      unit.narrow = narrow;
      if (!continues) el.before(marker(doc, narrow ? ['narrow'] : []));
    } else {
      containerBreaks(el, doc, ruleAnchors.get(el) || []);
    }
    prev = unit;
  });
  return true;
}

function containerBreaks(container, doc, anchors) {
  // Separator rules: live <hr> elements (when still present) or anchors mapped from the
  // original markup (element that followed the rule). Heading underline rules are ignored.
  const rules = [
    ...[...container.querySelectorAll(SEPARATOR)].filter(isRule).map((node) => ({ node, hr: true })),
    ...anchors.map((node) => ({ node, hr: false })),
  ];
  const content = [...container.querySelectorAll('.heading, .text, .button, .image, .title, '
    + '.contenttile, .mastercard, .accordion, .heroStats, .ecosystem, .leadershipprofile, '
    + '.contactpanel, .historytimeline, .tabs, .linklist, .wwgvideo, .embed, .table, img, table, iframe, video')]
    .filter(meaningful);
  // el comes at/after the rule position
  const after = (r, el) => el === r.node || r.node.contains(el) || before(r.node, el);
  const hasBefore = (r) => content.some((c) => !after(r, c) && !c.contains(r.node));
  const hasAfter = (r) => content.some((c) => after(r, c) && !c.contains(r.node));

  const leading = rules.filter((r) => !hasBefore(r));
  const splits = rules.filter((r) => hasBefore(r) && hasAfter(r))
    .sort((a, b) => (before(a.node, b.node) ? -1 : 1));
  const trailing = rules.filter((r) => hasBefore(r) && !hasAfter(r));

  // part index of an element = number of split rules before it
  const partOf = (el) => splits.filter((r) => after(r, el)).length;

  const firstStyle = partStyle(container, (el) => partOf(el) === 0, { divider: leading.length > 0 });
  container.before(marker(doc, firstStyle));
  splits.forEach((r, i) => {
    const style = partStyle(container, (el) => partOf(el) === i + 1, { divider: true });
    if (r.hr) r.node.replaceWith(marker(doc, style));
    else r.node.before(marker(doc, style));
  });
  [...leading, ...trailing].forEach((r) => { if (r.hr) r.node.remove(); });
}

// Legacy: template-config driven breaks (payload.template.sections, first match wins).
function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    let el = null;
    try { el = root.querySelector(sel); } catch (e) { el = null; }
    if (el) return el;
  }
  return null;
}

function templateBreaks(element, doc, sections) {
  if (sections.length < 2) return;
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const section = sections[i];
    if (i === 0 && !section.style) continue;
    const sectionEl = querySection(element, section.selector);
    if (!sectionEl) continue; // never guess a replacement
    const style = section.style ? section.style.split(',').map((s) => s.trim()).filter(Boolean) : [];
    sectionEl.before(marker(doc, style));
  }
}

function isEmptyRange(doc, element, startAfter, endBefore) {
  const range = doc.createRange();
  if (startAfter) range.setStartAfter(startAfter);
  else range.setStart(element, 0);
  if (endBefore) range.setEndBefore(endBefore);
  else range.setEnd(element, element.childNodes.length);
  const frag = range.cloneContents();
  return !frag.textContent.replace(/[\s ]+/g, '')
    && !frag.querySelector('img, picture, table, iframe, video, svg');
}

export default function transform(hookName, element, payload) {
  const doc = element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    const template = (payload && payload.template) || {};
    const sections = Array.isArray(template.sections) ? template.sections : [];
    if (!genericBreaks(element, doc, payload && payload.html)) templateBreaks(element, doc, sections);
  }

  if (hookName === 'afterTransform') {
    // Markers swallowed into a block cell are not section breaks.
    element.querySelectorAll(`hr[${MARK}]`).forEach((hr) => {
      if (hr.closest('table')) hr.remove();
    });

    // Drop markers that would open an empty section. A leading empty section (page starts
    // with a break) keeps the first real section's style without a break.
    const markers = [...element.querySelectorAll(`hr[${MARK}]`)];
    const kept = [];
    let firstStyle = null;
    let leadingEmpty = isEmptyRange(doc, element, null, markers[0] || null);
    markers.forEach((hr, i) => {
      const next = markers[i + 1] || null;
      if (isEmptyRange(doc, element, hr, next)) {
        hr.remove();
        return;
      }
      if (leadingEmpty) {
        // first non-empty section becomes the page's first section: no leading break
        leadingEmpty = false;
        firstStyle = hr.getAttribute(STYLE);
        const anchor = doc.createElement('span');
        hr.replaceWith(anchor);
        kept.push({ anchor, style: firstStyle, placeholder: true });
        return;
      }
      kept.push({ anchor: hr, style: hr.getAttribute(STYLE) });
    });

    kept.forEach(({ anchor, style, placeholder }) => {
      if (style) {
        const metadataBlock = WebImporter.Blocks.createBlock(doc, {
          name: 'Section Metadata',
          cells: { style },
        });
        anchor.after(metadataBlock);
      }
      if (placeholder) anchor.remove();
      else {
        anchor.removeAttribute(MARK);
        anchor.removeAttribute(STYLE);
      }
    });
  }
}
