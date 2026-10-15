/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: woolworthsgroup.com.au section breaks + Section Metadata.
 *
 * Driven entirely by payload.template.sections (page-templates.json), so it is
 * template-agnostic: templates with 0-1 sections are a no-op.
 *
 * news-article selectors (verified in cleaned.html):
 *   section 1: herobannercarousel.heroBannerCarousel / section.hero-banner-carousel
 *   section 2: .media-template-body (div.container.responsivegrid.media-template-body)
 *
 * Breaks are inserted in beforeTransform (parsers replace section elements
 * between the hooks); Section Metadata is added in afterTransform, anchored to
 * a marker <hr>. Sections are processed in reverse order.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — first match wins.
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

export default function transform(hookName, element, payload) {
  const template = (payload && payload.template) || {};
  const sections = Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;
  const doc = element.ownerDocument || document;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no break, no metadata
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // never guess a replacement

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }

    // Drop section breaks that would open an empty section (e.g. a page that starts with a
    // styled band, or two section starts with only chrome between them).
    let boundary = null;
    [...element.querySelectorAll('hr')].forEach((hr) => {
      const range = doc.createRange();
      if (boundary) range.setStartAfter(boundary);
      else range.setStart(element, 0);
      range.setEndBefore(hr);
      const between = range.cloneContents();
      const empty = !between.textContent.trim()
        && !between.querySelector('img, picture, table, iframe, video, svg');
      if (empty) hr.remove();
      else boundary = hr;
    });
  }
}
