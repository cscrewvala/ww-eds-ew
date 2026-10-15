/* eslint-disable */
/* global WebImporter */
/**
 * Parser for embed-iframe. Base: embed.
 * Source: https://www.woolworthsgroup.com.au/au/en/investors/our-performance/share-price.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json): .tabs.panelcontainer:has(iframe)
 *
 * Source structure (validated against block-context/embed-iframe/source.html):
 *   .tabs.panelcontainer > .cmp-tabs
 *     ol.cmp-tabs__tablist > li.cmp-tabs__tab[aria-controls] (x n)   -> tab labels
 *     .cmp-tabs__tabpanel[id] (x n)                                  <- iterated (block-level div)
 *       ... .iframe .stock-price-external > iframe[src]              -> iframe URL
 *   Panels are paired with their tab via aria-controls / aria-labelledby, falling back to
 *   document order, then to the panel's data-layer dc:title.
 *   A tabs container without tabs (single iframe) still yields one row.
 *
 * Legal pages (block-context/embed-iframe/source-legal-inbenta.html, e.g. /privacy.html):
 *   .embed-iframe.embed > div > iframe[src][title][height]          -> single bare iframe, no tabs
 *   Label falls back to the iframe title; the iframe height attribute (if present) is kept
 *   as the optional 3rd cell. Height is only emitted for bare (tab-less) embeds so the
 *   tabbed share-price output stays unchanged.
 *
 * Block table (blocks/embed-iframe): one row per widget
 *   [tab label | <a href=iframe URL>iframe URL</a>]            (tabbed widgets)
 *   [iframe title | <a href=iframe URL>iframe URL</a> | height] (bare iframe, height optional)
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function absolute(src, document) {
  const s = (src || '').trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  try {
    return new URL(s, document.location?.href || 'https://www.woolworthsgroup.com.au/').href;
  } catch (e) {
    return s;
  }
}

function panelTitle(panel) {
  try {
    const layer = JSON.parse(panel.getAttribute('data-cmp-data-layer') || '{}');
    const first = Object.values(layer)[0];
    return clean(first && first['dc:title']);
  } catch (e) {
    return '';
  }
}

export default function parse(element, { document }) {
  const tabs = [...element.querySelectorAll('.cmp-tabs__tab, [role="tab"]')];
  let panels = [...element.querySelectorAll('.cmp-tabs__tabpanel')];
  if (!panels.length) panels = [...element.querySelectorAll('[role="tabpanel"]')];
  const bare = !panels.length && !tabs.length;
  if (!panels.length) panels = [element];

  const cells = [];
  panels.forEach((panel, i) => {
    const iframe = panel.querySelector('iframe[src], iframe[data-src]');
    const url = iframe ? absolute(iframe.getAttribute('src') || iframe.getAttribute('data-src'), document) : '';
    if (!url) return;

    const id = panel.getAttribute('id');
    const labelledBy = panel.getAttribute('aria-labelledby');
    const tab = (id && tabs.find((t) => t.getAttribute('aria-controls') === id))
      || (labelledBy && tabs.find((t) => t.id === labelledBy))
      || tabs[i];
    const label = clean(tab && tab.textContent) || panelTitle(panel) || clean(iframe.getAttribute('title'));

    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    const height = bare ? clean(iframe.getAttribute('height')).replace(/px$/i, '') : '';
    if (height && /^\d{2,5}$/.test(height)) cells.push([label || '', a, height]);
    else cells.push([label || '', a]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'embed-iframe', cells });
  element.replaceWith(block);
}
