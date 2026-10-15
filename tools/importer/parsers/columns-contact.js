/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-contact. Base: columns.
 * Source: https://www.woolworthsgroup.com.au/au/en/contact-us.html
 * Generated: 2026-10-14
 *
 * Instance (page-templates.json):
 *   .container__body__content:has(.contactpanel):not(:has(.mastercard, .heading)):not(.container__body__content *)
 *
 * Source structure (validated against block-context/columns-contact/source.html,
 * source-investors.html, source-our-newsroom.html):
 *   .container__body__content (three-column, or two-column with nested two-column rows)
 *     ... .contactpanel > contactpanel.contact-panel.{location|mailbox|phone|email}-card  <- iterated
 *       .contact-panel__body__icon svg                 -> dropped (no matching EDS icons in /icons)
 *       .contact-panel__body__content__title span      -> label paragraph
 *       .contact-panel__body__content__value children  -> value paragraphs:
 *           span.value (may wrap <p>)  -> text line
 *           a.link[href=tel:/mailto:]  -> link line (empty "mailto:" rebuilt from the address text,
 *                                         spaces stripped from tel: numbers)
 *
 * Block table (columns convention / blocks/columns-contact): one row, one cell per contact item
 *   [label p, value p... | label p, value p... | ...]
 *
 * Investor-contact variant (block-context/columns-contact/source-investor-contact.html;
 * instance .container__body__content.container__body__two-column:has(.contactpanel)):
 *   each column holds .heading (h1 > .heading-container__body__text__content) followed by
 *   panels, sometimes two heading groups per column ("Investor Relations", "Company Secretary").
 *   Output: for each heading group, <h3>heading</h3> as default content + one columns-contact
 *   block with that group's panels (block renders one item per cell, so headings cannot
 *   live inside the table). Bare URL values become links.
 *   Original instances exclude :has(.heading), so they keep the single-block output.
 */
const clean = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function para(text, document) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function valueLines(valueEl, document) {
  const out = [];
  [...valueEl.childNodes].forEach((node) => {
    if (node.nodeType === 3) {
      if (clean(node.textContent)) out.push(para(clean(node.textContent), document));
      return;
    }
    if (node.nodeType !== 1) return;
    const text = clean(node.textContent);
    if (!text) return;
    const a = node.tagName === 'A' ? node : node.querySelector('a[href]');
    if (a) {
      let href = (a.getAttribute('href') || '').trim();
      const aText = clean(a.textContent) || text;
      if (!href || /^mailto:\s*$/i.test(href)) href = aText.includes('@') ? `mailto:${aText}` : '';
      else if (/^tel:/i.test(href)) href = href.replace(/\s+/g, '');
      if (href) {
        const p = document.createElement('p');
        const link = document.createElement('a');
        link.href = href;
        link.textContent = aText;
        p.append(link);
        out.push(p);
        return;
      }
    }
    // span.value may wrap several <p>; keep each as its own line
    const inner = [...node.querySelectorAll('p')];
    if (inner.length) inner.forEach((p) => { if (clean(p.textContent)) out.push(para(clean(p.textContent), document)); });
    else if (/^https?:\/\/\S+$/i.test(text)) out.push(urlPara(text, document));
    else out.push(para(text, document));
  });
  return out;
}

// Bare URL value (investor-contact: "https://www.mpms.mufg.com/") -> link line.
function urlPara(url, document) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = url;
  a.textContent = url;
  p.append(a);
  return p;
}

function panelCell(panel, document) {
  const cell = [];
  const title = clean(panel.querySelector('.contact-panel__body__content__title')?.textContent);
  if (title) cell.push(para(title, document));
  panel.querySelectorAll('.contact-panel__body__content__value').forEach((v) => {
    cell.push(...valueLines(v, document));
  });
  return cell;
}

const PANEL_SEL = 'contactpanel, .contact-panel';
const HEADING_SEL = '.heading-container__body__text__content';

/**
 * Investor-contact layout: headings (".heading .cmp-title h1") interleaved with panels
 * inside the columns. Walk headings + panels in document order and split into groups:
 * each heading becomes default content (h3) followed by its own columns-contact block.
 */
function groupedOutput(element, document) {
  const nodes = [...element.querySelectorAll(`${HEADING_SEL}, ${PANEL_SEL}`)]
    .filter((n) => !n.matches(PANEL_SEL) || !n.parentElement.closest(PANEL_SEL));
  const groups = [];
  nodes.forEach((n) => {
    if (n.matches(HEADING_SEL)) {
      groups.push({ heading: clean(n.textContent), row: [] });
      return;
    }
    if (!groups.length) groups.push({ heading: '', row: [] });
    const cell = panelCell(n, document);
    if (cell.length) groups[groups.length - 1].row.push(cell);
  });
  const out = [];
  groups.forEach((g) => {
    if (g.heading) {
      const h3 = document.createElement('h3');
      h3.textContent = g.heading;
      out.push(h3);
    }
    if (g.row.length) {
      out.push(WebImporter.Blocks.createBlock(document, { name: 'columns-contact', cells: [g.row] }));
    }
  });
  return out;
}

export default function parse(element, { document }) {
  // Investor-contact variant: contact panels grouped under section headings.
  if (element.querySelector(HEADING_SEL) && element.querySelector(PANEL_SEL)) {
    const out = groupedOutput(element, document);
    if (out.some((n) => n.tagName === 'TABLE')) {
      // One wrapper node (html2md flattens plain divs) so the heading/block sequence
      // stays together and is captured as a single replacement.
      const block = document.createElement('div');
      block.append(...out);
      element.replaceWith(block);
      return;
    }
  }

  let panels = [...element.querySelectorAll(PANEL_SEL)];
  panels = panels.filter((p) => !p.parentElement.closest(PANEL_SEL));

  const row = [];
  panels.forEach((panel) => {
    const cell = panelCell(panel, document);
    if (cell.length) row.push(cell);
  });

  // Empty-block guard.
  if (!row.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [row];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-contact', cells });
  element.replaceWith(block);
}
